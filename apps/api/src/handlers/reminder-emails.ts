import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  ORDER_STATUS,
  cartKeys,
  couponKeys,
  customerKeys,
  defaultCheckoutNudgeHtml,
  DEFAULT_CHECKOUT_NUDGE_SUBJECT,
  isValidSesEmail,
  normalizeEmail,
  orderKeys,
  reminderEmailKeys,
  sendReminderEmailsSchema,
  sesEmailKeys,
  type ReminderEmail,
} from "@spicycorner/shared";
import {
  docClient,
  CARTS_TABLE,
  CONFIG_TABLE,
  CUSTOMERS_TABLE,
  EMAIL_CAMPAIGNS_TABLE,
  ORDERS_TABLE,
  REMINDER_EMAILS_TABLE,
  now,
} from "../lib/db";
import { ok, badRequest, unauthorized, serverError } from "../lib/response";
import { requireAdmin } from "../lib/auth";
import { htmlToText, sendViaSes } from "../lib/ses";

type Candidate = {
  email: string;
  name?: string;
  phone?: string;
  source: string;
};

const PAID_STATUSES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETE,
] as const;

async function queryAllPages(
  params: ConstructorParameters<typeof QueryCommand>[0]
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new QueryCommand({ ...params, ExclusiveStartKey })
    );
    if (result.Items?.length) items.push(...(result.Items as Record<string, unknown>[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

async function scanAllPages(
  params: ConstructorParameters<typeof ScanCommand>[0]
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({ ...params, ExclusiveStartKey })
    );
    if (result.Items?.length) items.push(...(result.Items as Record<string, unknown>[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

function addCandidate(
  map: Map<string, Candidate>,
  emailRaw: unknown,
  meta: { name?: unknown; phone?: unknown; source: string }
) {
  const email = normalizeEmail(typeof emailRaw === "string" ? emailRaw : undefined);
  if (!email || !isValidSesEmail(email)) return;
  const existing = map.get(email);
  const name =
    (typeof meta.name === "string" && meta.name.trim()) || existing?.name;
  const phone =
    (typeof meta.phone === "string" && meta.phone.trim()) || existing?.phone;
  const sources = new Set<string>(existing ? [existing.source] : []);
  // Keep first source string; merge into sources array at write time via map value
  if (existing) {
    map.set(email, {
      email,
      name,
      phone,
      source: `${existing.source},${meta.source}`,
    });
  } else {
    map.set(email, {
      email,
      name: name || undefined,
      phone: phone || undefined,
      source: meta.source,
    });
  }
}

async function collectPaidOrderEmails(): Promise<Set<string>> {
  const paid = new Set<string>();
  for (const status of PAID_STATUSES) {
    const items = await queryAllPages({
      TableName: ORDERS_TABLE,
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk",
      ExpressionAttributeValues: { ":pk": orderKeys.gsi3pk(status) },
      ProjectionExpression: "shippingAddress",
    });
    for (const item of items) {
      const addr = item.shippingAddress as { email?: string } | undefined;
      const email = normalizeEmail(addr?.email);
      if (email) paid.add(email);
    }
  }
  return paid;
}

async function collectLeadEmails(map: Map<string, Candidate>) {
  const items = await queryAllPages({
    TableName: CUSTOMERS_TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk",
    ExpressionAttributeValues: { ":pk": customerKeys.gsi1pk() },
  });
  for (const item of items) {
    const source =
      typeof item.source === "string" && item.source
        ? `lead:${item.source}`
        : "lead";
    addCandidate(map, item.email, {
      name: item.name,
      phone: item.phone,
      source,
    });
  }
}

async function collectProfileEmails(map: Map<string, Candidate>) {
  const items = await scanAllPages({
    TableName: CUSTOMERS_TABLE,
    FilterExpression: "SK = :sk AND attribute_exists(email)",
    ExpressionAttributeValues: { ":sk": customerKeys.profileSk() },
    ProjectionExpression: "PK, email, #n, phone",
    ExpressionAttributeNames: { "#n": "name" },
  });
  for (const item of items) {
    const pk = String(item.PK ?? "");
    const source = pk.startsWith("USER#") ? "account" : "visitor";
    addCandidate(map, item.email, {
      name: item.name,
      phone: item.phone,
      source,
    });
  }
}

async function collectAbandonedCartEmails(map: Map<string, Candidate>) {
  const carts = await queryAllPages({
    TableName: CARTS_TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk",
    ExpressionAttributeValues: { ":pk": cartKeys.gsi1pk() },
  });
  for (const cart of carts) {
    if (cart.convertedOrderId) continue;
    const itemCount = Number(cart.itemCount ?? 0);
    const items = cart.items as unknown[] | undefined;
    if (itemCount <= 0 && (!items || items.length === 0)) continue;
    const sessionId = typeof cart.sessionId === "string" ? cart.sessionId : undefined;
    if (!sessionId) continue;
    const profile = await docClient.send(
      new GetCommand({
        TableName: CUSTOMERS_TABLE,
        Key: { PK: customerKeys.pk(sessionId), SK: customerKeys.profileSk() },
      })
    );
    if (!profile.Item?.email) continue;
    addCandidate(map, profile.Item.email, {
      name: profile.Item.name,
      phone: profile.Item.phone,
      source: "abandoned_cart",
    });
  }
}

async function collectWelcomeCouponEmails(map: Map<string, Candidate>) {
  const items = await scanAllPages({
    TableName: CONFIG_TABLE,
    FilterExpression: "begins_with(PK, :p) AND SK = :sk",
    ExpressionAttributeValues: {
      ":p": "COUPON#",
      ":sk": couponKeys.sk(),
    },
    ProjectionExpression: "email, #src",
    ExpressionAttributeNames: { "#src": "source" },
  });
  for (const item of items) {
    if (item.source !== "welcome" && item.source !== "abandoned") continue;
    addCandidate(map, item.email, {
      source: item.source === "welcome" ? "welcome_coupon" : "abandoned_cart",
    });
  }
}

async function collectPendingCheckoutEmails(map: Map<string, Candidate>) {
  const items = await queryAllPages({
    TableName: ORDERS_TABLE,
    IndexName: "GSI3",
    KeyConditionExpression: "GSI3PK = :pk",
    ExpressionAttributeValues: {
      ":pk": orderKeys.gsi3pk(ORDER_STATUS.PENDING_PAYMENT),
    },
    ProjectionExpression: "shippingAddress",
  });
  for (const item of items) {
    const addr = item.shippingAddress as
      | { email?: string; name?: string; phone?: string }
      | undefined;
    addCandidate(map, addr?.email, {
      name: addr?.name,
      phone: addr?.phone,
      source: "checkout_pending",
    });
  }
}

async function emailAlreadyStored(email: string): Promise<boolean> {
  const res = await docClient.send(
    new GetCommand({
      TableName: REMINDER_EMAILS_TABLE,
      Key: { PK: reminderEmailKeys.pk(email), SK: reminderEmailKeys.sk() },
    })
  );
  return Boolean(res.Item);
}

async function insertReminderEmail(candidate: Candidate): Promise<boolean> {
  const ts = now();
  const sources = Array.from(
    new Set(
      candidate.source
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
  try {
    await docClient.send(
      new PutCommand({
        TableName: REMINDER_EMAILS_TABLE,
        Item: {
          PK: reminderEmailKeys.pk(candidate.email),
          SK: reminderEmailKeys.sk(),
          GSI1PK: reminderEmailKeys.statusPk("show"),
          GSI1SK: reminderEmailKeys.statusSk(ts, candidate.email),
          email: candidate.email,
          ...(candidate.name ? { name: candidate.name } : {}),
          ...(candidate.phone ? { phone: candidate.phone } : {}),
          sources,
          status: "show",
          reminderCount: 0,
          createdAt: ts,
          updatedAt: ts,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
    return true;
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

/** Collect site emails into reminder table. Skips duplicates + paid customers. */
export async function collectReminderEmails(): Promise<{
  scanned: number;
  inserted: number;
  skippedExisting: number;
  skippedPaid: number;
}> {
  const candidates = new Map<string, Candidate>();
  await Promise.all([
    collectLeadEmails(candidates),
    collectProfileEmails(candidates),
    collectAbandonedCartEmails(candidates),
    collectWelcomeCouponEmails(candidates),
    collectPendingCheckoutEmails(candidates),
  ]);

  const paid = await collectPaidOrderEmails();
  let inserted = 0;
  let skippedExisting = 0;
  let skippedPaid = 0;

  for (const candidate of candidates.values()) {
    if (paid.has(candidate.email)) {
      skippedPaid += 1;
      continue;
    }
    if (await emailAlreadyStored(candidate.email)) {
      skippedExisting += 1;
      continue;
    }
    const okInsert = await insertReminderEmail(candidate);
    if (okInsert) inserted += 1;
    else skippedExisting += 1;
  }

  return {
    scanned: candidates.size,
    inserted,
    skippedExisting,
    skippedPaid,
  };
}

async function listShowReminderEmails(limit = 500): Promise<ReminderEmail[]> {
  const items = await queryAllPages({
    TableName: REMINDER_EMAILS_TABLE,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk",
    ExpressionAttributeValues: { ":pk": reminderEmailKeys.statusPk("show") },
    ScanIndexForward: false,
    Limit: limit,
  });
  return items.map((item) => ({
    email: String(item.email),
    name: typeof item.name === "string" ? item.name : undefined,
    phone: typeof item.phone === "string" ? item.phone : undefined,
    sources: Array.isArray(item.sources) ? (item.sources as string[]) : [],
    status: "show" as const,
    createdAt: String(item.createdAt ?? ""),
    updatedAt: String(item.updatedAt ?? ""),
    lastReminderSentAt:
      typeof item.lastReminderSentAt === "string" ? item.lastReminderSentAt : undefined,
    reminderCount: Number(item.reminderCount ?? 0),
  }));
}

async function softDeleteReminderEmail(emailRaw: string): Promise<boolean> {
  const email = normalizeEmail(emailRaw);
  if (!email) return false;
  const key = { PK: reminderEmailKeys.pk(email), SK: reminderEmailKeys.sk() };
  const existing = await docClient.send(
    new GetCommand({ TableName: REMINDER_EMAILS_TABLE, Key: key })
  );
  if (!existing.Item || existing.Item.status === "deleted") return false;
  const ts = now();
  await docClient.send(
    new UpdateCommand({
      TableName: REMINDER_EMAILS_TABLE,
      Key: key,
      UpdateExpression:
        "SET #status = :deleted, deletedAt = :ts, updatedAt = :ts, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":deleted": "deleted",
        ":ts": ts,
        ":gsi1pk": reminderEmailKeys.statusPk("deleted"),
        ":gsi1sk": reminderEmailKeys.statusSk(ts, email),
      },
    })
  );
  return true;
}

async function isSuppressed(email: string): Promise<boolean> {
  const res = await docClient.send(
    new GetCommand({
      TableName: EMAIL_CAMPAIGNS_TABLE,
      Key: { PK: sesEmailKeys.suppressPk(email), SK: sesEmailKeys.suppressSk() },
    })
  );
  return Boolean(res.Item);
}

async function loadSesSender(): Promise<{
  fromName: string;
  fromEmail: string;
  replyTo: string;
}> {
  const res = await docClient.send(
    new GetCommand({
      TableName: EMAIL_CAMPAIGNS_TABLE,
      Key: { PK: sesEmailKeys.settingsPk(), SK: sesEmailKeys.settingsSk() },
    })
  );
  const settings = (res.Item?.settings ?? {}) as Record<string, string>;
  return {
    fromName: settings.defaultSenderName || "SpicyCorner",
    fromEmail: settings.defaultSenderEmail || process.env.SES_FROM_EMAIL || "order@spicycorner.com",
    replyTo: settings.defaultReplyTo || process.env.SES_REPLY_TO || "order@spicycorner.com",
  };
}

async function markReminderSent(email: string) {
  const ts = now();
  await docClient.send(
    new UpdateCommand({
      TableName: REMINDER_EMAILS_TABLE,
      Key: { PK: reminderEmailKeys.pk(email), SK: reminderEmailKeys.sk() },
      UpdateExpression:
        "SET lastReminderSentAt = :ts, updatedAt = :ts, reminderCount = if_not_exists(reminderCount, :zero) + :one",
      ExpressionAttributeValues: { ":ts": ts, ":zero": 0, ":one": 1 },
    })
  );
}

export async function listReminderEmailsHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  try {
    const items = await listShowReminderEmails();
    return ok({ items, count: items.length });
  } catch (err) {
    console.error("listReminderEmails failed:", err);
    return serverError(err instanceof Error ? err.message : "Failed to list reminder emails");
  }
}

export async function collectReminderEmailsHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  try {
    const result = await collectReminderEmails();
    return ok(result);
  } catch (err) {
    console.error("collectReminderEmails failed:", err);
    return serverError(err instanceof Error ? err.message : "Failed to fetch reminder emails");
  }
}

export async function deleteReminderEmailHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const email = decodeURIComponent(event.pathParameters?.email ?? "");
  if (!email) return badRequest("Email required");
  const deleted = await softDeleteReminderEmail(email);
  if (!deleted) return badRequest("Email not found or already removed");
  return ok({ deleted: true, email: normalizeEmail(email) });
}

export async function bulkDeleteReminderEmailsHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const body = JSON.parse(event.body ?? "{}") as { emails?: string[] };
  const emails = Array.isArray(body.emails) ? body.emails : [];
  if (!emails.length) return badRequest("emails array required");
  let deleted = 0;
  for (const email of emails.slice(0, 500)) {
    if (await softDeleteReminderEmail(email)) deleted += 1;
  }
  return ok({ deleted });
}

export async function sendReminderEmailsHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  try {
    const parsed = sendReminderEmailsSchema.safeParse(JSON.parse(event.body ?? "{}"));
    if (!parsed.success) return badRequest(parsed.error.message);

    const paid = await collectPaidOrderEmails();
    const sender = await loadSesSender();
    const siteUrl = process.env.SITE_URL || "https://www.spicycenter.com";
    const subject = parsed.data.subject?.trim() || DEFAULT_CHECKOUT_NUDGE_SUBJECT;

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of parsed.data.emails) {
      const email = normalizeEmail(raw);
      if (!email) {
        skipped += 1;
        continue;
      }
      if (paid.has(email) || (await isSuppressed(email))) {
        skipped += 1;
        continue;
      }

      const row = await docClient.send(
        new GetCommand({
          TableName: REMINDER_EMAILS_TABLE,
          Key: { PK: reminderEmailKeys.pk(email), SK: reminderEmailKeys.sk() },
        })
      );
      if (!row.Item || row.Item.status !== "show") {
        skipped += 1;
        continue;
      }

      const name = typeof row.Item.name === "string" ? row.Item.name : undefined;
      const html = defaultCheckoutNudgeHtml({ name, siteUrl });
      try {
        await sendViaSes({
          to: email,
          subject,
          html,
          text: htmlToText(html),
          fromName: sender.fromName,
          fromEmail: sender.fromEmail,
          replyTo: sender.replyTo,
        });
        await markReminderSent(email);
        sent += 1;
      } catch (err) {
        errors.push(`${email}: ${err instanceof Error ? err.message : "send failed"}`);
      }
    }

    return ok({ sent, skipped, errors });
  } catch (err) {
    console.error("sendReminderEmails failed:", err);
    return serverError(err instanceof Error ? err.message : "Failed to send reminder emails");
  }
}

/** Used by markOrderPaid — hide buyer from nudge list going forward. */
export async function markReminderEmailConverted(emailRaw?: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!email) return;
  try {
    await softDeleteReminderEmail(email);
  } catch (err) {
    console.error("markReminderEmailConverted failed:", err);
  }
}
