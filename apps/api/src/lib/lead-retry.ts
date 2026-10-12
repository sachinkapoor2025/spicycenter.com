import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  customerKeys,
  leadHasRetryableNotifyPayload,
  leadNotifyStamp,
  retryLeadEmailSchema,
  type LeadCaptureInput,
  type LeadNotifyStamp,
} from "@spicycorner/shared";
import { requireAdmin } from "./auth";
import { CUSTOMERS_TABLE, docClient, now } from "./db";
import { notifyAdminLead, type EmailSendResult } from "./email";
import { stampLeadNotification } from "./lead-persist";
import { badRequest, forbidden, json, ok } from "./response";

export const LEAD_RETRY_LOCK_MS = 60_000;

export type StoredLeadItem = LeadCaptureInput & {
  leadId?: string;
  createdAt?: string;
  notifyEmailStatus?: string;
  notifyEmailAt?: string;
  notifyEmailError?: string;
  notifyEmailRetryLockAt?: string;
  PK?: string;
  SK?: string;
};

export type LeadRetryResult =
  | { result: "sent"; leadId: string; stamp: LeadNotifyStamp }
  | { result: "failed"; leadId: string; stamp: LeadNotifyStamp; error: string }
  | { result: "not_found" }
  | { result: "already_sent"; leadId?: string }
  | { result: "not_applicable"; reason: string }
  | { result: "retry_in_progress" };

export type LeadRetryDeps = {
  getLead: (sessionId: string, createdAt: string) => Promise<StoredLeadItem | undefined>;
  claimLock: (sessionId: string, createdAt: string, lockedAt: string, staleBefore: string) => Promise<boolean>;
  notify: (lead: LeadCaptureInput, refs: { leadId: string; createdAt: string }) => Promise<EmailSendResult>;
  stamp: (key: { PK: string; SK: string }, stamp: LeadNotifyStamp) => Promise<void>;
  nowIso?: () => string;
};

export function leadDynamoKey(sessionId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: customerKeys.pk(sessionId),
    SK: customerKeys.leadSk(createdAt),
  };
}

export function retryLockIsActive(lockAt: string | undefined, nowIso: string, ttlMs = LEAD_RETRY_LOCK_MS): boolean {
  if (!lockAt) return false;
  const locked = Date.parse(lockAt);
  const current = Date.parse(nowIso);
  if (!Number.isFinite(locked) || !Number.isFinite(current)) return false;
  return current - locked < ttlMs;
}

export function evaluateLeadRetry(item: StoredLeadItem | undefined, nowIso: string): LeadRetryResult | { result: "ready"; item: StoredLeadItem } {
  if (!item) return { result: "not_found" };
  if (item.notifyEmailStatus === "sent") {
    return { result: "already_sent", leadId: item.leadId };
  }
  if (retryLockIsActive(item.notifyEmailRetryLockAt, nowIso)) {
    return { result: "retry_in_progress" };
  }
  if (!leadHasRetryableNotifyPayload(item)) {
    return { result: "not_applicable", reason: "This lead has no notification payload to retry." };
  }
  return { result: "ready", item };
}

function asCaptureInput(item: StoredLeadItem): LeadCaptureInput {
  return {
    sessionId: item.sessionId,
    userId: item.userId,
    name: item.name,
    email: item.email,
    phone: item.phone,
    page: item.page,
    productSlug: item.productSlug,
    source: item.source ?? "browse",
    metadata: item.metadata,
  };
}

export async function retryLeadNotification(
  input: { sessionId: string; createdAt: string },
  deps: LeadRetryDeps
): Promise<LeadRetryResult> {
  const nowIso = deps.nowIso?.() ?? now();
  const existing = await deps.getLead(input.sessionId, input.createdAt);
  const gate = evaluateLeadRetry(existing, nowIso);
  if (gate.result !== "ready") return gate;

  const staleBefore = new Date(Date.parse(nowIso) - LEAD_RETRY_LOCK_MS).toISOString();
  let claimed: boolean;
  try {
    claimed = await deps.claimLock(input.sessionId, input.createdAt, nowIso, staleBefore);
  } catch (err) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
      const again = await deps.getLead(input.sessionId, input.createdAt);
      if (again?.notifyEmailStatus === "sent") {
        return { result: "already_sent", leadId: again.leadId };
      }
      return { result: "retry_in_progress" };
    }
    throw err;
  }
  if (!claimed) {
    const again = await deps.getLead(input.sessionId, input.createdAt);
    if (again?.notifyEmailStatus === "sent") {
      return { result: "already_sent", leadId: again.leadId };
    }
    return { result: "retry_in_progress" };
  }

  const leadId = gate.item.leadId ?? "";
  let emailResult: EmailSendResult;
  try {
    emailResult = await deps.notify(asCaptureInput(gate.item), {
      leadId,
      createdAt: gate.item.createdAt ?? input.createdAt,
    });
  } catch (err) {
    emailResult = {
      ok: false,
      error: err instanceof Error ? err.message : "Notification failed",
    };
  }

  const stamp = leadNotifyStamp(emailResult, nowIso);
  await deps.stamp(leadDynamoKey(input.sessionId, input.createdAt), stamp);

  if (stamp.notifyEmailStatus === "sent") {
    return { result: "sent", leadId, stamp };
  }
  console.error("Lead notify retry failed", {
    leadId,
    sessionId: input.sessionId,
    createdAt: input.createdAt,
    status: stamp.notifyEmailStatus,
    error: stamp.notifyEmailError,
  });
  return {
    result: "failed",
    leadId,
    stamp,
    error: stamp.notifyEmailError ?? "Notification could not be sent.",
  };
}

export async function getStoredLead(sessionId: string, createdAt: string): Promise<StoredLeadItem | undefined> {
  const key = leadDynamoKey(sessionId, createdAt);
  const existing = await docClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: key,
    })
  );
  return existing.Item as StoredLeadItem | undefined;
}

export async function claimLeadRetryLock(
  sessionId: string,
  createdAt: string,
  lockedAt: string,
  staleBefore: string
): Promise<boolean> {
  const key = leadDynamoKey(sessionId, createdAt);
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: CUSTOMERS_TABLE,
        Key: key,
        ConditionExpression:
          "attribute_exists(PK) AND (attribute_not_exists(notifyEmailStatus) OR notifyEmailStatus <> :sent) AND (attribute_not_exists(notifyEmailRetryLockAt) OR notifyEmailRetryLockAt < :stale)",
        UpdateExpression: "SET notifyEmailRetryLockAt = :lock, updatedAt = :lock",
        ExpressionAttributeValues: {
          ":sent": "sent",
          ":stale": staleBefore,
          ":lock": lockedAt,
        },
      })
    );
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

const defaultRetryDeps: LeadRetryDeps = {
  getLead: getStoredLead,
  claimLock: claimLeadRetryLock,
  notify: notifyAdminLead,
  stamp: stampLeadNotification,
};

function retryHttp(result: LeadRetryResult) {
  if (result.result === "not_found") {
    return json(404, { ok: false, result: "not_found", error: "Lead not found" });
  }
  if (result.result === "already_sent") {
    return json(409, {
      ok: false,
      result: "already_sent",
      leadId: result.leadId,
      error: "Notification was already sent for this lead.",
    });
  }
  if (result.result === "not_applicable") {
    return json(409, { ok: false, result: "not_applicable", error: result.reason });
  }
  if (result.result === "retry_in_progress") {
    return json(409, {
      ok: false,
      result: "retry_in_progress",
      error: "A notification retry is already in progress.",
    });
  }
  if (result.result === "failed") {
    return ok({
      ok: false,
      result: "failed",
      leadId: result.leadId,
      notifyEmailStatus: result.stamp.notifyEmailStatus,
      notifyEmailAt: result.stamp.notifyEmailAt,
      error: result.error,
    });
  }
  return ok({
    ok: true,
    result: "sent",
    leadId: result.leadId,
    notifyEmailStatus: result.stamp.notifyEmailStatus,
    notifyEmailAt: result.stamp.notifyEmailAt,
  });
}

export async function retryLeadEmail(
  event: APIGatewayProxyEventV2,
  deps: LeadRetryDeps = defaultRetryDeps
) {
  if (!requireAdmin(event)) return forbidden();
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Invalid JSON");
  }
  const parsed = retryLeadEmailSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  return retryHttp(await retryLeadNotification(parsed.data, deps));
}
