import { z } from "zod";
import {
  CLEARANCE_CHARGE_INR_MAX,
  CLEARANCE_CHARGE_INR_MIN,
  DEFAULT_BULK_MIN_QTY_KG,
  DEFAULT_CLEARANCE_CHARGE_INR,
  DEFAULT_DOCUMENTATION_FEE_EUR,
  DEFAULT_DOCUMENTATION_FEE_GBP,
  DEFAULT_MARKUP_PERCENT,
  DEFAULT_SAMPLE_FEE_EUR,
  DEFAULT_SAMPLE_FEE_GBP,
  DEFAULT_SHIPPING_INR_PER_KG_UK,
  DEFAULT_TESTING_CHARGE_INR,
} from "../lib/agmarknet-commodities";

export const bulkDestinationSchema = z.enum(["UK", "EU"]);
export type BulkDestination = z.infer<typeof bulkDestinationSchema>;

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
  clearanceChargeInr: z.number(),
  testingChargeInr: z.number(),
  subtotalInr: z.number(),
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
