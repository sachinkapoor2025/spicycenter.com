/** From-address / SMTP login for cart, payment, enquiry, and order-status mail. */
export const ORDER_SMTP_USER = "enquiry@spicycenter.com";

/**
 * Staff copies of cart/checkout, paid, enquiry, and status emails.
 * Always unioned with NOTIFY_EMAIL so a stale Lambda env cannot drop inboxes.
 */
export const DEFAULT_ORDER_NOTIFY_EMAILS = ["enquiry@spicycenter.com"] as const;

export const DEFAULT_ORDER_NOTIFY_EMAIL = DEFAULT_ORDER_NOTIFY_EMAILS.join(",");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim, lowercase, validate, and de-duplicate. Blank input yields an empty list. */
export function parseOptionalEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function parseNotifyEmails(
  raw: string | undefined,
  fallback: readonly string[] = DEFAULT_ORDER_NOTIFY_EMAILS
): string[] {
  const source = raw?.trim() ? raw : fallback.join(",");
  const parsed = parseOptionalEmailList(source);
  return parsed.length ? parsed : [...fallback];
}

/**
 * Catalogue-enquiry CC only. Empty when unset, blank, or all invalid.
 * Addresses already in the staff To list are omitted.
 */
export function enquiryCcEmails(raw: string | undefined, toRecipients: readonly string[]): string[] {
  const excluded = new Set(parseOptionalEmailList(toRecipients.join(",")));
  return parseOptionalEmailList(raw).filter((email) => !excluded.has(email));
}

/** Staff inboxes: env list plus the required enquiry mailbox. */
export function staffOrderNotifyEmails(envNotify?: string): string[] {
  return parseNotifyEmails(
    [...parseNotifyEmails(envNotify), ...DEFAULT_ORDER_NOTIFY_EMAILS].join(",")
  );
}
