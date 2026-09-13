export type SpiceForm =
  | "whole"
  | "powder"
  | "flakes"
  | "crushed"
  | "roasted"
  | "blend"
  | "threads"
  | "leaves"
  | "root";

export type HeatLevel = "none" | "mild" | "medium" | "hot" | "very-hot";

export type ImageRights = {
  imageUrl: string;
  sourceUrl?: string;
  license: string;
  creator?: string;
  attribution?: string;
  usageRights: string;
  altText: string;
};

export type SpiceEntity = {
  id: string;
  slug: string;
  canonicalName: string;
  commonNames: string[];
  indianNames: string[];
  hindiName: string;
  regionalNames: string[];
  sanskritName?: string;
  botanicalName: string;
  botanicalFamily: string;
  shortDescription: string;
  description: string;
  origin: string;
  growingRegions: string[];
  harvestSeason?: string;
  processing?: string;
  flavourProfile: string;
  aromaProfile: string;
  colour: string;
  heatLevel: HeatLevel;
  culinaryUses: string[];
  traditionalUses: string;
  storage: string;
  shelfLife: string;
  category: string;
  relatedSlugs: string[];
  recipeSlugs: string[];
  aliases: string[];
  forms: SpiceForm[];
  varieties: { slug: string; name: string; region?: string }[];
  grades: string[];
  featured?: boolean;
  needsVerification?: boolean;
};

export type ComplianceRecord = {
  ingredients: string;
  allergens: string;
  netQuantityLabel: string;
  countryOfOrigin: string;
  placeOfPacking: string;
  packer: string;
  importer: string;
  responsibleFoodBusinessOperator: string;
  bestBeforeGuidance: string;
  storageConditions: string;
  usageInstructions: string;
  batchNumber?: string;
  lotNumber?: string;
  nutritionInformation: string;
  certification: string;
  ukImportStatus: string;
  euImportStatus: string;
  requiredDocuments: string[];
  testingRequirements: string[];
  lastComplianceReview: string;
  needsVerification: boolean;
};

export type RetailVariant = {
  sku: string;
  packLabel: string;
  weightGrams: number;
  priceInr: number;
  inventory: number;
  status: "active" | "draft";
};

export type BulkVariant = {
  sku: string;
  packLabel: string;
  weightKg: number;
  pricePerKgInr: number;
  minKg: number;
  status: "active" | "draft";
};

export type CatalogProduct = {
  slug: string;
  name: string;
  spiceId: string;
  spiceSlug: string;
  varietySlug: string;
  varietyName: string;
  form: SpiceForm;
  grade: string;
  category: string;
  region?: string;
  botanicalName: string;
  hindiName: string;
  shortDescription: string;
  description: string;
  heatLevel: HeatLevel;
  flavourProfile: string;
  origin: string;
  retailVariants: RetailVariant[];
  bulkVariants: BulkVariant[];
  bulkMinimumKg: number;
  tags: string[];
  aliases: string[];
  compliance: ComplianceRecord;
  seoTitle: string;
  metaDescription: string;
  needsVerification: boolean;
};

export type MarketPrice = {
  spiceId: string;
  spiceSlug: string;
  spiceName: string;
  market: string;
  city: string;
  state: string;
  grade: string;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  unit: "kg";
  currency: "INR";
  priceDate: string;
  source: string;
  sourceUrl: string;
  notes: string;
};

export type ShippingRate = {
  id: string;
  region: string;
  country: string;
  countryCode: string;
  currency: "INR";
  baseCharge: number;
  perKgCharge: number;
  minimumCharge: number;
  additionalKgCharge: number;
  freeShippingThreshold?: number;
  minWeightKg: number;
  bulkRatePerKg?: number;
  retailRatePerKg?: number;
  effectiveDate: string;
  notes: string;
};

export type RecipeStub = {
  slug: string;
  title: string;
  dishType: string;
  spiceSlugs: string[];
  summary: string;
};
