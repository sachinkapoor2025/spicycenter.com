import { z } from "zod";
import {
  buildPremiumMarketingEmailHtml,
  DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT,
  PREMIUM_MARKETING_EMAIL_LAYOUT,
  type MarketingEmailContent,
} from "../lib/marketing-email-html";

export const SES_CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "preparing",
  "sending",
  "paused",
  "completed",
  "cancelled",
  "failed",
] as const;

export type SesCampaignStatus = (typeof SES_CAMPAIGN_STATUSES)[number];

export const SES_RECURRENCE_TYPES = ["none", "daily", "weekly", "monthly", "cron"] as const;
export type SesRecurrenceType = (typeof SES_RECURRENCE_TYPES)[number];

export const SES_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "Europe/London",
  "Australia/Sydney",
] as const;

export const DEFAULT_SENDER_MESSAGE_FOOTER = {
  companyName: "SpicyCorner / Divit Global Ventures",
  companyAddress: "California, United States",
  contactEmail: "order@spicycorner.com",
  privacyUrl: "https://www.spicycenter.com/privacy",
} as const;

export const sesRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  company: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
});

export const createSesCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(200).optional(),
  senderName: z.string().min(1).max(80).optional(),
  senderEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  htmlBody: z.string().max(500_000).optional(),
  templateId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  timezone: z.enum(SES_TIMEZONES).optional(),
  recurrenceType: z.enum(SES_RECURRENCE_TYPES).optional(),
  recurrenceExpression: z.string().max(120).optional(),
});

export const updateSesCampaignSchema = createSesCampaignSchema.partial().extend({
  status: z.enum(SES_CAMPAIGN_STATUSES).optional(),
  action: z.enum(["pause", "resume", "cancel", "send_now", "duplicate"]).optional(),
});

export const uploadSesRecipientsSchema = z.object({
  campaignId: z.string().min(1),
  recipients: z.array(sesRecipientSchema).min(1).max(50_000),
});

const marketingEmailCategorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(200),
  imageUrl: z.string().url().max(500),
  href: z.string().url().max(500),
  buttonText: z.string().min(1).max(40),
});

const marketingEmailPromiseSchema = z.object({
  icon: z.string().min(1).max(16),
  title: z.string().min(1).max(80),
  description: z.string().max(160),
});

/** Editable fields for structured premium marketing templates (Admin form). */
export const marketingEmailContentSchema = z.object({
  preheader: z.string().max(200),
  logoUrl: z.string().url().max(500),
  logoHref: z.string().url().max(500),
  logoAlt: z.string().max(160),
  heroImageUrl: z.string().url().max(500),
  heroImageAlt: z.string().max(200),
  heroImageHref: z.string().url().max(500),
  heroOverlayTitle: z.string().max(80),
  heroOverlaySubtitle: z.string().max(160),
  heroButtonText: z.string().min(1).max(40),
  heroButtonHref: z.string().url().max(500),
  heading: z.string().min(1).max(160),
  description: z.string().max(600),
  categoriesHeading: z.string().max(80),
  categoriesSubheading: z.string().max(160),
  categories: z.array(marketingEmailCategorySchema).min(1).max(4),
  promiseHeading: z.string().max(80),
  promiseSubheading: z.string().max(160),
  promises: z.array(marketingEmailPromiseSchema).min(1).max(8),
  midCtaHeading: z.string().max(120),
  midCtaDescription: z.string().max(240),
  midCtaButtonText: z.string().min(1).max(40),
  midCtaButtonHref: z.string().url().max(500),
  footerTagline: z.string().max(120),
  websiteUrl: z.string().url().max(500),
  websiteLabel: z.string().max(80),
  orderEmail: z.string().email().max(120),
  facebookUrl: z.string().url().max(500),
  facebookIconUrl: z.string().url().max(500),
  instagramUrl: z.string().url().max(500),
  instagramIconUrl: z.string().url().max(500),
  copyrightText: z.string().max(120),
  unsubscribeLabel: z.string().max(40),
});

export type MarketingEmailContentInput = z.infer<typeof marketingEmailContentSchema>;

const sesTemplateFieldsSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(200),
  /** Required unless contentFields is provided (HTML is then generated). */
  htmlBody: z.string().max(500_000).optional(),
  /** Optional stable id for starter/seed templates (e.g. raksha-bandhan-usa). */
  templateId: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "templateId must be lowercase letters, numbers, or hyphens")
    .optional(),
  /** Structured layout — enables Admin visual editor without editing HTML. */
  layout: z.literal(PREMIUM_MARKETING_EMAIL_LAYOUT).optional(),
  contentFields: marketingEmailContentSchema.optional(),
});

export const createSesTemplateSchema = sesTemplateFieldsSchema.superRefine((val, ctx) => {
  if (!val.htmlBody?.trim() && !val.contentFields) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "htmlBody or contentFields is required",
      path: ["htmlBody"],
    });
  }
});

export const updateSesTemplateSchema = sesTemplateFieldsSchema.partial();

/** Resolve HTML for a template: prefer rebuilding from contentFields when present. */
export function resolveSesTemplateHtml(input: {
  htmlBody?: string;
  layout?: string;
  contentFields?: MarketingEmailContent | MarketingEmailContentInput | null;
}): string {
  if (input.contentFields && input.layout === PREMIUM_MARKETING_EMAIL_LAYOUT) {
    return buildPremiumMarketingEmailHtml(input.contentFields as MarketingEmailContent);
  }
  if (input.contentFields && !input.htmlBody?.trim()) {
    return buildPremiumMarketingEmailHtml(input.contentFields as MarketingEmailContent);
  }
  return input.htmlBody?.trim() || buildPremiumMarketingEmailHtml(DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT);
}

export const sesSettingsSchema = z.object({
  awsRegion: z.string().min(2).max(40).default("us-east-1"),
  defaultSenderName: z.string().min(1).max(80).default("SpicyCorner"),
  defaultSenderEmail: z.string().email().default("order@spicycorner.com"),
  defaultReplyTo: z.string().email().default("order@spicycorner.com"),
  dailyLimit: z.number().int().min(1).max(200_000).default(50_000),
  maxSendRatePerMinute: z.number().int().min(1).max(14_000).default(600),
  batchSize: z.number().int().min(1).max(500).default(50),
  delayBetweenBatchesMs: z.number().int().min(0).max(60_000).default(5000),
  concurrentWorkers: z.number().int().min(1).max(10).default(5),
  companyName: z.string().max(120).optional(),
  companyAddress: z.string().max(240).optional(),
  contactEmail: z.string().email().optional(),
  privacyUrl: z.string().url().optional(),
  adminNotifyEmail: z.string().email().optional(),
  /**
   * Marketing transport. Default smtp — SES account may be suspended.
   * Transactional order mail still uses separate SMTP_* env (email.ts).
   */
  marketingTransport: z.enum(["smtp", "ses"]).default("smtp"),
  smtpHost: z.string().max(200).optional().or(z.literal("")),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  /** true = SMTPS (465); false = STARTTLS (typically 587). */
  smtpSecure: z.coerce.boolean().default(false),
  smtpUser: z.string().max(200).optional().or(z.literal("")),
  /** Stored in Dynamo settings; never returned in full by GET (redacted). */
  smtpPassword: z.string().max(500).optional().or(z.literal("")),
});

export const suppressEmailSchema = z.object({
  email: z.string().email(),
  reason: z.enum(["manual", "hard_bounce", "complaint", "unsubscribe"]).default("manual"),
});

/** Per-recipient lifecycle for marketing campaigns (stored on RECIPIENT# rows). */
export const SES_RECIPIENT_STATUSES = [
  "ready",
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "failed",
  "bounced",
  "unsubscribed",
] as const;
export type SesRecipientStatus = (typeof SES_RECIPIENT_STATUSES)[number];

export type SesRecipientActivity = {
  email: string;
  name?: string;
  campaignId: string;
  campaignName?: string;
  status: SesRecipientStatus | string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  failedAt?: string;
  lastError?: string;
  /** Clicked a tracked link in the email (visited site via campaign). */
  visitedSite: boolean;
  /** Matched a store order email after the campaign send. */
  placedOrder: boolean;
  orderId?: string;
};

export const sendTestEmailSchema = z.object({
  campaignId: z.string().min(1),
  to: z.string().email(),
});

export type SesRecipient = z.infer<typeof sesRecipientSchema>;
export type CreateSesCampaignInput = z.infer<typeof createSesCampaignSchema>;
export type UpdateSesCampaignInput = z.infer<typeof updateSesCampaignSchema>;
export type CreateSesTemplateInput = z.infer<typeof createSesTemplateSchema>;
export type UpdateSesTemplateInput = z.infer<typeof updateSesTemplateSchema>;
export type SesSettings = z.infer<typeof sesSettingsSchema>;
export type SesTemplate = {
  templateId: string;
  name: string;
  subject: string;
  htmlBody: string;
  layout?: typeof PREMIUM_MARKETING_EMAIL_LAYOUT;
  contentFields?: MarketingEmailContentInput;
  createdAt: string;
  updatedAt: string;
};

export type SesCampaign = {
  campaignId: string;
  name: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  htmlBody: string;
  templateId?: string;
  status: SesCampaignStatus;
  scheduledAt?: string;
  timezone: string;
  recurrenceType: SesRecurrenceType;
  recurrenceExpression?: string;
  nextRunAt?: string;
  lastRunAt?: string;
  recipientCount: number;
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  bouncedCount: number;
  complaintCount: number;
  openCount: number;
  clickCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

/** Basic email format check for client-side CSV preview. */
export function isValidSesEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Replace {{name}}, {{company}}, {{email}} placeholders. */
export function renderSesTemplate(
  html: string,
  vars: { name?: string; company?: string; email?: string }
): string {
  return html
    .replace(/\{\{\s*name\s*\}\}/gi, vars.name?.trim() || "there")
    .replace(/\{\{\s*company\s*\}\}/gi, vars.company?.trim() || "")
    .replace(/\{\{\s*email\s*\}\}/gi, vars.email?.trim() || "");
}
