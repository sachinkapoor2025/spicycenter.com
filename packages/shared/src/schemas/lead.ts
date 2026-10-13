import { z } from "zod";

export const LEAD_SOURCES = [
  "checkout",
  "newsletter",
  "product",
  "browse",
  "admin",
  "contact",
  "chat",
  "review",
  "wholesale",
  "catalogue-enquiry",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_NOTIFY_STATUS = {
  SENT: "sent",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

export type LeadNotifyStatus = (typeof LEAD_NOTIFY_STATUS)[keyof typeof LEAD_NOTIFY_STATUS];

/** Reject oversized POST /leads bodies before parse/persist. */
export const LEAD_CAPTURE_MAX_BODY_BYTES = 16 * 1024;

export function isLeadCaptureBodyTooLarge(length: number): boolean {
  return length > LEAD_CAPTURE_MAX_BODY_BYTES;
}

export const leadCaptureSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  name: z.string().optional(),
  /** Partial emails while typing are allowed; server keeps only valid addresses on profile. */
  email: z.string().max(254).optional(),
  phone: z.string().optional(),
  page: z.string().optional(),
  productSlug: z.string().optional(),
  source: z.enum(LEAD_SOURCES).default("browse"),
  metadata: z.record(z.string()).optional(),
});

export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  FOLLOW_UP: "follow_up",
  QUALIFIED: "qualified",
  QUOTATION_SENT: "quotation_sent",
  NEGOTIATION: "negotiation",
  CONVERTED: "converted",
  WON: "won",
  LOST: "lost",
  SPAM: "spam",
  CLOSED: "closed",
} as const;

export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];

export const leadStatusSchema = z.enum([
  LEAD_STATUS.NEW,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.FOLLOW_UP,
  LEAD_STATUS.QUALIFIED,
  LEAD_STATUS.QUOTATION_SENT,
  LEAD_STATUS.NEGOTIATION,
  LEAD_STATUS.CONVERTED,
  LEAD_STATUS.WON,
  LEAD_STATUS.LOST,
  LEAD_STATUS.SPAM,
  LEAD_STATUS.CLOSED,
]);

export const updateLeadSchema = z.object({
  sessionId: z.string().min(1),
  createdAt: z.string().min(1),
  leadStatus: leadStatusSchema.optional(),
  adminNotes: z.string().max(2000).optional(),
  assignedTo: z.string().max(120).optional(),
});

/** Identifies a stored lead by its DynamoDB key: PK SESSION#sessionId / SK LEAD#createdAt. */
export const retryLeadEmailSchema = z.object({
  sessionId: z.string().min(1),
  createdAt: z.string().min(1),
});

export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export type Lead = LeadCaptureInput & {
  leadId: string;
  createdAt: string;
  updatedAt: string;
  leadStatus?: LeadStatus;
  adminNotes?: string;
  assignedTo?: string;
  notifyEmailStatus?: LeadNotifyStatus;
  notifyEmailAt?: string;
  notifyEmailError?: string;
};

/** Admin notification is required before the buyer is told a catalogue/contact/wholesale/review submit succeeded. */
export function isLeadAdminNotifyRequired(source: string, hasBuyerEmail: boolean): boolean {
  return (
    source === "contact" ||
    source === "review" ||
    source === "wholesale" ||
    source === "catalogue-enquiry" ||
    (source === "newsletter" && hasBuyerEmail)
  );
}

/** True when notifyAdminLead has a real admin-mail payload (not a silent browse capture). */
export function leadHasRetryableNotifyPayload(lead: {
  source?: string;
  name?: string;
  email?: string;
  metadata?: Record<string, string>;
}): boolean {
  const message = lead.metadata?.message?.trim();
  if (lead.source === "catalogue-enquiry") return true;
  if (lead.source === "wholesale" && lead.email?.trim()) return true;
  if (lead.source === "contact" && lead.name?.trim() && lead.email?.trim() && message) return true;
  if (lead.source === "review" && message) return true;
  if (lead.source === "newsletter" && lead.email?.trim()) return true;
  return Boolean(message);
}
