const STORAGE_KEY = "spicycorner_welcome_coupon";

export type StoredWelcomeCoupon = {
  code: string;
  expiresAt: string;
  discountPercent: number;
  email?: string;
  phone?: string;
};

export function saveWelcomeCoupon(coupon: StoredWelcomeCoupon): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupon));
}

export function loadWelcomeCoupon(): StoredWelcomeCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWelcomeCoupon;
    if (!parsed.code || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearWelcomeCoupon(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function formatCouponExpiry(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
