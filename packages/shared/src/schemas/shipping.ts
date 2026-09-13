import { z } from "zod";

/** Optional deliver-by date used when a shipping quote needs a target day. */
export const DEFAULT_DELIVER_BY_DATE = undefined as string | undefined;

export const USPS_MAIL_CLASSES = {
  GROUND_ADVANTAGE: "USPS_GROUND_ADVANTAGE",
  PRIORITY_MAIL: "PRIORITY_MAIL",
  PRIORITY_MAIL_EXPRESS: "PRIORITY_MAIL_EXPRESS",
  FIRST_CLASS_PACKAGE_SERVICE: "FIRST-CLASS_PACKAGE_SERVICE",
} as const;

export type MailClassKey = keyof typeof USPS_MAIL_CLASSES;

export const DEFAULT_ENABLED_SERVICES: Record<MailClassKey, boolean> = {
  GROUND_ADVANTAGE: true,
  PRIORITY_MAIL: true,
  PRIORITY_MAIL_EXPRESS: false,
  FIRST_CLASS_PACKAGE_SERVICE: true,
};

export const addressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(2).max(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

/** Origin may be incomplete until admin configures fulfillment address. */
export const originAddressSchema = z.object({
  name: z.string().default("SpicyCorner"),
  line1: z.string().default(""),
  line2: z.string().optional(),
  city: z.string().default(""),
  state: z.string().default(""),
  postalCode: z.string().default(""),
  country: z.string().min(2).max(2).default("US"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export const packageDetailsSchema = z.object({
  weightOz: z.number().positive(),
  lengthIn: z.number().positive(),
  widthIn: z.number().positive(),
  heightIn: z.number().positive(),
});

export const DEFAULT_PACKAGE: z.infer<typeof packageDetailsSchema> = {
  weightOz: 8,
  lengthIn: 8,
  widthIn: 6,
  heightIn: 2,
};

export const rateQuoteSchema = z.object({
  rateId: z.string(),
  mailClass: z.string(),
  serviceName: z.string(),
  price: z.number(),
  currency: z.literal("USD").default("USD"),
  estimatedDeliveryDate: z.string().optional(),
  estimatedDeliveryDays: z.number().optional(),
});

export const labelResultSchema = z.object({
  trackingNumber: z.string(),
  labelPdfUrl: z.string().optional(),
  labelCost: z.number().optional(),
  mailClass: z.string().optional(),
  serviceName: z.string().optional(),
});

export const trackingStatusSchema = z.object({
  trackingNumber: z.string(),
  status: z.string(),
  statusDetail: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  events: z
    .array(
      z.object({
        date: z.string(),
        description: z.string(),
        location: z.string().optional(),
      })
    )
    .optional(),
});

export const addressValidationResultSchema = z.object({
  valid: z.boolean(),
  normalized: addressSchema.partial().optional(),
  messages: z.array(z.string()).optional(),
});

export const festivalModeRangeSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliverByDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const shippingSettingsSchema = z.object({
  provider: z.enum(["usps", "shippo"]).default("usps"),
  defaultRatePriority: z.enum(["cheapest", "fastest_by_date"]).default("cheapest"),
  deliverByDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  festivalModeRanges: z.array(festivalModeRangeSchema).default([]),
  enabledServices: z
    .object({
      GROUND_ADVANTAGE: z.boolean().default(true),
      PRIORITY_MAIL: z.boolean().default(true),
      PRIORITY_MAIL_EXPRESS: z.boolean().default(false),
      FIRST_CLASS_PACKAGE_SERVICE: z.boolean().default(true),
    })
    .default(DEFAULT_ENABLED_SERVICES),
  originAddress: originAddressSchema,
  autoPurchaseOnPayment: z.boolean().default(false),
  flatRateFallbackUsd: z.number().positive().default(5.99),
  customerShippingMode: z.enum(["free", "pass_through"]).default("free"),
  uspsBaseUrl: z.string().url().optional(),
});

export const defaultShippingSettings: ShippingSettings = {
  provider: "usps",
  defaultRatePriority: "cheapest",
  deliverByDate: DEFAULT_DELIVER_BY_DATE,
  festivalModeRanges: [],
  enabledServices: { ...DEFAULT_ENABLED_SERVICES },
  originAddress: {
    name: "SpicyCorner UK",
    line1: "5 Exeter Road",
    city: "Southampton",
    state: "Hampshire",
    postalCode: "SO18 2ED",
    country: "GB",
    phone: "",
    email: "support@spicycenter.com",
  },
  autoPurchaseOnPayment: false,
  flatRateFallbackUsd: 5.99,
  customerShippingMode: "free",
};

export type Address = z.infer<typeof addressSchema>;
export type PackageDetails = z.infer<typeof packageDetailsSchema>;
export type RateQuote = z.infer<typeof rateQuoteSchema>;
export type LabelResult = z.infer<typeof labelResultSchema>;
export type TrackingStatus = z.infer<typeof trackingStatusSchema>;
export type AddressValidationResult = z.infer<typeof addressValidationResultSchema>;
export type FestivalModeRange = z.infer<typeof festivalModeRangeSchema>;
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;

export interface PackageItemInput {
  weightOz?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  quantity: number;
}

export interface ProductShippingDims {
  weightOz?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
}

/** Sum weights (× qty) and use max of each dimension as floor; fall back to DEFAULT_PACKAGE. */
export function estimatePackageFromItems(items: PackageItemInput[]): PackageDetails {
  if (!items.length) return { ...DEFAULT_PACKAGE };

  let totalWeightOz = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let maxHeight = 0;
  let hasWeight = false;
  let hasDims = false;

  for (const item of items) {
    const qty = item.quantity ?? 1;
    if (item.weightOz != null && item.weightOz > 0) {
      totalWeightOz += item.weightOz * qty;
      hasWeight = true;
    }
    if (item.lengthIn != null && item.lengthIn > 0) {
      maxLength = Math.max(maxLength, item.lengthIn);
      hasDims = true;
    }
    if (item.widthIn != null && item.widthIn > 0) {
      maxWidth = Math.max(maxWidth, item.widthIn);
      hasDims = true;
    }
    if (item.heightIn != null && item.heightIn > 0) {
      maxHeight = Math.max(maxHeight, item.heightIn);
      hasDims = true;
    }
  }

  return {
    weightOz: hasWeight ? totalWeightOz : DEFAULT_PACKAGE.weightOz,
    lengthIn: hasDims ? Math.max(maxLength, DEFAULT_PACKAGE.lengthIn) : DEFAULT_PACKAGE.lengthIn,
    widthIn: hasDims ? Math.max(maxWidth, DEFAULT_PACKAGE.widthIn) : DEFAULT_PACKAGE.widthIn,
    heightIn: hasDims ? Math.max(maxHeight, DEFAULT_PACKAGE.heightIn) : DEFAULT_PACKAGE.heightIn,
  };
}

export function productHasShippingDims(product: ProductShippingDims): boolean {
  return (
    product.weightOz != null &&
    product.weightOz > 0 &&
    product.lengthIn != null &&
    product.lengthIn > 0 &&
    product.widthIn != null &&
    product.widthIn > 0 &&
    product.heightIn != null &&
    product.heightIn > 0
  );
}

function mailClassToKey(mailClass: string): MailClassKey | undefined {
  const normalized = mailClass.toUpperCase().replace(/-/g, "_");
  for (const [key, value] of Object.entries(USPS_MAIL_CLASSES)) {
    if (value === mailClass || value.replace(/-/g, "_") === normalized || key === normalized) {
      return key as MailClassKey;
    }
  }
  return undefined;
}

function isQuoteEnabled(quote: RateQuote, settings: ShippingSettings): boolean {
  const key = mailClassToKey(quote.mailClass);
  if (!key) return true;
  return settings.enabledServices[key] !== false;
}

function activeFestivalDeliverBy(
  settings: ShippingSettings,
  now: Date
): { deliverByDate: string; festivalName: string } | undefined {
  const today = now.toISOString().slice(0, 10);
  for (const range of settings.festivalModeRanges) {
    if (today >= range.startDate && today <= range.endDate) {
      return { deliverByDate: range.deliverByDate, festivalName: range.name };
    }
  }
  return undefined;
}

function parseDateOnly(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00.000Z`);
}

/** Pick best rate: festival deliver-by → priority mode → enabled services filter. */
export function selectRate(
  quotes: RateQuote[],
  settings: ShippingSettings,
  now: Date = new Date()
): RateQuote | undefined {
  const enabled = quotes.filter((q) => isQuoteEnabled(q, settings));
  if (!enabled.length) return undefined;

  const festival = activeFestivalDeliverBy(settings, now);
  const deliverBy =
    festival?.deliverByDate ??
    (settings.defaultRatePriority === "fastest_by_date" ? settings.deliverByDate : undefined);

  const byPrice = [...enabled].sort((a, b) => a.price - b.price);

  if (deliverBy) {
    const deadline = parseDateOnly(deliverBy);
    const meeting = byPrice.filter((q) => {
      if (!q.estimatedDeliveryDate) return false;
      return parseDateOnly(q.estimatedDeliveryDate) <= deadline;
    });
    if (meeting.length) return meeting[0];
  }

  if (settings.defaultRatePriority === "fastest_by_date") {
    const withDates = enabled.filter((q) => q.estimatedDeliveryDate);
    if (withDates.length) {
      return [...withDates].sort(
        (a, b) =>
          parseDateOnly(a.estimatedDeliveryDate!).getTime() -
          parseDateOnly(b.estimatedDeliveryDate!).getTime()
      )[0];
    }
  }

  return byPrice[0];
}

export function mailClassDisplayName(mailClass: string): string {
  const names: Record<string, string> = {
    USPS_GROUND_ADVANTAGE: "USPS Ground Advantage",
    PRIORITY_MAIL: "USPS Priority Mail",
    PRIORITY_MAIL_EXPRESS: "USPS Priority Mail Express",
    "FIRST-CLASS_PACKAGE_SERVICE": "USPS First-Class Package",
  };
  return names[mailClass] ?? mailClass.replace(/_/g, " ");
}
