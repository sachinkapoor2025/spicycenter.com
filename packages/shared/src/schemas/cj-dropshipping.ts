import { z } from "zod";

export const cjVariantSchema = z.object({
  vid: z.string().min(1),
  sku: z.string().optional(),
  key: z.string().optional(),
  name: z.string().optional(),
  image: z.string().optional(),
  inventory: z.number().int().min(0).optional(),
  /** Storefront sale price for this variant (USD). */
  price: z.number().positive().optional(),
  /** Wholesale CJ sell price (USD) — never expose on public APIs. */
  vendorCost: z.number().positive().optional(),
  weightOz: z.number().positive().optional(),
  lengthIn: z.number().positive().optional(),
  widthIn: z.number().positive().optional(),
  heightIn: z.number().positive().optional(),
});

/** Admin catalog page size (CJ listV2 is fetched in 100-row pages and stitched). */
export const CJ_ADMIN_CATALOG_PAGE_SIZE = 500;
export const CJ_LIST_V2_PAGE_SIZE = 100;

export const cjSearchQuerySchema = z.object({
  keyWord: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  size: z.coerce.number().int().min(1).max(CJ_ADMIN_CATALOG_PAGE_SIZE).optional(),
  categoryId: z.string().max(200).optional(),
  countryCode: z.string().trim().length(2).optional(),
});

/** Queue size for async import (worker Lambda, 15 min). */
export const CJ_IMPORT_MAX_PIDS = 500;

export const cjImportLineStatusSchema = z.enum([
  "pending",
  "in_progress",
  "complete",
  "skipped",
  "failed",
]);
export type CjImportLineStatus = z.infer<typeof cjImportLineStatusSchema>;

export const cjImportJobStatusSchema = z.enum(["pending", "in_progress", "complete", "failed"]);
export type CjImportJobStatus = z.infer<typeof cjImportJobStatusSchema>;

export const cjImportJobLineSchema = z.object({
  pid: z.string().min(1),
  name: z.string().optional(),
  status: cjImportLineStatusSchema,
  slug: z.string().optional(),
  error: z.string().optional(),
});
export type CjImportJobLine = z.infer<typeof cjImportJobLineSchema>;

export const cjImportJobSchema = z.object({
  jobId: z.string().min(1),
  status: cjImportJobStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  createdBy: z.string().optional(),
  source: z.enum(["selected", "spice"]).optional(),
  keyword: z.string().optional(),
  items: z.array(cjImportJobLineSchema),
  counts: z.object({
    total: z.number().int().min(0),
    pending: z.number().int().min(0),
    inProgress: z.number().int().min(0),
    complete: z.number().int().min(0),
    skipped: z.number().int().min(0),
    failed: z.number().int().min(0),
  }),
});
export type CjImportJob = z.infer<typeof cjImportJobSchema>;

export const cjImportProductsSchema = z.object({
  pids: z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(CJ_IMPORT_MAX_PIDS, `Import at most ${CJ_IMPORT_MAX_PIDS} products per request`),
  names: z.record(z.string(), z.string()).optional(),
  categorySlug: z.string().min(1).max(80).optional(),
  published: z.boolean().optional(),
  addToMyProduct: z.boolean().optional(),
});

export const cjImportspiceSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  size: z.coerce.number().int().min(1).max(CJ_ADMIN_CATALOG_PAGE_SIZE).default(CJ_ADMIN_CATALOG_PAGE_SIZE),
  categorySlug: z.string().min(1).max(80).optional(),
  published: z.boolean().optional(),
  addToMyProduct: z.boolean().optional(),
  keyWord: z.string().trim().max(200).optional(),
});

export const cjSaveApiKeySchema = z.object({
  apiKey: z.string().trim().min(8).max(400),
});

export const cjFreightQuoteSchema = z.object({
  startCountryCode: z.string().trim().length(2).default("CN"),
  endCountryCode: z.string().trim().length(2),
  zip: z.string().trim().max(20).optional(),
  products: z
    .array(
      z.object({
        vid: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(40),
});

/** Destinations we will quote on the storefront (ISO 3166-1 alpha-2). */
export const CJ_STOREFRONT_SHIP_COUNTRIES = ["US", "CA", "GB", "AU", "DE"] as const;
export type CjStorefrontShipCountry = (typeof CJ_STOREFRONT_SHIP_COUNTRIES)[number];

export const CJ_STOREFRONT_SHIP_COUNTRY_NAMES: Record<CjStorefrontShipCountry, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  DE: "Germany",
};

export const productShippingQuerySchema = z.object({
  country: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v): v is CjStorefrontShipCountry =>
      (CJ_STOREFRONT_SHIP_COUNTRIES as readonly string[]).includes(v)
    )
    .default("US"),
  vid: z.string().trim().min(1).max(80).optional(),
  quantity: z.coerce.number().int().min(1).max(10).optional(),
});

export const cjStorefrontShippingMethodSchema = z.object({
  name: z.string().min(1),
  daysLabel: z.string().min(1),
  priceUsd: z.number().min(0),
});

export const productShippingResponseSchema = z.object({
  available: z.boolean(),
  originCountry: z.string(),
  destCountry: z.string(),
  destCountryName: z.string(),
  vid: z.string().optional(),
  quantity: z.number().int(),
  methods: z.array(cjStorefrontShippingMethodSchema),
  quotedAt: z.string().optional(),
  customerChargeUsd: z.number().min(0),
  customerChargeLabel: z.string(),
});

export type ProductShippingQuery = z.infer<typeof productShippingQuerySchema>;
export type CjStorefrontShippingMethod = z.infer<typeof cjStorefrontShippingMethodSchema>;
export type ProductShippingResponse = z.infer<typeof productShippingResponseSchema>;

export const cjFulfillOrderSchema = z.object({
  orderId: z.string().min(1),
  /** 1=page pay URL (order appears in CJ), 2=CJ wallet (auto-process), 3=draft only (avoid for auto-push). */
  payType: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  logisticName: z.string().min(1).max(80).optional(),
  fromCountryCode: z.string().trim().length(2).optional(),
});

export type CjVariant = z.infer<typeof cjVariantSchema>;
export type CjSearchQuery = z.infer<typeof cjSearchQuerySchema>;
export type CjImportProductsInput = z.infer<typeof cjImportProductsSchema>;
export type CjImportspiceInput = z.infer<typeof cjImportspiceSchema>;
