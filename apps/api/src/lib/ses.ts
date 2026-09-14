import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { sesEmailKeys, sesSettingsSchema, type SesSettings } from "@spicycorner/shared";
import { docClient, EMAIL_CAMPAIGNS_TABLE } from "./db";

const region = process.env.SES_AWS_REGION || process.env.AWS_REGION || "us-east-1";

let client: SESv2Client | null = null;

function getClient(): SESv2Client {
  if (!client) {
    client = new SESv2Client({ region });
  }
  return client;
}

export type SesSendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  configurationSetName?: string;
};

export class SesSendError extends Error {
  readonly code?: string;
  readonly httpStatusCode?: number;

  constructor(message: string, options?: { code?: string; httpStatusCode?: number; cause?: unknown }) {
    super(message);
    this.name = "SesSendError";
    this.code = options?.code;
    this.httpStatusCode = options?.httpStatusCode;
    if (options?.cause !== undefined) {
      try {
        (this as Error & { cause?: unknown }).cause = options.cause;
      } catch {
        // ignore if cause is non-writable on older runtimes
      }
    }
  }
}

/** Build a valid RFC5322 From header value. */
export function formatSesFromAddress(fromName: string, fromEmail: string): string {
  const email = fromEmail.trim();
  const name = fromName.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SesSendError(
      `Invalid From email address "${fromEmail || "(empty)"}". Use a verified sender (e.g. order@spicycorner.com).`
    );
  }
  if (!name) return email;
  const needsQuotes = /[<>,"\\()]/.test(name);
  const safeName = needsQuotes
    ? `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : name;
  return `${safeName} <${email}>`;
}

type AwsLikeError = {
  name?: string;
  message?: string;
  Code?: string;
  $metadata?: { httpStatusCode?: number };
  reason?: string;
};

/** Map AWS SES / SDK failures to actionable operator-facing messages. */
export function formatSesError(err: unknown): SesSendError {
  if (err instanceof SesSendError) return err;

  const e = (err ?? {}) as AwsLikeError;
  const code = e.name || e.Code || "SesError";
  const raw = (e.message || e.reason || (err instanceof Error ? err.message : String(err))).trim();
  const httpStatusCode = e.$metadata?.httpStatusCode;
  const combined = `${code}: ${raw}`;

  if (/MessageRejected/i.test(code) || /MessageRejected/i.test(raw)) {
    return new SesSendError(
      `SES rejected the email (${code}): ${raw}. Confirm the From address/domain is verified in SES (${region}) and the account is out of sandbox (or the recipient is a verified identity).`,
      { code, httpStatusCode, cause: err }
    );
  }
  if (/MailFromDomainNotVerified|EmailAddressNotVerified|not verified/i.test(combined)) {
    return new SesSendError(
      `SES identity not verified (${code}): ${raw}. Verify spicycenter.com and ${process.env.SES_FROM_EMAIL || "order@spicycorner.com"} in Amazon SES (${region}).`,
      { code, httpStatusCode, cause: err }
    );
  }
  if (/AccountSendingPaused|sending.*paused/i.test(combined)) {
    return new SesSendError(
      `SES sending is paused for this account (${code}): ${raw}. Check the SES console reputation dashboard.`,
      { code, httpStatusCode, cause: err }
    );
  }
  if (/ConfigurationSetDoesNotExist|InvalidConfigurationSet|configuration set/i.test(combined)) {
    return new SesSendError(
      `SES configuration set error (${code}): ${raw}. Check the SES_CONFIGURATION_SET environment variable.`,
      { code, httpStatusCode, cause: err }
    );
  }
  if (/AccessDenied|UnauthorizedOperation|not authorized/i.test(combined)) {
    return new SesSendError(
      `SES AccessDenied (${code}): ${raw}. The API Lambda IAM role may be missing sesv2:SendEmail in ${region}.`,
      { code, httpStatusCode, cause: err }
    );
  }
  if (/DailyQuotaExceeded|MaxSendRateExceeded|Throttl/i.test(combined)) {
    return new SesSendError(
      `SES sending limit hit (${code}): ${raw}. Wait and retry, or raise the SES sending quota.`,
      { code, httpStatusCode, cause: err }
    );
  }
  if (/InvalidParameterValue|ValidationException|BadRequest/i.test(combined)) {
    return new SesSendError(`SES rejected the request (${code}): ${raw}`, {
      code,
      httpStatusCode,
      cause: err,
    });
  }

  return new SesSendError(`SES send failed (${code}): ${raw || "Unknown SES error"}`, {
    code,
    httpStatusCode,
    cause: err,
  });
}

type MarketingSmtp = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

type ResolvedTransport =
  | { mode: "smtp"; smtp: MarketingSmtp }
  | { mode: "ses" }
  | { mode: "misconfigured"; message: string };

const PASSWORD_REDACTED = "********";
const CACHE_MS = 30_000;
let transportCache: { at: number; value: ResolvedTransport } | null = null;

/** Call after admin saves settings so the next send picks up new SMTP creds. */
export function clearMarketingTransportCache() {
  transportCache = null;
}

/**
 * Marketing SMTP only — never fall back to transactional SMTP_* credentials.
 * Transactional order mail uses apps/api/src/lib/email.ts (smtp.spicycenter.com).
 * Marketing campaigns use Mailercloud (smtp-prod.mailrcld.com) via MARKETING_SMTP_* / admin settings.
 */
function envMarketingSmtpPass(): string {
  return process.env.MARKETING_SMTP_PASS?.trim() || "";
}

function envMarketingSmtp(): MarketingSmtp | null {
  const pass = envMarketingSmtpPass();
  if (!pass) return null;
  // Host/user default to Mailercloud so only MARKETING_SMTP_PASS is required in Lambda env.
  const host = process.env.MARKETING_SMTP_HOST?.trim() || "smtp-prod.mailrcld.com";
  const user = process.env.MARKETING_SMTP_USER?.trim() || "order@spicycorner.com";
  if (/^(smtp|mail)\.spicycorner\.com$/i.test(host)) return null;
  const port = Number(process.env.MARKETING_SMTP_PORT ?? "587");
  const resolvedPort = Number.isFinite(port) && port > 0 ? port : 587;
  return {
    host,
    port: resolvedPort,
    // Port 587 = STARTTLS; never SMTPS (avoids TLS "wrong version number").
    secure: resolvedPort === 465,
    user,
    pass,
  };
}

function storedMarketingPassword(stored: Partial<SesSettings>): string {
  const raw = stored.smtpPassword?.trim() || "";
  if (!raw || raw === PASSWORD_REDACTED) return "";
  return raw;
}

/** True when Dynamo and/or MARKETING_SMTP_PASS can authenticate Mailercloud. */
export function isMarketingSmtpPasswordAvailable(stored?: Partial<SesSettings>): boolean {
  return Boolean(storedMarketingPassword(stored ?? {}) || envMarketingSmtpPass());
}

async function loadStoredSettings(): Promise<Partial<SesSettings>> {
  try {
    const res = await docClient.send(
      new GetCommand({
        TableName: EMAIL_CAMPAIGNS_TABLE,
        Key: { PK: sesEmailKeys.settingsPk(), SK: sesEmailKeys.settingsSk() },
      })
    );
    return (res.Item?.settings as Partial<SesSettings> | undefined) ?? {};
  } catch (err) {
    console.error("Failed to load marketing email settings", err);
    return {};
  }
}

/**
 * If Lambda has MARKETING_SMTP_PASS but Dynamo settings have no password, persist
 * Mailercloud defaults once so Admin → Settings and campaign sends stay aligned.
 */
async function seedMarketingSmtpPasswordIfNeeded(stored: Partial<SesSettings>): Promise<Partial<SesSettings>> {
  const envPass = envMarketingSmtpPass();
  if (!envPass || storedMarketingPassword(stored)) return stored;

  const port = Number(stored.smtpPort ?? process.env.MARKETING_SMTP_PORT ?? 587);
  const resolvedPort = Number.isFinite(port) && port > 0 ? port : 587;
  const seeded = sesSettingsSchema.parse({
    awsRegion: process.env.SES_AWS_REGION || process.env.AWS_REGION || "us-east-1",
    defaultSenderName: stored.defaultSenderName || "SpicyCenter",
    defaultSenderEmail:
      stored.defaultSenderEmail ||
      process.env.MARKETING_FROM_EMAIL ||
      process.env.SES_FROM_EMAIL ||
      "email@spicycorner.com",
    defaultReplyTo:
      stored.defaultReplyTo ||
      process.env.MARKETING_FROM_EMAIL ||
      process.env.SES_REPLY_TO ||
      "email@spicycorner.com",
    dailyLimit: stored.dailyLimit ?? 50_000,
    maxSendRatePerMinute: stored.maxSendRatePerMinute ?? 600,
    batchSize: stored.batchSize ?? 50,
    delayBetweenBatchesMs: stored.delayBetweenBatchesMs ?? 5000,
    concurrentWorkers: stored.concurrentWorkers ?? 5,
    companyName: stored.companyName,
    companyAddress: stored.companyAddress,
    contactEmail: stored.contactEmail,
    privacyUrl: stored.privacyUrl,
    adminNotifyEmail: stored.adminNotifyEmail,
    marketingTransport: "smtp",
    smtpHost: stored.smtpHost?.trim() || process.env.MARKETING_SMTP_HOST || "smtp-prod.mailrcld.com",
    smtpPort: resolvedPort,
    smtpSecure: resolvedPort === 465,
    smtpUser: stored.smtpUser?.trim() || process.env.MARKETING_SMTP_USER || "order@spicycorner.com",
    smtpPassword: envPass,
  });

  try {
    await docClient.send(
      new PutCommand({
        TableName: EMAIL_CAMPAIGNS_TABLE,
        Item: {
          PK: sesEmailKeys.settingsPk(),
          SK: sesEmailKeys.settingsSk(),
          settings: seeded,
          updatedAt: new Date().toISOString(),
        },
      })
    );
    console.log("[Marketing SMTP] Seeded Mailercloud password from MARKETING_SMTP_PASS into settings");
    return seeded;
  } catch (err) {
    console.error("[Marketing SMTP] Failed to seed settings from env", err);
    return { ...stored, smtpPassword: envPass };
  }
}

async function resolveTransport(): Promise<ResolvedTransport> {
  const nowMs = Date.now();
  if (transportCache && nowMs - transportCache.at < CACHE_MS) {
    return transportCache.value;
  }

  let stored = await loadStoredSettings();
  stored = await seedMarketingSmtpPasswordIfNeeded(stored);
  const mode = (stored.marketingTransport ||
    process.env.MARKETING_TRANSPORT?.trim() ||
    "smtp") as "smtp" | "ses";

  const envSmtp = envMarketingSmtp();
  const host =
    stored.smtpHost?.trim() ||
    process.env.MARKETING_SMTP_HOST?.trim() ||
    "smtp-prod.mailrcld.com";
  const port = Number(stored.smtpPort ?? process.env.MARKETING_SMTP_PORT ?? 587);
  const resolvedPort = Number.isFinite(port) && port > 0 ? port : 587;
  // Never use SMTPS on 587 — that yields TLS "wrong version number" with Mailercloud.
  const secure = resolvedPort === 465;
  const user =
    stored.smtpUser?.trim() ||
    process.env.MARKETING_SMTP_USER?.trim() ||
    "order@spicycorner.com";
  // Prefer admin-stored marketing password; else MARKETING_SMTP_PASS only (never SMTP_PASS).
  const pass = storedMarketingPassword(stored) || envMarketingSmtpPass();

  // Refuse transactional hosts for marketing — order mail uses smtp.spicycenter.com separately.
  const isTransactionalHost = /^(smtp|mail)\.spicycorner\.com$/i.test(host);

  let value: ResolvedTransport;
  if (mode === "smtp" && isTransactionalHost) {
    value = {
      mode: "misconfigured",
      message:
        "Marketing campaigns must use Mailercloud (smtp-prod.mailrcld.com), not transactional SMTP (smtp.spicycenter.com). Update Admin → Email → Settings.",
    };
  } else if (mode === "smtp" && host && user && pass) {
    value = {
      mode: "smtp",
      smtp: {
        host,
        port: resolvedPort,
        secure,
        user,
        pass,
      },
    };
  } else if (mode === "smtp" && envSmtp) {
    value = { mode: "smtp", smtp: envSmtp };
  } else if (mode === "smtp") {
    value = {
      mode: "misconfigured",
      message:
        "Marketing SMTP is not configured. Set Mailercloud host/user/password in Admin → Email → Settings (do not use order-email SMTP).",
    };
  } else {
    value = { mode: "ses" };
  }

  if (value.mode === "misconfigured") {
    console.error("[Marketing SMTP] misconfigured", {
      mode,
      host,
      user,
      hasStoredPassword: Boolean(storedMarketingPassword(stored)),
      hasEnvPassword: Boolean(envMarketingSmtpPass()),
      table: EMAIL_CAMPAIGNS_TABLE,
    });
  }

  transportCache = { at: nowMs, value };
  return value;
}

async function sendViaMarketingSmtp(
  input: SesSendInput,
  smtp: MarketingSmtp
): Promise<{ messageId?: string }> {
  // Auth (smtp.user) can differ from From. Mailercloud requires From = verified Sender ID
  // (e.g. email@spicycorner.com), not necessarily the SMTP login user.
  const fromEmail = (input.fromEmail || smtp.user).trim();
  const fromName = (input.fromName || "SpicyCenter").trim();
  const replyTo = (input.replyTo || fromEmail).trim() || fromEmail;
  if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw new SesSendError(
      `Marketing SMTP failed: invalid From address "${fromEmail || "(empty)"}". Set Default sender email to your verified Mailercloud Sender ID.`,
      { code: "MarketingSmtpInvalidSender" }
    );
  }
  const options: SMTPTransport.Options = {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: !smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  };
  const transporter = nodemailer.createTransport(options);
  try {
    const info = await transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to: input.to,
      replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      envelope: {
        from: fromEmail,
        to: input.to,
      },
    });
    return { messageId: typeof info.messageId === "string" ? info.messageId : undefined };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (/invalid sender|no valid From address/i.test(raw)) {
      throw new SesSendError(
        `Marketing SMTP failed: Mailercloud rejected sender ${fromEmail}. Use a verified Sender ID (e.g. email@spicycorner.com) as Default sender email in Admin → Email → Settings. SMTP login user can stay as provided by Mailercloud. Host: ${smtp.host}`,
        { code: "MarketingSmtpInvalidSender", cause: err }
      );
    }
    if (/535|invalid (login|credentials)|authentication failed/i.test(raw)) {
      throw new SesSendError(
        `Marketing SMTP failed: Invalid login (535). The password saved in Admin is not accepted by Mailercloud for user "${smtp.user}". In Mailercloud → SMTP, click Generate New Password, paste it into Admin → Email → Settings → SMTP password (replace the saved one), confirm the SMTP username matches Mailercloud exactly, Save, then retry Send test. Host: ${smtp.host}:${smtp.port}`,
        { code: "MarketingSmtpAuthFailed", cause: err }
      );
    }
    throw new SesSendError(`Marketing SMTP failed: ${raw}`, {
      code: "MarketingSmtpError",
      cause: err,
    });
  }
}

async function sendViaSesApi(input: SesSendInput): Promise<{ messageId?: string }> {
  const from = formatSesFromAddress(input.fromName, input.fromEmail);
  const configurationSetName =
    input.configurationSetName || process.env.SES_CONFIGURATION_SET || undefined;

  try {
    const result = await getClient().send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [input.to] },
        ReplyToAddresses: input.replyTo?.trim() ? [input.replyTo.trim()] : undefined,
        Content: {
          Simple: {
            Subject: { Data: input.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: input.html, Charset: "UTF-8" },
              ...(input.text
                ? { Text: { Data: input.text, Charset: "UTF-8" } }
                : {}),
            },
          },
        },
        ...(configurationSetName ? { ConfigurationSetName: configurationSetName } : {}),
      })
    );
    return { messageId: result.MessageId };
  } catch (err) {
    const formatted = formatSesError(err);
    console.error("[SES] sendViaSes failed", {
      code: formatted.code,
      httpStatusCode: formatted.httpStatusCode,
      from,
      to: input.to,
      subject: input.subject,
      region,
      configurationSetName: configurationSetName || null,
      message: formatted.message,
      cause: err,
    });
    throw formatted;
  }
}

/**
 * Send one marketing email.
 * Prefer admin/env SMTP (mailrcld) — SES API only when marketingTransport=ses
 * or SMTP is not configured.
 */
export async function sendViaSes(input: SesSendInput): Promise<{ messageId?: string }> {
  const transport = await resolveTransport();
  if (transport.mode === "misconfigured") {
    throw new SesSendError(transport.message, { code: "MarketingSmtpMisconfigured" });
  }
  if (transport.mode === "smtp") {
    try {
      return await sendViaMarketingSmtp(input, transport.smtp);
    } catch (err) {
      if (err instanceof SesSendError) {
        console.error("[Marketing SMTP] send failed", {
          to: input.to,
          subject: input.subject,
          message: err.message,
        });
        throw err;
      }
      const formatted = new SesSendError(
        `Marketing SMTP failed: ${err instanceof Error ? err.message : String(err)}`,
        { code: "MarketingSmtpError", cause: err }
      );
      console.error("[Marketing SMTP] send failed", {
        to: input.to,
        subject: input.subject,
        message: formatted.message,
      });
      throw formatted;
    }
  }
  return sendViaSesApi(input);
}

export function redactSettingsForAdmin(settings: SesSettings): SesSettings {
  const parsed = sesSettingsSchema.parse(settings);
  return {
    ...parsed,
    smtpPassword: parsed.smtpPassword ? PASSWORD_REDACTED : "",
  };
}

export function isRedactedPassword(value?: string | null): boolean {
  return !value || value === PASSWORD_REDACTED;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10_000);
}
