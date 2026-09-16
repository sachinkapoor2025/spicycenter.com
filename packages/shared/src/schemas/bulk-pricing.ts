import { z } from "zod";
import {
  CLEARANCE_CHARGE_INR_MAX,
  CLEARANCE_CHARGE_INR_MIN,
  DEFAULT_BULK_MIN_QTY_KG,
  DEFAULT_CLEARANCE_CHARGE_INR,
  DEFAULT_DESICCANT_FEE_HIGH_INR,
  DEFAULT_DESICCANT_FEE_STANDARD_INR,
  DEFAULT_DOCUMENTATION_FEE_EUR,
  DEFAULT_DOCUMENTATION_FEE_GBP,
  DEFAULT_MARKUP_PERCENT,
  DEFAULT_SAMPLE_FEE_EUR,
  DEFAULT_SAMPLE_FEE_GBP,
  DEFAULT_SHIPPING_INR_PER_KG_UK,
  DEFAULT_TESTING_CHARGE_INR,
} from "../lib/agmarknet-commodities";
import { DEFAULT_FREIGHT_TIERS } from "../lib/freight-tiers";

export const bulkDestinationSchema = z.enum(["UK", "EU"]);
export type BulkDestination = z.infer<typeof bulkDestinationSchema>;

export const spiceFormBulkSchema = z.enum(["whole", "ground"]);
export type SpiceFormBulk = z.infer<typeof spiceFormBulkSchema>;

export const moistureSensitivitySchema = z.enum(["standard", "high"]);
export type MoistureSensitivity = z.infer<typeof moistureSensitivitySchema>;

export const moistureTreatmentPricingSchema = z.object({
  desiccant_fee_standard_inr: z.number().min(0).default(DEFAULT_DESICCANT_FEE_STANDARD_INR),
  desiccant_fee_high_inr: z.number().min(0).default(DEFAULT_DESICCANT_FEE_HIGH_INR),
});
export type MoistureTreatmentPricing = z.infer<typeof moistureTreatmentPricingSchema>;

export const freightTiersSchema = z.object({
  lcl_max_kg: z.number().positive().default(DEFAULT_FREIGHT_TIERS.lcl_max_kg),
  payload_20ft_kg: z.number().positive().default(DEFAULT_FREIGHT_TIERS.payload_20ft_kg),
  payload_40ft_kg: z.number().positive().default(DEFAULT_FREIGHT_TIERS.payload_40ft_kg),
});
export type FreightTiersConfig = z.infer<typeof freightTiersSchema>;

export const BULK_SHIPPING_ADVICE_CLOSER =
  "All shipments include mandatory phytosanitary certification and fumigation compliance, as required for plant-derived exports under Indian and UK customs regulations.";

export const BULK_ODOR_SEGREGATION_NOTE =
  "We never load spices alongside chemical or rubber cargo, as spices readily absorb foreign odors.";

export function defaultAdvisoryNote(spiceName: string, form: SpiceFormBulk): string {
  if (form === "ground") {
    return `${spiceName} is moisture-sensitive and prone to clumping on long, humid sea routes. Every shipment is treated with calibrated calcium-chloride desiccants and packed in food-grade multi-wall bags with a moisture barrier liner.`;
  }
  return `${spiceName} is shipped whole in food-grade packaging with standard desiccant protection appropriate for stable, low-moisture-risk cargo.`;
}

export function resolvedAdvisoryNote(spiceName: string, form: SpiceFormBulk, advisoryNote?: string | null): string {
  const custom = advisoryNote?.trim();
  return custom || defaultAdvisoryNote(spiceName, form);
}

export function moistureFeeInr(sensitivity: MoistureSensitivity, pricing: MoistureTreatmentPricing): number {
  return sensitivity === "high" ? pricing.desiccant_fee_high_inr : pricing.desiccant_fee_standard_inr;
}

export const bulkEnquiryStatusSchema = z.enum(["new", "quoted", "converted", "lost", "paid_addons"]);
export type BulkEnquiryStatus = z.infer<typeof bulkEnquiryStatusSchema>;

export const bulkPricingSpiceSchema = z.object({
  spice_id: z.string().min(1),
  spice_name: z.string().min(1),
  /** Admin override INR/kg. Blank/null → Agmarknet LATEST × markup. Never show raw mandi to customers. */
  base_price_inr_per_kg: z.number().positive().nullable().optional(),
  markup_percent: z.number().min(0).max(200).default(DEFAULT_MARKUP_PERCENT),
  shipping_rate_inr_per_kg_uk: z.number().min(0).default(DEFAULT_SHIPPING_INR_PER_KG_UK),
  shipping_rate_inr_per_kg_eu: z.number().min(0).default(DEFAULT_SHIPPING_INR_PER_KG_UK),
  clearance_charge_inr: z
    .number()
    .min(CLEARANCE_CHARGE_INR_MIN)
    .max(CLEARANCE_CHARGE_INR_MAX)
    .default(DEFAULT_CLEARANCE_CHARGE_INR),
  testing_charge_inr: z.number().min(0).default(DEFAULT_TESTING_CHARGE_INR),
  min_bulk_qty_kg: z.number().min(1).default(DEFAULT_BULK_MIN_QTY_KG),
  needsChaQuoteConfirmation: z.boolean().default(true),
  spice_form: spiceFormBulkSchema.default("whole"),
  moisture_sensitivity: moistureSensitivitySchema.default("standard"),
  advisory_note: z.string().default(""),
});
export type BulkPricingSpice = z.infer<typeof bulkPricingSpiceSchema>;

export const addOnPricingSchema = z.object({
  sample_fee_gbp: z.number().min(0).default(DEFAULT_SAMPLE_FEE_GBP),
  sample_fee_eur: z.number().min(0).default(DEFAULT_SAMPLE_FEE_EUR),
  documentation_handling_fee_gbp: z.number().min(0).default(DEFAULT_DOCUMENTATION_FEE_GBP),
  documentation_handling_fee_eur: z.number().min(0).default(DEFAULT_DOCUMENTATION_FEE_EUR),
});
export type AddOnPricing = z.infer<typeof addOnPricingSchema>;

export const fxCacheSchema = z.object({
  inr_gbp: z.number().positive(),
  inr_eur: z.number().positive(),
  fetched_at: z.string(),
  source: z.string(),
});
export type FxCache = z.infer<typeof fxCacheSchema>;

export const bulkQuoteBreakdownSchema = z.object({
  spiceId: z.string(),
  spiceName: z.string(),
  qtyKg: z.number(),
  destination: bulkDestinationSchema,
  unitPriceInrPerKg: z.number().positive(),
  spiceCostInr: z.number(),
  shippingCostInr: z.number(),
  shippingCostDisplay: z.number(),
  clearanceChargeInr: z.number(),
  testingChargeInr: z.number(),
  moistureTreatmentInr: z.number(),
  subtotalInr: z.number(),
  containerRecommendation: z.object({
    tier: z.enum(["LCL", "FCL"]),
    sizeFt: z.union([z.literal(20), z.literal(40)]).nullable(),
    containerCount: z.number().int().min(0),
    label: z.string(),
    explanation: z.string(),
  }),
  advisoryNote: z.string(),
  spiceForm: spiceFormBulkSchema,
  moistureSensitivity: moistureSensitivitySchema,
  fxInrGbp: z.number().positive(),
  fxInrEur: z.number().positive(),
  estimatedGbp: z.number(),
  estimatedEur: z.number(),
  displayCurrency: z.enum(["GBP", "EUR"]),
  estimatedDisplay: z.number(),
  priceSource: z.enum(["admin_override", "agmarknet_markup"]),
  sampleSelected: z.boolean(),
  documentationSelected: z.boolean(),
  sampleFeeDisplay: z.number(),
  documentationFeeDisplay: z.number(),
  addOnsTotalDisplay: z.number(),
  grandTotalDisplay: z.number(),
  pricingAvailable: z.literal(true),
});
export type BulkQuoteBreakdown = z.infer<typeof bulkQuoteBreakdownSchema>;

export type BulkQuoteUnavailable = {
  pricingAvailable: false;
  spiceId: string;
  spiceName: string;
  message: string;
};

export type BulkQuoteResult = BulkQuoteBreakdown | BulkQuoteUnavailable;

export const bulkEnquiryContactSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  country: z.string().min(2),
  companyName: z.string().optional(),
  vatEori: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  incoterm: z.enum(["FOB", "CIF"]).optional(),
});
export type BulkEnquiryContact = z.infer<typeof bulkEnquiryContactSchema>;
