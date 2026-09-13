import { z } from "zod";

/** ISO 3166-1 alpha-2. Europe is stored as real country codes, never a fake "EU" country. */
export const countryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((v) => v.toUpperCase());

export const MARKET_CURRENCIES = ["USD", "GBP", "CAD", "AUD", "INR", "AED", "EUR"] as const;
export type MarketCurrency = (typeof MARKET_CURRENCIES)[number];

export const CHECKOUT_CURRENCIES = ["USD", "INR"] as const;
export type CheckoutCurrency = (typeof CHECKOUT_CURRENCIES)[number];

export const warehouseServiceAreaSchema = z.object({
  countryCodes: z.array(countryCodeSchema).default([]),
  /** Empty = all regions in the listed countries. */
  stateOrRegionCodes: z.array(z.string().trim().min(1).max(12)).default([]),
  /** Empty = all postal codes. Prefix match (e.g. "SO" for Southampton). */
  postalPrefixes: z.array(z.string().trim().min(1).max(12)).default([]),
  internationalShipping: z.boolean().default(false),
});

export const warehouseSchema = z.object({
  warehouseId: z.string().min(1).max(80),
  warehouseCode: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  /** Null / omitted = company-owned warehouse. */
  vendorId: z.string().min(1).max(80).nullable().optional(),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1).max(120),
  stateOrRegion: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(20),
  countryCode: countryCodeSchema,
  /** Display exactly as configured (may be a local national number). */
  phone: z.string().min(1).max(40),
  /** Digits-only helper for dialers / WhatsApp. */
  phoneNormalized: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().min(1).max(80).default("UTC"),
  active: z.boolean().default(true),
  fulfillmentEnabled: z.boolean().default(true),
  pickupEnabled: z.boolean().default(false),
  serviceArea: warehouseServiceAreaSchema.default({
    countryCodes: [],
    stateOrRegionCodes: [],
    postalPrefixes: [],
    internationalShipping: false,
  }),
  priority: z.number().int().min(0).max(1000).default(100),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createWarehouseSchema = warehouseSchema.omit({
  warehouseId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export const vendorUserSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  role: z.enum(["vendor_admin", "vendor_staff"]).default("vendor_admin"),
  active: z.boolean().default(true),
});

export const vendorSchema = z.object({
  vendorId: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  countryCode: countryCodeSchema,
  companyOwned: z.boolean().default(false),
  active: z.boolean().default(true),
  warehouseIds: z.array(z.string().min(1).max(80)).default([]),
  userEmails: z.array(z.string().email()).default([]),
  users: z.array(vendorUserSchema).default([]),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  /** Higher = preferred when multiple vendors can fulfill the same country. */
  priority: z.number().int().min(0).max(1000).default(100),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createVendorSchema = vendorSchema.omit({
  vendorId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateVendorSchema = createVendorSchema.partial();

export const marketContactSchema = z.object({
  phone: z.string().max(40).optional().or(z.literal("")),
  phoneNormalized: z.string().max(20).optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  stateOrRegion: z.string().max(120).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  countryCode: countryCodeSchema.optional(),
});

export const marketSchema = z.object({
  countryCode: countryCodeSchema,
  name: z.string().min(1).max(80),
  slug: z.string().min(2).max(40),
  active: z.boolean().default(true),
  locale: z.string().min(2).max(12).default("en-US"),
  /** Display currency for this market (checkout may still be USD/INR). */
  currency: z.enum(MARKET_CURRENCIES).default("USD"),
  checkoutCurrency: z.enum(CHECKOUT_CURRENCIES).default("USD"),
  flagEmoji: z.string().max(8).default(""),
  postalLabel: z.string().min(1).max(40).default("Postal code"),
  defaultWarehouseId: z.string().min(1).max(80).optional().or(z.literal("")),
  allowInternationalFallback: z.boolean().default(true),
  contact: marketContactSchema.default({}),
  hreflang: z.string().min(2).max(12).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createMarketSchema = marketSchema.omit({ createdAt: true, updatedAt: true });
export const updateMarketSchema = createMarketSchema.partial().omit({ countryCode: true });

export const inventoryListingSchema = z.object({
  listingId: z.string().min(1).max(120),
  productSlug: z.string().min(1).max(200),
  vendorId: z.string().min(1).max(80),
  warehouseId: z.string().min(1).max(80),
  countryCode: countryCodeSchema,
  sku: z.string().max(80).optional().or(z.literal("")),
  quantityAvailable: z.number().int().min(0).default(0),
  quantityReserved: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(10),
  sellingPriceOverride: z.number().positive().optional(),
  processingDays: z.number().int().min(0).max(60).default(1),
  active: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const upsertInventoryListingSchema = inventoryListingSchema.omit({
  listingId: true,
  createdAt: true,
  updatedAt: true,
});

export const serviceabilityRequestSchema = z.object({
  countryCode: countryCodeSchema,
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  productSlug: z.string().min(1).max(200).optional(),
});

export const fulfillmentSplitSchema = z.object({
  vendorId: z.string().min(1),
  warehouseId: z.string().min(1),
  productSlugs: z.array(z.string().min(1)),
  fulfillmentCountry: countryCodeSchema,
  routingReason: z.string().max(200),
  estimatedDeliveryDays: z.number().int().min(1).max(60).optional(),
});

export const orderFulfillmentAssignmentSchema = z.object({
  assignedVendorId: z.string().min(1).optional(),
  assignedWarehouseId: z.string().min(1).optional(),
  fulfillmentCountry: countryCodeSchema.optional(),
  routingReason: z.string().max(200).optional(),
  splits: z.array(fulfillmentSplitSchema).optional(),
});

export const adminFulfillmentOverrideSchema = z.object({
  assignedVendorId: z.string().min(1).max(80).optional(),
  assignedWarehouseId: z.string().min(1).max(80).optional(),
  routingReason: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
});

export const auditLogSchema = z.object({
  auditId: z.string().min(1),
  action: z.string().min(1).max(80),
  actorEmail: z.string().email().optional(),
  vendorId: z.string().max(80).optional(),
  warehouseId: z.string().max(80).optional(),
  orderId: z.string().max(80).optional(),
  details: z.string().max(2000).optional(),
  createdAt: z.string(),
});

export type Warehouse = z.infer<typeof warehouseSchema>;
export type WarehouseServiceArea = z.infer<typeof warehouseServiceAreaSchema>;
export type VendorRecord = z.infer<typeof vendorSchema>;
export type VendorUser = z.infer<typeof vendorUserSchema>;
export type Market = z.infer<typeof marketSchema>;
export type MarketContact = z.infer<typeof marketContactSchema>;
export type InventoryListing = z.infer<typeof inventoryListingSchema>;
export type ServiceabilityRequest = z.infer<typeof serviceabilityRequestSchema>;
export type FulfillmentSplit = z.infer<typeof fulfillmentSplitSchema>;
export type OrderFulfillmentAssignment = z.infer<typeof orderFulfillmentAssignmentSchema>;
export type AdminFulfillmentOverride = z.infer<typeof adminFulfillmentOverrideSchema>;
export type AuditLogEntry = z.infer<typeof auditLogSchema>;
