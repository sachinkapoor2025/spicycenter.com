import { z } from "zod";

export const REMINDER_EMAIL_STATUSES = ["show", "deleted"] as const;
export type ReminderEmailStatus = (typeof REMINDER_EMAIL_STATUSES)[number];

export const REMINDER_EMAIL_SOURCES = [
  "lead",
  "visitor",
  "abandoned_cart",
  "welcome_coupon",
  "account",
  "checkout_pending",
  "contact",
  "newsletter",
  "other",
] as const;

export type ReminderEmailSource = (typeof REMINDER_EMAIL_SOURCES)[number];

export const reminderEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  sources: z.array(z.string()).default([]),
  status: z.enum(REMINDER_EMAIL_STATUSES).default("show"),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
  lastReminderSentAt: z.string().optional(),
  reminderCount: z.number().int().min(0).default(0),
});

export type ReminderEmail = z.infer<typeof reminderEmailSchema>;

export const sendReminderEmailsSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
  subject: z.string().min(1).max(200).optional(),
});

export type SendReminderEmailsInput = z.infer<typeof sendReminderEmailsSchema>;

export const DEFAULT_CHECKOUT_NUDGE_SUBJECT =
  "Your spice cart is waiting — complete your SpicyCenter order";

export function defaultCheckoutNudgeHtml(opts: {
  name?: string;
  siteUrl: string;
}): string {
  const greeting = opts.name?.trim() ? `Hi ${opts.name.trim()},` : "Hi there,";
  const shopUrl = `${opts.siteUrl.replace(/\/$/, "")}/products`;
  const checkoutUrl = `${opts.siteUrl.replace(/\/$/, "")}/checkout`;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Georgia,serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#7c1d3a;padding:24px 28px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">SpicyCenter</p>
          <p style="margin:6px 0 0;font-size:13px;color:#fecaca;">Ship spice across the USA</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">${greeting}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
            You started shopping with us but haven’t completed your order yet.
            spice is near — finish checkout so your order arrives on time.
          </p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="${checkoutUrl}" style="display:inline-block;background:#7c1d3a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">
              Complete your order
            </a>
          </p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
            Or browse the collection: <a href="${shopUrl}" style="color:#7c1d3a;">Shop spices</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
            SpicyCenter · Divit Global Ventures<br/>
            You’re receiving this because you shared your email while browsing spicycenter.com.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
