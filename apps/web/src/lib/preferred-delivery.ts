import {
  SCHEDULE_DELIVERY_MAX_DATE,
  isValidScheduleDeliveryDate,
  scheduleDeliveryMinDate,
} from "@spicycorner/shared";

const STORAGE_KEY = "spicycorner_preferred_delivery_date";

export function loadPreferredDeliveryDate(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
    if (raw && isValidScheduleDeliveryDate(raw)) return raw;
    if (raw) localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return "";
}

export function savePreferredDeliveryDate(dateYmd: string): void {
  if (typeof window === "undefined") return;
  const trimmed = dateYmd.trim();
  if (!trimmed || !isValidScheduleDeliveryDate(trimmed)) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearPreferredDeliveryDate(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function preferredDeliveryDateBounds(now = new Date()): {
  min: string;
  max: string;
} {
  return {
    min: scheduleDeliveryMinDate(now),
    max: SCHEDULE_DELIVERY_MAX_DATE,
  };
}
