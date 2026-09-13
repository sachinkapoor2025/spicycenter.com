/**
 * Admin analytics calendar timezone.
 * Operators are IST-based; event GSI keys remain UTC — we expand each IST day
 * to the overlapping UTC day buckets for queries.
 */
export const ADMIN_ANALYTICS_TIMEZONE = "Asia/Kolkata";
/** IST has no DST — fixed offset for day boundaries. */
export const ADMIN_ANALYTICS_UTC_OFFSET = "+05:30";

/** YYYY-MM-DD in the admin analytics timezone (default Asia/Kolkata). */
export function businessDayKey(
  date: Date = new Date(),
  timeZone: string = ADMIN_ANALYTICS_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Trailing N business days (newest first), including today in that timezone. */
export function rangeBusinessDays(
  days: number,
  timeZone: string = ADMIN_ANALYTICS_TIMEZONE
): string[] {
  const n = Math.max(1, Math.floor(days));
  const out: string[] = [];
  const today = businessDayKey(new Date(), timeZone);
  // Noon on that business day avoids edge ambiguity when stepping back.
  let cursor = new Date(`${today}T12:00:00${ADMIN_ANALYTICS_UTC_OFFSET}`);
  for (let i = 0; i < n; i++) {
    out.push(businessDayKey(cursor, timeZone));
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return out;
}

/** Inclusive business-day list from → to (chronological). */
export function businessDaysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = new Date(`${from}T12:00:00${ADMIN_ANALYTICS_UTC_OFFSET}`);
  const end = new Date(`${to}T12:00:00${ADMIN_ANALYTICS_UTC_OFFSET}`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return days;
  while (cursor.getTime() <= end.getTime()) {
    days.push(businessDayKey(cursor));
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return days;
}

/**
 * UTC YYYY-MM-DD GSI day buckets that overlap the given Asia/Kolkata business days.
 * Needed because events are stored under UTC dayBucket keys.
 */
export function utcDayBucketsForBusinessDays(businessDays: string[]): string[] {
  const utc = new Set<string>();
  for (const day of businessDays) {
    const start = new Date(`${day}T00:00:00${ADMIN_ANALYTICS_UTC_OFFSET}`);
    const end = new Date(`${day}T23:59:59.999${ADMIN_ANALYTICS_UTC_OFFSET}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    utc.add(start.toISOString().slice(0, 10));
    utc.add(end.toISOString().slice(0, 10));
  }
  return [...utc].sort();
}

/** Map an instant to an IST (or configured TZ) calendar day for charts. */
export function instantToBusinessDay(
  iso: string | undefined,
  timeZone: string = ADMIN_ANALYTICS_TIMEZONE
): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return businessDayKey(d, timeZone);
}
