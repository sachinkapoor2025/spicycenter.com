import { z } from "zod";
import { calendarDayKeyAmericaNy } from "../lib/early-bird";

/** Early Bird promo helpers (schedule-delivery lives in `lib/schedule-delivery`). */
export {
  EARLY_BIRD_DISCOUNT_PERCENT,
  EARLY_BIRD_ENDS_DATE,
  isEarlyBirdPromoActive,
} from "../lib/early-bird";

/** Discount-of-the-day coupon validity window. */
export const WELCOME_COUPON_HOURS = 1;

/** @deprecated Prefer weighted spin; kept as fallback average. */
export const WELCOME_DISCOUNT_PERCENT = 10;

/** Underlying discount values for each wheel slice (always max 10% for every spin). */
export const DAILY_DEAL_SEGMENTS = [10, 10, 10, 10, 10, 10, 10, 10] as const;

/**
 * Mystery labels shown on the wheel — never reveal the % until the prize reveal.
 * Length must match DAILY_DEAL_SEGMENTS.
 */
export const DAILY_DEAL_WHEEL_LABELS = [
  "Lucky",
  "Surprise",
  "Bonus",
  "Mystery",
  "Lucky",
  "Surprise",
  "Bonus",
  "Mystery",
] as const;

export type DailyDealPercent = 6 | 7 | 8 | 10;

/** Max Discount of the Day offer (every spin). */
export const DAILY_DEAL_MAX_PERCENT: DailyDealPercent = 10;

/**
 * Spin odds — currently always 10% (maximum discount).
 * Weights kept for backward-compatible imports; only 10% is issued.
 */
export const DAILY_DEAL_WEIGHTS: ReadonlyArray<{ percent: DailyDealPercent; weight: number }> = [
  { percent: 10, weight: 100 },
];

export function isValidDailyDealPercent(n: unknown): n is DailyDealPercent {
  return n === 6 || n === 7 || n === 8 || n === 10;
}

/** Always awards the maximum Discount of the Day (10%). */
export function pickDailyDealDiscount(): DailyDealPercent {
  return DAILY_DEAL_MAX_PERCENT;
}

/** Calendar day key in America/New_York for one-spin-per-phone-per-day. */
export function dailyDealDayKey(date = new Date()): string {
  return calendarDayKeyAmericaNy(date);
}

export const couponSourceSchema = z.enum(["welcome", "abandoned", "admin"]);
export type CouponSource = z.infer<typeof couponSourceSchema>;

/** Admin manual abandoned-cart coupons (WhatsApp / phone outreach). */
export const ADMIN_MANUAL_COUPON_HOURS = 1;
/** Default / baseline confirmed-sale discount (also the min for typed special offers). */
export const ADMIN_CONFIRMED_SALE_DISCOUNT_PERCENT = 20;
export const ADMIN_CONFIRMED_SALE_COUPON_HOURS = 24;
/** Manual special offers: whole numbers from 20% through 50%. */
export const ADMIN_EXTREME_DISCOUNT_MIN = 20;
export const ADMIN_EXTREME_DISCOUNT_MAX = 50;
/** Outreach presets (short expiry). */
export const ADMIN_OUTREACH_DISCOUNT_OPTIONS = [7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
/** @deprecated Prefer ADMIN_OUTREACH_DISCOUNT_OPTIONS + typed 20–50%; kept for older UI imports. */
export const ADMIN_COUPON_DISCOUNT_OPTIONS = [
  ...ADMIN_OUTREACH_DISCOUNT_OPTIONS,
  ADMIN_CONFIRMED_SALE_DISCOUNT_PERCENT,
] as const;
export type AdminCouponDiscountPercent = number;

export function isAdminOutreachDiscount(percent: number): boolean {
  return (ADMIN_OUTREACH_DISCOUNT_OPTIONS as readonly number[]).includes(percent);
}

/** 20–50% confirmed / special offers (typed or preset). */
export function isAdminConfirmedSaleDiscount(percent: number): boolean {
  return (
    Number.isInteger(percent) &&
    percent >= ADMIN_EXTREME_DISCOUNT_MIN &&
    percent <= ADMIN_EXTREME_DISCOUNT_MAX
  );
}

/** Above the standard 20% confirmed-sale rate — needs “Extreme discount offered” alert. */
export function isAdminExtremeDiscount(percent: number): boolean {
  return (
    Number.isInteger(percent) &&
    percent > ADMIN_CONFIRMED_SALE_DISCOUNT_PERCENT &&
    percent <= ADMIN_EXTREME_DISCOUNT_MAX
  );
}

export function isAllowedAdminCouponDiscount(percent: number): boolean {
  return isAdminOutreachDiscount(percent) || isAdminConfirmedSaleDiscount(percent);
}

export function adminCouponHoursForDiscount(percent: number): number {
  return isAdminConfirmedSaleDiscount(percent)
    ? ADMIN_CONFIRMED_SALE_COUPON_HOURS
    : ADMIN_MANUAL_COUPON_HOURS;
}

export const createAdminCouponSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .optional()
      .or(z.literal("")),
    /** Local mobile digits only — used for coupon binding / checkout match (no country code). */
    phone: z.string().trim().max(22).optional().or(z.literal("")),
    /** Full E.164 for WhatsApp outreach only; never used for coupon validation. */
    whatsappPhone: z.string().trim().max(22).optional().or(z.literal("")),
    discountPercent: z
      .number()
      .int()
      .refine(isAllowedAdminCouponDiscount, {
        message: "Discount must be 7%–15% (outreach) or 20%–50% (confirmed / special offer)",
      }),
    /**
     * Optional explicit flag. When omitted, 20%–50% is treated as confirmed sale.
     * Confirmed-sale coupons get a longer validity window.
     */
    confirmedSale: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const email = v.email?.trim() ?? "";
    const phoneDigits = (v.phone ?? "").replace(/\D/g, "");
    const hasEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    const hasPhone = phoneDigits.length >= 7 && phoneDigits.length <= 12;
    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a customer email or mobile number",
        path: ["email"],
      });
    }
    if (email && !hasEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address",
        path: ["email"],
      });
    }
    if ((v.phone ?? "").trim() && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid mobile number",
        path: ["phone"],
      });
    }
  });

export type CreateAdminCouponInput = z.infer<typeof createAdminCouponSchema>;

/** Admin end-to-end test coupon: forces items + shipping to $1 USD. */
export const TEST_ORDER_COUPON_MINUTES = 20;
export const TEST_ORDER_FORCE_TOTAL_USD = 1;
export const TEST_ORDER_COUPON_KIND = "test_order" as const;

export const couponKindSchema = z.enum(["percent", "test_order"]);
export type CouponKind = z.infer<typeof couponKindSchema>;

const adminCouponContactFields = {
  email: z.string().trim().max(254).optional().or(z.literal("")),
  /** Local mobile digits only — used for coupon binding / checkout match (no country code). */
  phone: z.string().trim().max(22).optional().or(z.literal("")),
};

function refineAdminCouponContact(
  v: { email?: string; phone?: string },
  ctx: z.RefinementCtx
) {
  const email = v.email?.trim() ?? "";
  const phoneDigits = (v.phone ?? "").replace(/\D/g, "");
  const hasEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  const hasPhone = phoneDigits.length >= 7 && phoneDigits.length <= 12;
  if (!hasEmail && !hasPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a customer email or mobile number",
      path: ["email"],
    });
  }
  if (email && !hasEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid email address",
      path: ["email"],
    });
  }
  if ((v.phone ?? "").trim() && !hasPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid mobile number",
      path: ["phone"],
    });
  }
}

export const createTestOrderCouponSchema = z
  .object(adminCouponContactFields)
  .superRefine(refineAdminCouponContact);

export type CreateTestOrderCouponInput = z.infer<typeof createTestOrderCouponSchema>;

export function isTestOrderCoupon(coupon: { kind?: string } | null | undefined): boolean {
  return coupon?.kind === TEST_ORDER_COUPON_KIND;
}

export const couponSchema = z.object({
  code: z.string(),
  /** Optional when coupon is bound to phone (spin-the-wheel). */
  email: z.string().email().optional(),
  discountPercent: z.number().int().min(1).max(100),
  expiresAt: z.string(),
  createdAt: z.string(),
  sessionId: z.string().optional(),
  usedAt: z.string().optional(),
  orderId: z.string().optional(),
  source: couponSourceSchema,
  dayKey: z.string().optional(),
  /** Customer phone (welcome spin / admin abandoned outreach). */
  phone: z.string().optional(),
  /** Cognito email of admin who created the coupon. */
  createdBy: z.string().email().optional(),
  /**
   * Admin 20%–50% coupons for customers who confirmed they will buy.
   * Longer expiry so the code is less likely to expire unused.
   */
  confirmedSale: z.boolean().optional(),
  /** `test_order` forces checkout total (items + shipping) to $1 USD. */
  kind: couponKindSchema.optional(),
  forceTotalUsd: z.number().positive().optional(),
});

export type StoreCoupon = z.infer<typeof couponSchema>;

export const couponValidateSchema = z
  .object({
    code: z.string().min(4).max(32),
    email: z.string().max(254).optional(),
    phone: z.string().max(40).optional(),
  })
  .refine((v) => Boolean(v.email?.trim()) || Boolean(v.phone?.trim()), {
    message: "Email or phone is required to apply a coupon",
  });

export const welcomeCouponSchema = couponSchema.extend({
  source: z.literal("welcome"),
});

export type CouponValidateInput = z.infer<typeof couponValidateSchema>;
export type WelcomeCoupon = z.infer<typeof welcomeCouponSchema>;

export type CouponValidationResult = {
  valid: boolean;
  code?: string;
  discountPercent?: number;
  expiresAt?: string;
  error?: string;
  kind?: CouponKind;
  forceTotalUsd?: number;
};
