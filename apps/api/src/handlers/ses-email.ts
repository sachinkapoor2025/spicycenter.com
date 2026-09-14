import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { randomUUID } from "crypto";
import {
  createSesCampaignSchema,
  updateSesCampaignSchema,
  uploadSesRecipientsSchema,
  createSesTemplateSchema,
  updateSesTemplateSchema,
  sesSettingsSchema,
  suppressEmailSchema,
  sendTestEmailSchema,
  renderSesTemplate,
  resolveSesTemplateHtml,
  PREMIUM_MARKETING_EMAIL_LAYOUT,
  DEFAULT_SENDER_MESSAGE_FOOTER,
  sesEmailKeys,
  orderKeys,
  type SesCampaign,
  type SesSettings,
  type SesRecipient,
  type SesTemplate,
  type SesRecipientActivity,
  type MarketingEmailContentInput,
} from "@spicycorner/shared";
import { docClient, now, dayBucket } from "../lib/db";
import { ok, created, badRequest, notFound, forbidden, unauthorized, serverError, badGateway } from "../lib/response";
import { requireAdmin, getAuth } from "../lib/auth";
import {
  sendViaSes,
  htmlToText,
  SesSendError,
  formatSesError,
  clearMarketingTransportCache,
  redactSettingsForAdmin,
  isRedactedPassword,
  isMarketingSmtpPasswordAvailable,
} from "../lib/ses";
import {
  getSuppression,
  isSuppressedEmail,
  looksLikeHardBounce,
  recordBounceEvent,
  syncHardBouncesFromFailedRecipients,
  updateRecipientStatus,
  upsertSuppression,
} from "../lib/marketing-bounces";

const TABLE = process.env.EMAIL_CAMPAIGNS_TABLE ?? `spicycorner-email-campaigns-${process.env.ENVIRONMENT ?? "dev"}`;
const ORDERS_TABLE = process.env.ORDERS_TABLE ?? `spicycorner-orders-${process.env.ENVIRONMENT ?? "dev"}`;
const SITE_URL = (process.env.SITE_URL ?? "https://www.spicycenter.com").replace(/\/$/, "");

function defaultSettings(): SesSettings {
  const port = Number(process.env.MARKETING_SMTP_PORT || 587);
  return sesSettingsSchema.parse({
    awsRegion: process.env.SES_AWS_REGION || process.env.AWS_REGION || "us-east-1",
    defaultSenderName: "SpicyCenter",
    // Mailercloud verified Sender ID (From). SMTP login user may differ (smtpUser).
    defaultSenderEmail:
      process.env.MARKETING_FROM_EMAIL || process.env.SES_FROM_EMAIL || "email@spicycorner.com",
    defaultReplyTo:
      process.env.MARKETING_FROM_EMAIL || process.env.SES_REPLY_TO || "email@spicycorner.com",
    dailyLimit: 50_000,
    maxSendRatePerMinute: 600,
    batchSize: 50,
    delayBetweenBatchesMs: 5000,
    concurrentWorkers: 5,
    companyName: DEFAULT_SENDER_MESSAGE_FOOTER.companyName,
    companyAddress: DEFAULT_SENDER_MESSAGE_FOOTER.companyAddress,
    contactEmail: DEFAULT_SENDER_MESSAGE_FOOTER.contactEmail,
    privacyUrl: DEFAULT_SENDER_MESSAGE_FOOTER.privacyUrl,
    marketingTransport: "smtp",
    smtpHost: process.env.MARKETING_SMTP_HOST || "smtp-prod.mailrcld.com",
    smtpPort: Number.isFinite(port) && port > 0 ? port : 587,
    // Port 587 = STARTTLS; ignore MARKETING_SMTP_SECURE=true mistakes on 587.
    smtpSecure: (Number.isFinite(port) && port > 0 ? port : 587) === 465,
    // Marketing login/from defaults — never transactional order@ SMTP host.
    smtpUser: process.env.MARKETING_SMTP_USER || "order@spicycorner.com",
    // Prefer Lambda env so sends work even before Admin saves a password.
    smtpPassword: process.env.MARKETING_SMTP_PASS?.trim() || "",
  });
}

async function loadSettings(): Promise<SesSettings> {
  try {
    const res = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: sesEmailKeys.settingsPk(), SK: sesEmailKeys.settingsSk() },
      })
    );
    const defaults = defaultSettings();
    if (!res.Item) return defaults;
    const fromDb = (res.Item.settings ?? {}) as Partial<SesSettings>;
    // Never let an empty Dynamo password wipe the env-backed Mailercloud password.
    const smtpPassword =
      (fromDb.smtpPassword && fromDb.smtpPassword !== "********"
        ? fromDb.smtpPassword.trim()
        : "") || defaults.smtpPassword;
    const merged = {
      ...defaults,
      ...fromDb,
      smtpPassword,
      smtpHost: fromDb.smtpHost?.trim() || defaults.smtpHost,
      smtpUser: fromDb.smtpUser?.trim() || defaults.smtpUser,
    };
    const parsed = sesSettingsSchema.safeParse(merged);
    if (!parsed.success) {
      console.error("[SES] Invalid settings in DynamoDB; using defaults", parsed.error.message);
      return defaults;
    }
    return parsed.data;
  } catch (err) {
    console.error("[SES] Failed to load settings from DynamoDB", err);
    throw new Error(
      `Failed to load SES settings from table ${TABLE}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function isSuppressed(email: string): Promise<boolean> {
  return isSuppressedEmail(email);
}

async function addNotification(message: string, level: "info" | "success" | "error" = "info") {
  const id = randomUUID();
  const ts = now();
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: sesEmailKeys.notifyPk(id),
        SK: sesEmailKeys.notifySk(),
        GSI1PK: sesEmailKeys.entityNotifyPk(),
        GSI1SK: ts,
        id,
        message,
        level,
        createdAt: ts,
        read: false,
      },
    })
  );
}

function buildFooter(settings: SesSettings, unsubUrl: string): string {
  const company = settings.companyName || DEFAULT_SENDER_MESSAGE_FOOTER.companyName;
  const address = settings.companyAddress || DEFAULT_SENDER_MESSAGE_FOOTER.companyAddress;
  const contact = settings.contactEmail || DEFAULT_SENDER_MESSAGE_FOOTER.contactEmail;
  const privacy = settings.privacyUrl || DEFAULT_SENDER_MESSAGE_FOOTER.privacyUrl;
  return `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.5;font-family:Arial,sans-serif">
  <p style="margin:0 0 8px"><strong>${company}</strong><br/>${address}<br/>
  <a href="mailto:${contact}" style="color:#4876e8">${contact}</a></p>
  <p style="margin:0">
    <a href="${privacy}" style="color:#4876e8">Privacy Policy</a>
    &nbsp;·&nbsp;
    <a href="${unsubUrl}" style="color:#4876e8">Unsubscribe</a>
  </p>
</div>`;
}

/** Insert fragment before </body> when present so full HTML emails stay valid. */
function appendToHtml(html: string, fragment: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${fragment}</body>`);
  return `${html}${fragment}`;
}

/**
 * Finalize campaign HTML for send/test:
 * - replace {{unsubscribe}} when present
 * - full HTML templates keep their own footer (no extra unsubscribe block)
 * - simple HTML snippets still get the standard compliance footer
 */
function finalizeEmailHtml(html: string, settings: SesSettings, unsubUrl: string): string {
  const unsubLink = `<a href="${unsubUrl}" target="_blank" style="color:#c41e3a;text-decoration:underline">Unsubscribe</a>`;
  if (/\{\{\s*unsubscribe\s*\}\}/i.test(html)) {
    return html.replace(/\{\{\s*unsubscribe\s*\}\}/gi, unsubLink);
  }
  if (/<!DOCTYPE\s+html/i.test(html) || /<\/html>/i.test(html)) {
    return html;
  }
  return appendToHtml(html, buildFooter(settings, unsubUrl));
}

/** External social / app links should open directly (not via click-tracking redirect). */
function shouldSkipClickTracking(url: string): boolean {
  if (url.includes("/email/click/") || url.includes("/email/unsubscribe/")) return true;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.com" ||
      host.endsWith(".fb.com") ||
      host === "instagram.com" ||
      host.endsWith(".instagram.com") ||
      host === "wa.me" ||
      host === "api.whatsapp.com"
    );
  } catch {
    return false;
  }
}

function injectTracking(html: string, openToken: string, linkMap: Map<string, string>): string {
  let out = html;
  out = out.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m, q, url) => {
    if (shouldSkipClickTracking(url)) {
      return `href=${q}${url}${q}`;
    }
    const token = randomUUID().replace(/-/g, "").slice(0, 24);
    linkMap.set(token, url);
    return `href=${q}${SITE_URL}/email/click/${token}${q}`;
  });
  const pixel = `<img src="${SITE_URL}/email/open/${openToken}" width="1" height="1" alt="" style="display:none" />`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${pixel}</body>`);
  else out += pixel;
  return out;
}

async function persistClickTokens(
  linkMap: Map<string, string>,
  meta: { campaignId?: string; email?: string }
) {
  for (const [token, targetUrl] of linkMap) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          PK: sesEmailKeys.trackClickPk(token),
          SK: sesEmailKeys.trackSk(),
          campaignId: meta.campaignId,
          email: meta.email,
          targetUrl,
          clickCount: 0,
          createdAt: now(),
        },
      })
    );
  }
}

async function getCampaign(campaignId: string): Promise<SesCampaign | null> {
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.campaignPk(campaignId), SK: sesEmailKeys.campaignSk() },
    })
  );
  return (res.Item as SesCampaign | undefined) ?? null;
}

async function saveCampaign(campaign: SesCampaign) {
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...campaign,
        PK: sesEmailKeys.campaignPk(campaign.campaignId),
        SK: sesEmailKeys.campaignSk(),
        GSI1PK: sesEmailKeys.entityCampaignPk(),
        GSI1SK: campaign.createdAt,
        GSI2PK: sesEmailKeys.statusPk(campaign.status),
        GSI2SK: campaign.scheduledAt || campaign.updatedAt,
      },
    })
  );
}

export async function getDashboard(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const list = await listCampaignItems();
  const today = dayBucket();
  const scheduledToday = list.filter(
    (c) => c.status === "scheduled" && c.scheduledAt?.startsWith(today)
  ).length;
  const sending = list.filter((c) => c.status === "sending" || c.status === "preparing").length;
  const upcoming = list
    .filter((c) => c.status === "scheduled")
    .sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""))
    .slice(0, 8);
  const recent = list
    .filter((c) => c.status === "completed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const scheduledWeek = list.filter(
    (c) => c.status === "scheduled" && c.scheduledAt && new Date(c.scheduledAt).getTime() >= weekStart
  ).length;

  const settings = await loadSettings();
  const daily = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.dailyCounterPk(today), SK: sesEmailKeys.dailyCounterSk() },
    })
  );

  return ok({
    cards: {
      scheduledToday,
      scheduledThisWeek: scheduledWeek,
      currentlySending: sending,
      sentLast24h: Number(daily.Item?.sentCount ?? 0),
      dailyLimit: settings.dailyLimit,
    },
    upcoming,
    recent,
    campaigns: list.slice(0, 20),
  });
}

async function listCampaignItems(): Promise<SesCampaign[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.entityCampaignPk() },
      ScanIndexForward: false,
      Limit: 200,
    })
  );
  return (res.Items ?? []) as SesCampaign[];
}

export async function listCampaigns(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  return ok({ campaigns: await listCampaignItems() });
}

export async function getCampaignHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const id = event.pathParameters?.campaignId;
  if (!id) return badRequest("campaignId required");
  const campaign = await getCampaign(id);
  if (!campaign) return notFound("Campaign not found");

  // Keep counter honest — stale recipientCount was showing 200 while RECIPIENT# rows were missing.
  const allEmails = await listCampaignRecipientEmails(id);
  if (campaign.recipientCount !== allEmails.size) {
    campaign.recipientCount = allEmails.size;
    campaign.updatedAt = now();
    await saveCampaign(campaign);
  }

  const recipients = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": sesEmailKeys.campaignPk(id),
        ":sk": "RECIPIENT#",
      },
      Limit: 100,
    })
  );

  return ok({
    campaign,
    recipientsPreview: (recipients.Items ?? []).map((r) => ({
      email: r.email,
      name: r.name,
      company: r.company,
      status: r.status,
    })),
  });
}

export async function createCampaign(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return unauthorized("Admin access required");
  const body = JSON.parse(event.body ?? "{}");
  const parsed = createSesCampaignSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const settings = await loadSettings();
  const ts = now();
  const campaignId = randomUUID();
  const status = parsed.data.scheduledAt ? "scheduled" : "draft";
  const campaign: SesCampaign = {
    campaignId,
    name: parsed.data.name,
    subject: parsed.data.subject || "",
    senderName: parsed.data.senderName || settings.defaultSenderName,
    senderEmail: parsed.data.senderEmail || settings.defaultSenderEmail,
    replyTo: parsed.data.replyTo || settings.defaultReplyTo,
    htmlBody: parsed.data.htmlBody || "",
    templateId: parsed.data.templateId,
    status,
    scheduledAt: parsed.data.scheduledAt,
    timezone: parsed.data.timezone || "Asia/Kolkata",
    recurrenceType: parsed.data.recurrenceType || "none",
    recurrenceExpression: parsed.data.recurrenceExpression,
    nextRunAt: parsed.data.scheduledAt,
    recipientCount: 0,
    queuedCount: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    bouncedCount: 0,
    complaintCount: 0,
    openCount: 0,
    clickCount: 0,
    createdBy: auth.email,
    createdAt: ts,
    updatedAt: ts,
  };
  await saveCampaign(campaign);
  await addNotification(`Campaign created: ${campaign.name}`, "info");
  return created({ campaign });
}

export async function updateCampaign(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return unauthorized("Admin access required");
  const id = event.pathParameters?.campaignId;
  if (!id) return badRequest("campaignId required");
  const existing = await getCampaign(id);
  if (!existing) return notFound("Campaign not found");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateSesCampaignSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const action = parsed.data.action;
  const started = ["preparing", "sending", "completed", "cancelled", "failed"].includes(existing.status);

  if (action === "pause") {
    if (existing.status !== "sending" && existing.status !== "preparing") {
      return badRequest("Only sending campaigns can be paused");
    }
    existing.status = "paused";
  } else if (action === "resume") {
    if (existing.status !== "paused") return badRequest("Only paused campaigns can be resumed");
    existing.status = "sending";
  } else if (action === "cancel") {
    if (["completed", "cancelled"].includes(existing.status)) {
      return badRequest("Campaign already finished");
    }
    existing.status = "cancelled";
  } else if (action === "send_now") {
    if (!["draft", "scheduled", "paused"].includes(existing.status)) {
      return badRequest("Cannot send from current status");
    }
    const recipientEmails = await listCampaignRecipientEmails(existing.campaignId);
    existing.recipientCount = recipientEmails.size;
    if (recipientEmails.size === 0) {
      return badRequest(
        "This campaign has 0 recipients in the database. Upload a recipient list first (Import), then send."
      );
    }
    existing.status = "preparing";
    existing.scheduledAt = undefined;
    existing.nextRunAt = now();
    existing.updatedAt = now();
    await saveCampaign(existing);
    // Build send queue immediately — don't wait for the cron tick.
    await enqueueCampaignRecipients(existing.campaignId);
    const refreshed = await getCampaign(existing.campaignId);
    if (!refreshed) return serverError("Campaign disappeared while starting send");
    refreshed.status = "sending";
    refreshed.lastRunAt = now();
    refreshed.updatedAt = now();
    await saveCampaign(refreshed);
    await addNotification(`Campaign started: ${refreshed.name}`, "success");
    return ok({ campaign: refreshed });
  } else if (action === "duplicate") {
    const ts = now();
    const copy: SesCampaign = {
      ...existing,
      campaignId: randomUUID(),
      name: `${existing.name} (copy)`,
      status: "draft",
      scheduledAt: undefined,
      nextRunAt: undefined,
      lastRunAt: undefined,
      recipientCount: 0,
      queuedCount: 0,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      bouncedCount: 0,
      complaintCount: 0,
      openCount: 0,
      clickCount: 0,
      createdAt: ts,
      updatedAt: ts,
      createdBy: auth.email,
    };
    await saveCampaign(copy);
    return created({ campaign: copy });
  } else {
    if (started && existing.status !== "draft" && existing.status !== "scheduled") {
      return badRequest("Cannot edit campaign after sending starts");
    }
    Object.assign(existing, {
      name: parsed.data.name ?? existing.name,
      subject: parsed.data.subject ?? existing.subject,
      senderName: parsed.data.senderName ?? existing.senderName,
      senderEmail: parsed.data.senderEmail ?? existing.senderEmail,
      replyTo: parsed.data.replyTo ?? existing.replyTo,
      htmlBody: parsed.data.htmlBody ?? existing.htmlBody,
      templateId: parsed.data.templateId ?? existing.templateId,
      timezone: parsed.data.timezone ?? existing.timezone,
      recurrenceType: parsed.data.recurrenceType ?? existing.recurrenceType,
      recurrenceExpression: parsed.data.recurrenceExpression ?? existing.recurrenceExpression,
    });
    if (parsed.data.scheduledAt) {
      existing.scheduledAt = parsed.data.scheduledAt;
      existing.nextRunAt = parsed.data.scheduledAt;
      existing.status = "scheduled";
    }
    if (parsed.data.status && ["draft", "scheduled"].includes(parsed.data.status)) {
      existing.status = parsed.data.status;
    }
  }

  existing.updatedAt = now();
  await saveCampaign(existing);
  await addNotification(`Campaign ${existing.name}: ${action || "updated"}`, "info");
  return ok({ campaign: existing });
}

async function listCampaignRecipientEmails(campaignId: string): Promise<Set<string>> {
  const emails = new Set<string>();
  let lastKey: Record<string, unknown> | undefined;
  do {
    const page = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": sesEmailKeys.campaignPk(campaignId),
          ":sk": "RECIPIENT#",
        },
        ProjectionExpression: "email",
        ExclusiveStartKey: lastKey,
        Limit: 500,
      })
    );
    for (const item of page.Items ?? []) {
      const email = String(item.email ?? "")
        .trim()
        .toLowerCase();
      if (email) emails.add(email);
    }
    lastKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return emails;
}

async function batchPutRecipientItems(items: Record<string, unknown>[]) {
  // DynamoDB BatchWrite max 25; retry UnprocessedItems (previously ignored → silent data loss).
  for (let i = 0; i < items.length; i += 25) {
    let requestItems: { PutRequest: { Item: Record<string, unknown> } }[] = items
      .slice(i, i + 25)
      .map((Item) => ({ PutRequest: { Item } }));

    for (let attempt = 0; attempt < 8 && requestItems.length > 0; attempt++) {
      const res = await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [TABLE]: requestItems },
        })
      );
      const unprocessed = res.UnprocessedItems?.[TABLE] ?? [];
      requestItems = unprocessed
        .map((u) => u.PutRequest?.Item)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((Item) => ({ PutRequest: { Item } }));
      if (requestItems.length > 0) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
      }
    }
    if (requestItems.length > 0) {
      throw new Error(
        `Failed to persist ${requestItems.length} recipients after retries. Please try again.`
      );
    }
  }
}

export async function uploadRecipients(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const body = JSON.parse(event.body ?? "{}");
  const parsed = uploadSesRecipientsSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const campaign = await getCampaign(parsed.data.campaignId);
  if (!campaign) return notFound("Campaign not found");
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return badRequest("Recipients can only be uploaded before sending starts");
  }

  const existingEmails = await listCampaignRecipientEmails(campaign.campaignId);
  const unique = new Map<string, SesRecipient>();
  let skippedInvalid = 0;
  let skippedDuplicate = 0;
  let skippedSuppressed = 0;
  let skippedBounced = 0;

  for (const row of parsed.data.recipients) {
    const email = row.email.trim().toLowerCase();
    if (!email) {
      skippedInvalid += 1;
      continue;
    }
    if (unique.has(email) || existingEmails.has(email)) {
      skippedDuplicate += 1;
      continue;
    }
    const suppression = await getSuppression(email);
    if (suppression) {
      if (suppression.reason === "hard_bounce") skippedBounced += 1;
      else skippedSuppressed += 1;
      continue;
    }
    unique.set(email, { ...row, email });
  }

  const recipients = [...unique.values()];
  const ts = now();
  const items = recipients.map((r) => ({
    PK: sesEmailKeys.campaignPk(campaign.campaignId),
    SK: sesEmailKeys.recipientSk(r.email),
    campaignId: campaign.campaignId,
    email: r.email,
    ...(r.name ? { name: r.name } : {}),
    ...(r.company ? { company: r.company } : {}),
    ...(r.city ? { city: r.city } : {}),
    ...(r.state ? { state: r.state } : {}),
    ...(r.country ? { country: r.country } : {}),
    status: "ready",
    createdAt: ts,
  }));

  try {
    await batchPutRecipientItems(items);
  } catch (err) {
    console.error("[SES] uploadRecipients batch write failed", {
      campaignId: campaign.campaignId,
      count: items.length,
      err,
    });
    return serverError(err instanceof Error ? err.message : "Failed to save recipients");
  }

  // Authoritative count from DynamoDB (not just this upload size).
  const allEmails = await listCampaignRecipientEmails(campaign.campaignId);
  campaign.recipientCount = allEmails.size;
  campaign.updatedAt = now();
  await saveCampaign(campaign);

  return ok({
    imported: recipients.length,
    skippedInvalid,
    skippedDuplicate,
    skippedSuppressed,
    skippedBounced,
    /** Convenience total for admin UI: bounced + unsub/manual/complaint. */
    skippedBlocked: skippedSuppressed + skippedBounced,
    totalRecipients: allEmails.size,
    preview: recipients.slice(0, 20),
    campaign,
  });
}

async function getTemplate(templateId: string): Promise<SesTemplate | null> {
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.templatePk(templateId), SK: sesEmailKeys.templateSk() },
    })
  );
  if (!res.Item) return null;
  return toTemplateResponse(res.Item as Record<string, unknown>);
}

function looksLikeDefaultCampaignHtml(html: string): boolean {
  const body = html.trim();
  if (!body) return true;
  // Legacy compose placeholder — prefer linked template instead of this stub.
  return body.length < 400 && /Hello\s*\{\{\s*name\s*\}\}/i.test(body);
}

async function resolveCampaignEmailContent(campaign: SesCampaign): Promise<{
  subject: string;
  htmlBody: string;
}> {
  let subject = campaign.subject?.trim() || "";
  let htmlBody = campaign.htmlBody || "";

  if (campaign.templateId) {
    const template = await getTemplate(campaign.templateId);
    if (template) {
      if (looksLikeDefaultCampaignHtml(htmlBody)) {
        htmlBody = template.htmlBody;
      }
      if (!subject) subject = template.subject;
    }
  }

  return { subject, htmlBody };
}

function toTemplateResponse(item: Record<string, unknown>): SesTemplate {
  const layout =
    item.layout === PREMIUM_MARKETING_EMAIL_LAYOUT ? PREMIUM_MARKETING_EMAIL_LAYOUT : undefined;
  const contentFields =
    item.contentFields && typeof item.contentFields === "object"
      ? (item.contentFields as MarketingEmailContentInput)
      : undefined;
  const htmlBody = resolveSesTemplateHtml({
    htmlBody: String(item.htmlBody ?? ""),
    layout,
    contentFields,
  });
  return {
    templateId: String(item.templateId),
    name: String(item.name ?? ""),
    subject: String(item.subject ?? ""),
    htmlBody,
    ...(layout ? { layout } : {}),
    ...(contentFields ? { contentFields } : {}),
    createdAt: String(item.createdAt ?? ""),
    updatedAt: String(item.updatedAt ?? ""),
  };
}

export async function listTemplates(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.entityTemplatePk() },
      ScanIndexForward: false,
      Limit: 100,
    })
  );
  return ok({
    templates: (res.Items ?? []).map((item) => toTemplateResponse(item as Record<string, unknown>)),
  });
}

export async function getTemplateHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const id = event.pathParameters?.templateId;
  if (!id) return badRequest("templateId required");
  const template = await getTemplate(id);
  if (!template) return notFound("Template not found");
  return ok({ template });
}

export async function createTemplate(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const body = JSON.parse(event.body ?? "{}");
  const parsed = createSesTemplateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);
  const { templateId: requestedId, name, subject, layout, contentFields } = parsed.data;
  const templateId = requestedId ?? randomUUID();

  if (requestedId) {
    const existing = await getTemplate(requestedId);
    if (existing) return ok({ template: existing, existed: true });
  }

  const htmlBody = resolveSesTemplateHtml({
    htmlBody: parsed.data.htmlBody,
    layout,
    contentFields,
  });
  const ts = now();
  const item = {
    PK: sesEmailKeys.templatePk(templateId),
    SK: sesEmailKeys.templateSk(),
    GSI1PK: sesEmailKeys.entityTemplatePk(),
    GSI1SK: ts,
    templateId,
    name,
    subject,
    htmlBody,
    ...(layout ? { layout } : {}),
    ...(contentFields ? { contentFields } : {}),
    createdAt: ts,
    updatedAt: ts,
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return created({ template: toTemplateResponse(item), existed: false });
}

export async function updateTemplate(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const id = event.pathParameters?.templateId;
  if (!id) return badRequest("templateId required");

  const existing = await getTemplate(id);
  if (!existing) return notFound("Template not found");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateSesTemplateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const layout = parsed.data.layout ?? existing.layout;
  const contentFields =
    parsed.data.contentFields !== undefined ? parsed.data.contentFields : existing.contentFields;
  const htmlBody = resolveSesTemplateHtml({
    htmlBody: parsed.data.htmlBody ?? existing.htmlBody,
    layout,
    contentFields,
  });

  const updated: SesTemplate = {
    templateId: existing.templateId,
    name: parsed.data.name ?? existing.name,
    subject: parsed.data.subject ?? existing.subject,
    htmlBody,
    ...(layout ? { layout } : {}),
    ...(contentFields ? { contentFields } : {}),
    createdAt: existing.createdAt,
    updatedAt: now(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: sesEmailKeys.templatePk(updated.templateId),
        SK: sesEmailKeys.templateSk(),
        GSI1PK: sesEmailKeys.entityTemplatePk(),
        GSI1SK: updated.createdAt,
        ...updated,
      },
    })
  );
  return ok({ template: updated });
}

export async function deleteTemplate(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const id = event.pathParameters?.templateId;
  if (!id) return badRequest("templateId required");

  const existing = await getTemplate(id);
  if (!existing) return notFound("Template not found");

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.templatePk(id), SK: sesEmailKeys.templateSk() },
    })
  );
  return ok({ ok: true, templateId: id });
}

export async function getSettings(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const settings = await loadSettings();
  const smtpPasswordSet = isMarketingSmtpPasswordAvailable(settings);
  return ok({
    settings: redactSettingsForAdmin(settings),
    smtpPasswordSet,
    smtpPasswordSource: settings.smtpPassword
      ? process.env.MARKETING_SMTP_PASS?.trim() &&
        settings.smtpPassword === process.env.MARKETING_SMTP_PASS.trim()
        ? "env"
        : "settings"
      : process.env.MARKETING_SMTP_PASS?.trim()
        ? "env"
        : "none",
  });
}

export async function updateSettings(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const body = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
  const existing = await loadSettings();
  const incomingPassword =
    typeof body.smtpPassword === "string" ? body.smtpPassword : undefined;
  // Empty / redacted / omitted password means "keep existing" (incl. env-hydrated value).
  const keepPassword =
    incomingPassword === undefined || isRedactedPassword(incomingPassword);
  const nextPassword = keepPassword
    ? existing.smtpPassword || process.env.MARKETING_SMTP_PASS?.trim() || ""
    : String(incomingPassword ?? "").trim();

  const merged = {
    ...existing,
    ...body,
    smtpPassword: nextPassword,
  };
  const parsed = sesSettingsSchema.safeParse(merged);
  if (!parsed.success) return badRequest(parsed.error.message);
  const host = (parsed.data.smtpHost || "").trim().toLowerCase();
  if (/^(smtp|mail)\.spicycorner\.com$/.test(host)) {
    return badRequest(
      "Marketing SMTP must use Mailercloud (smtp-prod.mailrcld.com). smtp.spicycenter.com is reserved for transactional order emails only."
    );
  }
  if (parsed.data.marketingTransport === "smtp" && !nextPassword) {
    return badRequest(
      "Marketing SMTP password is required. Paste your Mailercloud password, or set the MARKETING_SMTP_PASS / GitHub secret MARKETING_SMTP_PASS for deploy."
    );
  }
  // Coerce TLS mode from port so Mailercloud 587 never saves as SMTPS (causes wrong version number).
  const settingsToSave = {
    ...parsed.data,
    smtpHost: parsed.data.smtpHost?.trim() || "smtp-prod.mailrcld.com",
    smtpUser: parsed.data.smtpUser?.trim() || "order@spicycorner.com",
    smtpSecure: Number(parsed.data.smtpPort) === 465,
    smtpPassword: nextPassword,
  };
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: sesEmailKeys.settingsPk(),
        SK: sesEmailKeys.settingsSk(),
        settings: settingsToSave,
        updatedAt: now(),
      },
    })
  );
  clearMarketingTransportCache();
  return ok({
    settings: redactSettingsForAdmin(settingsToSave),
    smtpPasswordSet: Boolean(settingsToSave.smtpPassword),
    smtpPasswordSource: "settings",
  });
}

export async function listSuppression(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.entitySuppressPk() },
      ScanIndexForward: false,
      Limit: 500,
    })
  );
  return ok({ items: res.Items ?? [] });
}

export async function addSuppression(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const body = JSON.parse(event.body ?? "{}");
  const parsed = suppressEmailSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);
  const ts = now();
  const email = parsed.data.email.trim().toLowerCase();
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: sesEmailKeys.suppressPk(email),
        SK: sesEmailKeys.suppressSk(),
        GSI1PK: sesEmailKeys.entitySuppressPk(),
        GSI1SK: ts,
        email,
        reason: parsed.data.reason,
        createdAt: ts,
      },
    })
  );
  return created({ ok: true, email });
}

export async function removeSuppression(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const email = decodeURIComponent(event.pathParameters?.email ?? "").trim().toLowerCase();
  if (!email) return badRequest("email required");
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.suppressPk(email), SK: sesEmailKeys.suppressSk() },
    })
  );
  return ok({ ok: true });
}

export async function listQueue(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.pendingQueuePk() },
      Limit: 200,
    })
  );
  const campaigns = await listCampaignItems();
  const active = campaigns.filter((c) =>
    ["preparing", "sending", "paused", "scheduled"].includes(c.status)
  );
  return ok({ pending: res.Items ?? [], activeCampaigns: active });
}

export async function getAnalytics(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const campaigns = await listCampaignItems();
  const totals = campaigns.reduce(
    (acc, c) => {
      acc.queued += c.queuedCount;
      acc.sent += c.sentCount;
      acc.delivered += c.deliveredCount;
      acc.failed += c.failedCount;
      acc.bounced += c.bouncedCount;
      acc.complaints += c.complaintCount;
      acc.opens += c.openCount;
      acc.clicks += c.clickCount;
      return acc;
    },
    { queued: 0, sent: 0, delivered: 0, failed: 0, bounced: 0, complaints: 0, opens: 0, clicks: 0 }
  );
  const byDay = campaigns.slice(0, 30).map((c) => ({
    name: c.name,
    sent: c.sentCount,
    opens: c.openCount,
    clicks: c.clickCount,
    failed: c.failedCount,
  }));
  return ok({ totals, byCampaign: byDay, campaigns: campaigns.slice(0, 50) });
}

async function loadRecentOrderEmails(maxOrders = 1500): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  let startKey: Record<string, unknown> | undefined;
  let fetched = 0;
  try {
    do {
      const page = await docClient.send(
        new QueryCommand({
          TableName: ORDERS_TABLE,
          IndexName: "GSI2",
          KeyConditionExpression: "GSI2PK = :pk",
          ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
          ScanIndexForward: false,
          Limit: 100,
          ExclusiveStartKey: startKey,
        })
      );
      for (const item of page.Items ?? []) {
        fetched += 1;
        const email = String(
          (item.shippingAddress as { email?: string } | undefined)?.email ?? item.email ?? ""
        )
          .trim()
          .toLowerCase();
        const orderId = String(item.orderId ?? "");
        const status = String(item.status ?? "");
        if (!email || !orderId) continue;
        if (status === "pending_payment" || status === "cancelled") continue;
        if (!byEmail.has(email)) byEmail.set(email, orderId);
      }
      startKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (startKey && fetched < maxOrders);
  } catch (err) {
    console.error("[SES] loadRecentOrderEmails failed", err);
  }
  return byEmail;
}

/** Admin: paginated per-email activity across campaigns (or one campaign). */
export async function listAnalyticsRecipients(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");

  const qs = event.queryStringParameters ?? {};
  const campaignId = qs.campaignId?.trim();
  const statusFilter = qs.status?.trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(qs.limit ?? 50) || 50));
  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (qs.cursor) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(qs.cursor, "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      return badRequest("Invalid cursor");
    }
  }

  const campaigns = await listCampaignItems();
  const nameById = new Map(campaigns.map((c) => [c.campaignId, c.name]));
  const orderEmails = await loadRecentOrderEmails();

  const campaignIds = campaignId
    ? [campaignId]
    : campaigns.slice(0, 25).map((c) => c.campaignId);

  const rows: SesRecipientActivity[] = [];
  let nextCursor: string | undefined;

  for (const id of campaignIds) {
    if (rows.length >= limit) break;
    const page = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": sesEmailKeys.campaignPk(id),
          ":sk": "RECIPIENT#",
        },
        ExclusiveStartKey: campaignId ? exclusiveStartKey : undefined,
        Limit: limit - rows.length + 10,
      })
    );

    for (const item of page.Items ?? []) {
      const email = String(item.email ?? "").toLowerCase();
      if (!email) continue;
      const status = String(item.status ?? "ready");
      if (statusFilter && status !== statusFilter) continue;
      const clickedAt = item.clickedAt ? String(item.clickedAt) : undefined;
      const orderId = orderEmails.get(email);
      rows.push({
        email,
        name: item.name ? String(item.name) : undefined,
        campaignId: id,
        campaignName: nameById.get(id),
        status,
        sentAt: item.sentAt ? String(item.sentAt) : undefined,
        deliveredAt: item.deliveredAt ? String(item.deliveredAt) : undefined,
        openedAt: item.openedAt ? String(item.openedAt) : undefined,
        clickedAt,
        bouncedAt: item.bouncedAt ? String(item.bouncedAt) : undefined,
        failedAt: item.failedAt ? String(item.failedAt) : undefined,
        lastError: item.lastError ? String(item.lastError) : undefined,
        visitedSite: Boolean(clickedAt),
        placedOrder: Boolean(orderId),
        orderId,
      });
      if (rows.length >= limit) break;
    }

    if (campaignId && page.LastEvaluatedKey) {
      nextCursor = Buffer.from(JSON.stringify(page.LastEvaluatedKey), "utf8").toString("base64url");
    }
  }

  return ok({
    recipients: rows.slice(0, limit),
    nextCursor,
    filters: { campaignId: campaignId || null, status: statusFilter || null },
  });
}

/** Public Mailercloud webhook — bounce / complaint / unsubscribe → SUPPRESS#. */
export async function mailercloudWebhook(event: APIGatewayProxyEventV2) {
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON");
  }

  const eventName = String(body.event ?? body.type ?? body.status ?? "").toLowerCase();
  const email = String(body.email ?? body.recipient ?? body.to ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    return ok({ ok: true, skipped: "no_email" });
  }

  const isBounce = /bounce|hard_bounce|soft_bounce|failed/.test(eventName) || body.bounce === true;
  const isComplaint = /spam|complaint/.test(eventName);
  const isUnsub = /unsub/.test(eventName);

  if (isBounce) {
    await recordBounceEvent({
      email,
      reason: String(body.reason ?? (eventName || "bounce")),
      detail: String(body.reason ?? body.message ?? eventName),
      campaignId: body.campaign_id ? String(body.campaign_id) : undefined,
      provider: "mailercloud",
    });
    return ok({ ok: true, action: "suppressed_bounce", email });
  }
  if (isComplaint) {
    await upsertSuppression({
      email,
      reason: "complaint",
      source: "mailercloud",
      detail: String(body.reason ?? "complaint"),
    });
    return ok({ ok: true, action: "suppressed_complaint", email });
  }
  if (isUnsub) {
    await upsertSuppression({
      email,
      reason: "unsubscribe",
      source: "mailercloud",
    });
    return ok({ ok: true, action: "suppressed_unsubscribe", email });
  }

  return ok({ ok: true, skipped: "unhandled_event", event: eventName });
}

/** Admin: run bounce sync now (same work as the hourly Lambda). */
export async function syncBouncesHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const result = await syncHardBouncesFromFailedRecipients();
  await addNotification(
    `Bounce sync: scanned ${result.scanned} failed rows, newly suppressed ${result.suppressed}`,
    result.suppressed > 0 ? "success" : "info"
  );
  return ok(result);
}

/** Scheduled Lambda entry — promote hard-fail recipients onto SUPPRESS#. */
export async function processMarketingBounceSync() {
  return syncHardBouncesFromFailedRecipients();
}

export async function listNotifications(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.entityNotifyPk() },
      ScanIndexForward: false,
      Limit: 50,
    })
  );
  return ok({ notifications: res.Items ?? [] });
}

export async function sendTest(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return unauthorized("Admin access required");

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Request body must be valid JSON");
  }

  const parsed = sendTestEmailSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  try {
    if (!TABLE) {
      return serverError("EMAIL_CAMPAIGNS_TABLE environment variable is not configured");
    }

    const campaign = await getCampaign(parsed.data.campaignId);
    if (!campaign) return notFound("Campaign not found");

    const content = await resolveCampaignEmailContent(campaign);
    if (!content.htmlBody || !content.subject) {
      return badRequest("Subject and HTML body required (load a template or enter content)");
    }

    const settings = await loadSettings();
    const fromName = (campaign.senderName || settings.defaultSenderName || "SpicyCenter").trim();
    // From must be Mailercloud verified Sender ID (email@spicycorner.com), not SMTP login.
    const fromEmail = (
      campaign.senderEmail ||
      settings.defaultSenderEmail ||
      "email@spicycorner.com"
    ).trim();
    const replyTo = (campaign.replyTo || settings.defaultReplyTo || fromEmail).trim();

    if (!fromEmail) {
      return badRequest(
        "Sender email is missing. Set Default sender email to your verified Mailercloud Sender ID (e.g. email@spicycorner.com)."
      );
    }

    const openToken = randomUUID().replace(/-/g, "");
    const unsubToken = randomUUID().replace(/-/g, "");
    const linkMap = new Map<string, string>();
    let html = renderSesTemplate(content.htmlBody, {
      name: "Test User",
      company: "Test Co",
      email: parsed.data.to,
    });
    html = injectTracking(html, openToken, linkMap);
    html = finalizeEmailHtml(html, settings, `${SITE_URL}/email/unsubscribe/${unsubToken}`);
    await persistClickTokens(linkMap, {
      campaignId: campaign.campaignId,
      email: parsed.data.to,
    });

    const result = await sendViaSes({
      to: parsed.data.to,
      subject: `[TEST] ${content.subject}`,
      html,
      text: htmlToText(html),
      fromName,
      fromEmail,
      replyTo,
    });

    console.info("[SES] Test email sent", {
      campaignId: campaign.campaignId,
      to: parsed.data.to,
      fromEmail,
      messageId: result.messageId,
    });

    return ok({
      ok: true,
      message: `Test email sent to ${parsed.data.to}`,
      messageId: result.messageId,
    });
  } catch (err) {
    const formatted =
      err instanceof SesSendError
        ? err
        : err instanceof Error && /Failed to load SES settings|EMAIL_CAMPAIGNS|DynamoDB|ResourceNotFound/i.test(err.message)
          ? err
          : formatSesError(err);
    const message = formatted.message;

    console.error("[SES] sendTest failed", {
      campaignId: parsed.data.campaignId,
      to: parsed.data.to,
      code: formatted instanceof SesSendError ? formatted.code : undefined,
      httpStatusCode: formatted instanceof SesSendError ? formatted.httpStatusCode : undefined,
      message,
      err,
    });

    try {
      await addNotification(`Test email failed: ${message}`, "error");
    } catch (notifyErr) {
      console.error("[SES] Failed to write test-email failure notification", notifyErr);
    }

    if (formatted instanceof SesSendError) {
      return badGateway(message);
    }
    return serverError(message);
  }
}

/** Public tracking — open pixel */
export async function trackOpen(event: APIGatewayProxyEventV2) {
  const token = event.pathParameters?.token;
  if (!token) return notFound();
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.trackOpenPk(token), SK: sesEmailKeys.trackSk() },
    })
  );
  if (res.Item && !res.Item.openedAt) {
    const ua = event.headers?.["user-agent"] ?? event.headers?.["User-Agent"] ?? "";
    const openedAt = now();
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: sesEmailKeys.trackOpenPk(token), SK: sesEmailKeys.trackSk() },
        UpdateExpression: "SET openedAt = :t, userAgent = :ua",
        ExpressionAttributeValues: { ":t": openedAt, ":ua": ua },
      })
    );
    if (res.Item.campaignId) {
      const c = await getCampaign(String(res.Item.campaignId));
      if (c) {
        c.openCount += 1;
        c.updatedAt = openedAt;
        await saveCampaign(c);
      }
      if (res.Item.email) {
        // Do not downgrade clicked → opened
        const recip = await docClient.send(
          new GetCommand({
            TableName: TABLE,
            Key: {
              PK: sesEmailKeys.campaignPk(String(res.Item.campaignId)),
              SK: sesEmailKeys.recipientSk(String(res.Item.email)),
            },
          })
        );
        const current = String(recip.Item?.status ?? "");
        if (current !== "clicked") {
          await updateRecipientStatus(String(res.Item.campaignId), String(res.Item.email), {
            status: "opened",
            openedAt,
          });
        } else {
          await updateRecipientStatus(String(res.Item.campaignId), String(res.Item.email), {
            status: "clicked",
            openedAt,
          });
        }
      }
    }
  }
  // 1x1 gif
  const gif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
    body: gif.toString("base64"),
    isBase64Encoded: true,
  };
}

/** Public tracking — click redirect */
export async function trackClick(event: APIGatewayProxyEventV2) {
  const token = event.pathParameters?.token;
  if (!token) return notFound();
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.trackClickPk(token), SK: sesEmailKeys.trackSk() },
    })
  );
  const target = (res.Item?.targetUrl as string) || SITE_URL;
  if (res.Item) {
    const clickedAt = now();
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: sesEmailKeys.trackClickPk(token), SK: sesEmailKeys.trackSk() },
        UpdateExpression: "SET clickCount = if_not_exists(clickCount, :z) + :one, lastClickedAt = :t",
        ExpressionAttributeValues: { ":z": 0, ":one": 1, ":t": clickedAt },
      })
    );
    if (res.Item.campaignId) {
      const c = await getCampaign(String(res.Item.campaignId));
      if (c) {
        c.clickCount += 1;
        c.updatedAt = clickedAt;
        await saveCampaign(c);
      }
      if (res.Item.email) {
        await updateRecipientStatus(String(res.Item.campaignId), String(res.Item.email), {
          status: "clicked",
          clickedAt,
          openedAt: clickedAt,
        });
      }
    }
  }
  return {
    statusCode: 302,
    headers: { Location: target, "Access-Control-Allow-Origin": "*" },
    body: "",
  };
}

/** Public unsubscribe */
export async function unsubscribe(event: APIGatewayProxyEventV2) {
  const token = event.pathParameters?.token;
  if (!token) return badRequest("Invalid link");
  const res = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.trackOpenPk(token), SK: sesEmailKeys.trackSk() },
    })
  );
  // Also try dedicated unsub tokens stored as TRACKOPEN with type unsubscribe
  const email = (res.Item?.email as string) || "";
  if (email) {
    await upsertSuppression({ email, reason: "unsubscribe", source: "unsubscribe-link" });
    if (res.Item?.campaignId) {
      await updateRecipientStatus(String(res.Item.campaignId), email, {
        status: "unsubscribed",
      });
    }
  }
  return ok({
    message: email
      ? `${email} has been unsubscribed and will not receive future campaign emails.`
      : "Unsubscribe processed.",
  });
}

/** Cron: promote due scheduled campaigns + send queue batches */
export async function processSesEmailJobs() {
  const settings = await loadSettings();
  const results: Record<string, unknown> = { prepared: 0, sent: 0, failed: 0 };

  // 1) Due scheduled → preparing
  const scheduled = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK <= :now",
      ExpressionAttributeValues: {
        ":pk": sesEmailKeys.statusPk("scheduled"),
        ":now": now(),
      },
      Limit: 20,
    })
  );

  for (const item of scheduled.Items ?? []) {
    const campaign = item as SesCampaign;
    campaign.status = "preparing";
    campaign.updatedAt = now();
    await saveCampaign(campaign);
    await enqueueCampaignRecipients(campaign.campaignId);
    campaign.status = "sending";
    campaign.lastRunAt = now();
    campaign.updatedAt = now();
    await saveCampaign(campaign);
    await addNotification(`Campaign started: ${campaign.name}`, "success");
    results.prepared = Number(results.prepared) + 1;
  }

  // Also pick preparing campaigns that need queue built
  const preparing = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.statusPk("preparing") },
      Limit: 10,
    })
  );
  for (const item of preparing.Items ?? []) {
    const campaign = item as SesCampaign;
    await enqueueCampaignRecipients(campaign.campaignId);
    campaign.status = "sending";
    campaign.updatedAt = now();
    await saveCampaign(campaign);
  }

  // 2) Send pending queue respecting rate limits
  const daily = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.dailyCounterPk(dayBucket()), SK: sesEmailKeys.dailyCounterSk() },
    })
  );
  const sentToday = Number(daily.Item?.sentCount ?? 0);
  if (sentToday >= settings.dailyLimit) {
    results.skipped = "daily_limit";
    return results;
  }

  const batchSize = Math.min(settings.batchSize, settings.maxSendRatePerMinute);
  const pending = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.pendingQueuePk() },
      Limit: batchSize,
    })
  );

  for (const item of pending.Items ?? []) {
    const campaignId = String(item.campaignId);
    const email = String(item.email);
    const campaign = await getCampaign(campaignId);
    if (!campaign || campaign.status === "paused" || campaign.status === "cancelled") {
      await deleteQueueItem(campaignId, email);
      continue;
    }
    if (campaign.status !== "sending") continue;
    if (await isSuppressed(email)) {
      await deleteQueueItem(campaignId, email);
      campaign.failedCount += 1;
      await saveCampaign(campaign);
      await updateRecipientStatus(campaignId, email, {
        status: "bounced",
        bouncedAt: now(),
        lastError: "suppressed",
      });
      results.failed = Number(results.failed) + 1;
      continue;
    }

    try {
      await sendQueuedEmail(campaign, item as Record<string, unknown>, settings);
      await deleteQueueItem(campaignId, email);
      const sentAt = now();
      campaign.sentCount += 1;
      campaign.deliveredCount += 1;
      campaign.queuedCount = Math.max(0, campaign.queuedCount - 1);
      campaign.updatedAt = sentAt;
      await saveCampaign(campaign);
      await incrementDailySent();
      await updateRecipientStatus(campaignId, email, {
        status: "delivered",
        sentAt,
        deliveredAt: sentAt,
      });
      results.sent = Number(results.sent) + 1;
    } catch (err) {
      const retries = Number(item.retries ?? 0) + 1;
      const lastError = formatSesError(err).message;
      console.error("[SES] queue send failed", { campaignId, email, retries, lastError, err });
      if (retries >= 3) {
        await deleteQueueItem(campaignId, email);
        campaign.failedCount += 1;
        campaign.queuedCount = Math.max(0, campaign.queuedCount - 1);
        const hardBounce = looksLikeHardBounce(lastError);
        if (hardBounce) {
          campaign.bouncedCount += 1;
          await upsertSuppression({
            email,
            reason: "hard_bounce",
            source: "smtp-send",
            detail: lastError,
          });
          await updateRecipientStatus(campaignId, email, {
            status: "bounced",
            bouncedAt: now(),
            failedAt: now(),
            lastError,
          });
        } else {
          await updateRecipientStatus(campaignId, email, {
            status: "failed",
            failedAt: now(),
            lastError,
          });
        }
        await saveCampaign(campaign);
        results.failed = Number(results.failed) + 1;
      } else {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: {
              PK: sesEmailKeys.campaignPk(campaignId),
              SK: sesEmailKeys.queueSk(email),
            },
            UpdateExpression: "SET retries = :r, lastError = :e",
            ExpressionAttributeValues: {
              ":r": retries,
              ":e": lastError,
            },
          })
        );
      }
    }
  }

  // Mark completed when queue empty
  const sending = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": sesEmailKeys.statusPk("sending") },
      Limit: 50,
    })
  );
  for (const item of sending.Items ?? []) {
    const campaign = item as SesCampaign;
    const q = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": sesEmailKeys.campaignPk(campaign.campaignId),
          ":sk": "QUEUE#",
        },
        Limit: 1,
      })
    );
    if ((q.Items ?? []).length === 0 && campaign.queuedCount === 0) {
      campaign.status = "completed";
      campaign.updatedAt = now();
      await saveCampaign(campaign);
      await addNotification(`Campaign completed: ${campaign.name}`, "success");
    }
  }

  return results;
}

async function enqueueCampaignRecipients(campaignId: string) {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return;

  let lastKey: Record<string, unknown> | undefined;
  let queued = 0;
  do {
    const page = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": sesEmailKeys.campaignPk(campaignId),
          ":sk": "RECIPIENT#",
        },
        ExclusiveStartKey: lastKey,
        Limit: 100,
      })
    );
      for (const r of page.Items ?? []) {
      const email = String(r.email).toLowerCase();
      if (await isSuppressed(email)) continue;
      try {
        await docClient.send(
          new PutCommand({
            TableName: TABLE,
            Item: {
              PK: sesEmailKeys.campaignPk(campaignId),
              SK: sesEmailKeys.queueSk(email),
              GSI1PK: sesEmailKeys.pendingQueuePk(),
              GSI1SK: sesEmailKeys.pendingQueueSk(campaignId, email),
              campaignId,
              email,
              name: r.name,
              company: r.company,
              city: r.city,
              state: r.state,
              country: r.country,
              status: "pending",
              retries: 0,
              createdAt: now(),
            },
            ConditionExpression: "attribute_not_exists(PK)",
          })
        );
        queued += 1;
        await updateRecipientStatus(campaignId, email, { status: "queued" });
      } catch {
        // already queued — skip duplicate
      }
    }
    lastKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  campaign.queuedCount = queued;
  campaign.updatedAt = now();
  await saveCampaign(campaign);
}

async function deleteQueueItem(campaignId: string, email: string) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: {
        PK: sesEmailKeys.campaignPk(campaignId),
        SK: sesEmailKeys.queueSk(email),
      },
    })
  );
}

async function incrementDailySent() {
  const day = dayBucket();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: sesEmailKeys.dailyCounterPk(day), SK: sesEmailKeys.dailyCounterSk() },
      UpdateExpression: "SET sentCount = if_not_exists(sentCount, :z) + :one, updatedAt = :t",
      ExpressionAttributeValues: { ":z": 0, ":one": 1, ":t": now() },
    })
  );
}

async function sendQueuedEmail(
  campaign: SesCampaign,
  recipient: Record<string, unknown>,
  settings: SesSettings
) {
  const email = String(recipient.email);
  const openToken = randomUUID().replace(/-/g, "");
  const unsubToken = randomUUID().replace(/-/g, "");
  const linkMap = new Map<string, string>();

  const content = await resolveCampaignEmailContent(campaign);
  let html = renderSesTemplate(content.htmlBody, {
    name: recipient.name as string | undefined,
    company: recipient.company as string | undefined,
    email,
  });
  html = injectTracking(html, openToken, linkMap);
  html = finalizeEmailHtml(html, settings, `${SITE_URL}/email/unsubscribe/${unsubToken}`);

  // Store open + unsub token (reuse open record for unsub lookup by storing email)
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: sesEmailKeys.trackOpenPk(openToken),
        SK: sesEmailKeys.trackSk(),
        campaignId: campaign.campaignId,
        email,
        type: "open",
        createdAt: now(),
      },
    })
  );
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: sesEmailKeys.trackOpenPk(unsubToken),
        SK: sesEmailKeys.trackSk(),
        campaignId: campaign.campaignId,
        email,
        type: "unsubscribe",
        createdAt: now(),
      },
    })
  );

  await persistClickTokens(linkMap, { campaignId: campaign.campaignId, email });

  await sendViaSes({
    to: email,
    subject: content.subject,
    html,
    text: htmlToText(html),
    fromName: (campaign.senderName || settings.defaultSenderName || "SpicyCenter").trim(),
    fromEmail: (
      campaign.senderEmail ||
      settings.defaultSenderEmail ||
      "email@spicycorner.com"
    ).trim(),
    replyTo: (campaign.replyTo || settings.defaultReplyTo || "").trim() || undefined,
  });

  await updateRecipientStatus(campaign.campaignId, email, {
    status: "sent",
    sentAt: now(),
  });
}

// silence unused import warning for ScanCommand / forbidden / getAuth in some builds
void ScanCommand;
void forbidden;
void getAuth;
