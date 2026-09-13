import { z } from "zod";

export const leadCaptureSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  name: z.string().optional(),
  /** Partial emails while typing are allowed; server keeps only valid addresses on profile. */
  email: z.string().max(254).optional(),
  phone: z.string().optional(),
  page: z.string().optional(),
  productSlug: z.string().optional(),
  source: z.enum(["checkout", "newsletter", "product", "browse", "admin", "contact", "chat", "review"]).default("browse"),
  metadata: z.record(z.string()).optional(),
});

export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  FOLLOW_UP: "follow_up",
  CONVERTED: "converted",
} as const;

export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];

export const leadStatusSchema = z.enum([
  LEAD_STATUS.NEW,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.FOLLOW_UP,
  LEAD_STATUS.CONVERTED,
]);

export const updateLeadSchema = z.object({
  sessionId: z.string().min(1),
  createdAt: z.string().min(1),
  leadStatus: leadStatusSchema.optional(),
  adminNotes: z.string().max(2000).optional(),
  assignedTo: z.string().max(120).optional(),
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
};
