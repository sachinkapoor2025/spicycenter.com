import { z } from "zod";

export const BULK_MINIMUM_KG = 10;

export const spiceFormSchema = z.enum([
  "whole",
  "powder",
  "seeds",
  "flakes",
  "crushed",
  "roasted",
  "leaves",
  "blend",
]);

export const spiceChannelSchema = z.enum(["retail", "bulk"]);

export const verificationStatusSchema = z.enum([
  "verified",
  "requires_manual_verification",
  "draft_pricing",
  "pending_market_data",
]);

export const spiceComplianceSchema = z.object({
  ingredients: z.string(),
  allergens: z.string(),
  netQuantity: z.string().optional(),
  countryOfOrigin: z.string(),
  placeOfOrigin: z.string().optional(),
  countryOfPacking: z.string().optional(),
  packer: z.string(),
  importer: z.string(),
  responsibleFoodBusinessOperator: z.string(),
  bestBefore: z.string(),
  storageConditions: z.string(),
  usageInstructions: z.string(),
  batchNumber: z.string(),
  lotNumber: z.string(),
  nutritionInformation: z.string(),
  certification: z.string(),
  ukImportStatus: z.string(),
  euImportStatus: z.string(),
  requiredDocuments: z.string(),
  testingRequirements: z.string(),
  pesticideTesting: z.boolean().default(false),
  microbiologicalTesting: z.boolean().default(false),
  aflatoxinTesting: z.boolean().default(false),
  residueTesting: z.boolean().default(false),
  certificateRequired: z.boolean().default(false),
  laboratoryTestRequired: z.boolean().default(false),
  lastComplianceReview: z.string().optional(),
});

export const spiceGradeSchema = z.object({
  gradeName: z.string(),
  description: z.string(),
  origin: z.string().optional(),
  processing: z.string().optional(),
  cleaning: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  applies: z.boolean().default(true),
});

export const spiceImageSchema = z.object({
  imageUrl: z.string(),
  sourceUrl: z.string().optional(),
  license: z.string(),
  creator: z.string().optional(),
  attribution: z.string().optional(),
  usageRights: z.string(),
  altText: z.string(),
});

export const spiceEntitySchema = z.object({
  id: z.string(),
  canonicalName: z.string(),
  slug: z.string(),
  commonNames: z.array(z.string()).default([]),
  indianNames: z.array(z.string()).default([]),
  hindiName: z.string().optional(),
  regionalNames: z.array(z.string()).default([]),
  sanskritName: z.string().optional(),
  botanicalName: z.string().optional(),
  botanicalFamily: z.string().optional(),
  description: z.string(),
  shortDescription: z.string(),
  history: z.string().optional(),
  origin: z.string(),
  originRegion: z.string().optional(),
  growingRegions: z.array(z.string()).default([]),
  cultivation: z.string().optional(),
  harvestSeason: z.string().optional(),
  processing: z.string().optional(),
  forms: z.array(spiceFormSchema).default([]),
  flavourProfile: z.string().optional(),
  aromaProfile: z.string().optional(),
  colour: z.string().optional(),
  heatLevel: z.enum(["none", "mild", "medium", "hot", "very_hot"]).optional(),
  culinaryUses: z.array(z.string()).default([]),
  traditionalUses: z.string().optional(),
  storage: z.string().optional(),
  shelfLife: z.string().optional(),
  nutrition: z.string().optional(),
  qualityInformation: z.string().optional(),
  gradeInformation: z.string().optional(),
  exportInformation: z.string().optional(),
  relatedSpiceIds: z.array(z.string()).default([]),
  similarSpiceIds: z.array(z.string()).default([]),
  alternativeSpiceIds: z.array(z.string()).default([]),
  recipeSlugs: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  grades: z.array(spiceGradeSchema).default([]),
  images: z.array(spiceImageSchema).default([]),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  featured: z.boolean().default(false),
  featuredKnowledge: z.boolean().default(false),
  status: z.enum(["active", "draft"]).default("active"),
  verificationStatus: verificationStatusSchema.default("requires_manual_verification"),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  compliance: spiceComplianceSchema.optional(),
});

export const marketPriceSchema = z.object({
  spiceId: z.string(),
  market: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  grade: z.string(),
  minPrice: z.number().nullable(),
  maxPrice: z.number().nullable(),
  averagePrice: z.number().nullable(),
  unit: z.string().default("kg"),
  currency: z.literal("INR").default("INR"),
  priceDate: z.string(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  notes: z.string(),
  verificationStatus: verificationStatusSchema,
});

export const bulkPriceTierSchema = z.object({
  productSlug: z.string(),
  minQuantityKg: z.number(),
  maxQuantityKg: z.number().nullable(),
  pricePerKg: z.number(),
  currency: z.enum(["INR", "GBP", "EUR", "USD"]).default("INR"),
  grade: z.string().optional(),
  packaging: z.string().optional(),
  effectiveFrom: z.string(),
  effectiveUntil: z.string().optional(),
});

export const wholesaleQuoteSchema = z.object({
  company: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  country: z.string().min(2),
  vatNumber: z.string().optional(),
  product: z.string().min(1),
  quantity: z.string().min(1),
  grade: z.string().optional(),
  packaging: z.string().optional(),
  deliveryLocation: z.string().min(1),
  requiredDate: z.string().optional(),
  message: z.string().optional(),
});

export type SpiceEntity = z.infer<typeof spiceEntitySchema>;
export type SpiceCompliance = z.infer<typeof spiceComplianceSchema>;
export type MarketPrice = z.infer<typeof marketPriceSchema>;
export type BulkPriceTier = z.infer<typeof bulkPriceTierSchema>;
export type WholesaleQuote = z.infer<typeof wholesaleQuoteSchema>;
export type SpiceForm = z.infer<typeof spiceFormSchema>;
