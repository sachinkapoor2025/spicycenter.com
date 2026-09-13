/**
 * Marketing bounce suppression helpers.
 * Keeps hard bounces / complaints on SUPPRESS# so import + send skip them.
 * Transactional SMTP (order@) is never used here.
 */

import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { sesEmailKeys } from "@spicycorner/shared";
import { docClient, now } from "./db";

const TABLE =
  process.env.EMAIL_CAMPAIGNS_TABLE ?? `spicycorner-email-campaigns-${process.env.ENVIRONMENT ?? "dev"}`;

const HARD_BOUNCE_RE =
  /\b(550|551|552|553|5\.1\.1|5\.1\.2|5\.4\.1|user unknown|mailbox unavailable|does not exist|invalid recipient|recipient rejected|address rejected|no such user|undeliverable)\b/i;

export function looksLikeHardBounce(errorMessage: string): boolean {
  return HARD_BOUNCE_RE.test(errorMessage);
}

export async function getSuppression(email: string): Promise<{
  email: string;
  reason: string;
  createdAt?: string;
} | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.suppressPk(normalized), SK: sesEmailKeys.suppressSk() },
    })
  );
  if (!res.Item) return null;
  return {
    email: normalized,
    reason: String(res.Item.reason ?? "manual"),
    createdAt: res.Item.createdAt ? String(res.Item.createdAt) : undefined,
  };
}

export async function isSuppressedEmail(email: string): Promise<boolean> {
  return Boolean(await getSuppression(email));
}

/** Idempotent upsert onto SUPPRESS# (import/send already skip these). */
export async function upsertSuppression(input: {
  email: string;
  reason: "hard_bounce" | "complaint" | "unsubscribe" | "manual";
  source?: string;
  detail?: string;
}): Promise<{ email: string; created: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { email, created: false };
  }
  const existing = await getSuppression(email);
  if (existing) {
    return { email, created: false };
  }
  const ts = now();
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          PK: sesEmailKeys.suppressPk(email),
          SK: sesEmailKeys.suppressSk(),
          GSI1PK: sesEmailKeys.entitySuppressPk(),
          GSI1SK: ts,
          email,
          reason: input.reason,
          ...(input.source ? { source: input.source } : {}),
          ...(input.detail ? { detail: input.detail.slice(0, 500) } : {}),
          createdAt: ts,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
    return { email, created: true };
  } catch (err: unknown) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    if (name === "ConditionalCheckFailedException") {
      return { email, created: false };
    }
    throw err;
  }
}

export async function updateRecipientStatus(
  campaignId: string,
  email: string,
  patch: {
    status: string;
    sentAt?: string;
    deliveredAt?: string;
    openedAt?: string;
    clickedAt?: string;
    bouncedAt?: string;
    failedAt?: string;
    lastError?: string;
  }
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const names: string[] = ["#st"];
  const values: Record<string, unknown> = { ":st": patch.status, ":u": now() };
  let expr = "SET #st = :st, updatedAt = :u";

  const optional: Array<[keyof typeof patch, string]> = [
    ["sentAt", "sentAt"],
    ["deliveredAt", "deliveredAt"],
    ["openedAt", "openedAt"],
    ["clickedAt", "clickedAt"],
    ["bouncedAt", "bouncedAt"],
    ["failedAt", "failedAt"],
    ["lastError", "lastError"],
  ];
  for (const [key, attr] of optional) {
    const val = patch[key];
    if (val === undefined) continue;
    expr += `, ${attr} = :${attr}`;
    values[`:${attr}`] = val;
  }

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          PK: sesEmailKeys.campaignPk(campaignId),
          SK: sesEmailKeys.recipientSk(normalized),
        },
        UpdateExpression: expr,
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(PK)",
      })
    );
  } catch (err: unknown) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    if (name === "ConditionalCheckFailedException") return;
    console.error("[SES] updateRecipientStatus failed", { campaignId, email: normalized, err });
  }
}

/** Queue a bounce event for the bounce-sync Lambda (also suppress immediately). */
export async function recordBounceEvent(input: {
  email: string;
  reason?: string;
  detail?: string;
  campaignId?: string;
  provider?: string;
}): Promise<{ suppressed: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { suppressed: false };

  const { created } = await upsertSuppression({
    email,
    reason: "hard_bounce",
    source: input.provider || "mailercloud",
    detail: input.detail || input.reason,
  });

  const ts = now();
  const id = `${Date.now()}-${email.slice(0, 40)}`;
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: sesEmailKeys.bounceEventPk(id),
        SK: sesEmailKeys.bounceEventSk(),
        GSI1PK: sesEmailKeys.pendingBouncePk(),
        GSI1SK: sesEmailKeys.pendingBounceSk(ts, email),
        email,
        reason: input.reason || "bounce",
        detail: (input.detail || "").slice(0, 500),
        campaignId: input.campaignId,
        provider: input.provider || "mailercloud",
        processed: true,
        createdAt: ts,
      },
    })
  );

  if (input.campaignId) {
    await updateRecipientStatus(input.campaignId, email, {
      status: "bounced",
      bouncedAt: ts,
      lastError: input.detail || input.reason || "hard_bounce",
    });
  }

  return { suppressed: created };
}

/** Promote SMTP hard-fail recipients onto the suppression list. */
export async function syncHardBouncesFromFailedRecipients(limitCampaigns = 40): Promise<{
  scanned: number;
  suppressed: number;
}> {
  const campaigns = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.entityCampaignPk() },
      ScanIndexForward: false,
      Limit: limitCampaigns,
    })
  );

  let scanned = 0;
  let suppressed = 0;

  for (const c of campaigns.Items ?? []) {
    const campaignId = String(c.campaignId ?? "");
    if (!campaignId) continue;

    let startKey: Record<string, unknown> | undefined;
    do {
      const page = await docClient.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          FilterExpression: "#st = :failed OR #st = :bounced",
          ExpressionAttributeNames: { "#st": "status" },
          ExpressionAttributeValues: {
            ":pk": sesEmailKeys.campaignPk(campaignId),
            ":sk": "RECIPIENT#",
            ":failed": "failed",
            ":bounced": "bounced",
          },
          ExclusiveStartKey: startKey,
          Limit: 100,
        })
      );

      for (const item of page.Items ?? []) {
        scanned += 1;
        const email = String(item.email ?? "").toLowerCase();
        const lastError = String(item.lastError ?? "");
        const status = String(item.status ?? "");
        if (!email) continue;
        if (status !== "bounced" && !looksLikeHardBounce(lastError)) continue;

        const { created } = await upsertSuppression({
          email,
          reason: "hard_bounce",
          source: "bounce-sync",
          detail: lastError || status,
        });
        if (created) {
          suppressed += 1;
          await updateRecipientStatus(campaignId, email, {
            status: "bounced",
            bouncedAt: now(),
            lastError: lastError || "hard_bounce",
          });
          // Bump campaign bounce counter once when newly suppressed
          try {
            await docClient.send(
              new UpdateCommand({
                TableName: TABLE,
                Key: {
                  PK: sesEmailKeys.campaignPk(campaignId),
                  SK: sesEmailKeys.campaignSk(),
                },
                UpdateExpression:
                  "SET bouncedCount = if_not_exists(bouncedCount, :z) + :one, updatedAt = :t",
                ExpressionAttributeValues: { ":z": 0, ":one": 1, ":t": now() },
              })
            );
          } catch {
            /* ignore */
          }
        }
      }
      startKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (startKey);
  }

  return { scanned, suppressed };
}
