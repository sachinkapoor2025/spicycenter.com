/** From-address / SMTP login for cart, payment, and order-status mail. */
export const ORDER_SMTP_USER = "order@spicycorner.com";

/**
 * Staff copies of cart/checkout, paid, and status emails.
 * Always unioned with NOTIFY_EMAIL so a stale Lambda env cannot drop inboxes.
 */
export const DEFAULT_ORDER_NOTIFY_EMAILS = [
  "order@spicycorner.com",
  "order@usarakhi.com",
  "priya.yadav@mydgv.com",
] as const;

export const DEFAULT_ORDER_NOTIFY_EMAIL = DEFAULT_ORDER_NOTIFY_EMAILS.join(",");

export function parseNotifyEmails(
  raw: string | undefined,
  fallback: readonly string[] = DEFAULT_ORDER_NOTIFY_EMAILS
): string[] {
  const source = raw?.trim() ? raw : fallback.join(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of source.split(/[,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out.length ? out : [...fallback];
}

/** Staff inboxes: env list plus the required SpicyCorner / UsaRakhi / Priya copies. */
export function staffOrderNotifyEmails(envNotify?: string): string[] {
  return parseNotifyEmails(
    [...parseNotifyEmails(envNotify), ...DEFAULT_ORDER_NOTIFY_EMAILS].join(",")
  );
}
