/** Early Bird promo: fixed 15% off until end of this calendar day (America/New_York). */
export const EARLY_BIRD_DISCOUNT_PERCENT = 15 as const;

/** Last day the Early Bird popup / coupon claim is available (inclusive). */
export const EARLY_BIRD_ENDS_DATE = "2026-08-10";

/**
 * Latest customer-selectable scheduled delivery date (inclusive).
 * Stored as YYYY-MM-DD in America/New_York calendar terms.
 */
export const SCHEDULE_DELIVERY_MAX_DATE = "2026-08-28";

/** Coupon validity window for Early Bird / welcome codes (hours). */
export const WELCOME_COUPON_HOURS = 1;

/** Calendar day key in America/New_York (YYYY-MM-DD). */
export function calendarDayKeyAmericaNy(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** True while Early Bird claims are still allowed (through EARLY_BIRD_ENDS_DATE inclusive). */
export function isEarlyBirdPromoActive(date = new Date()): boolean {
  return calendarDayKeyAmericaNy(date) <= EARLY_BIRD_ENDS_DATE;
}

/** Min selectable delivery date = today (America/New_York). */
export function scheduleDeliveryMinDate(date = new Date()): string {
  return calendarDayKeyAmericaNy(date);
}

export function isValidScheduleDeliveryDate(
  value: string,
  now = new Date()
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const min = scheduleDeliveryMinDate(now);
  return value >= min && value <= SCHEDULE_DELIVERY_MAX_DATE;
}

/** ISO timestamp at end of the selected America/New_York calendar day (approx 23:59:59.999 ET). */
export function preferredDeliveryDateToIso(dateYmd: string): string {
  // Store noon UTC on that date so vendor APIs get a stable calendar day.
  return `${dateYmd}T16:00:00.000Z`;
}
