import { z } from "zod";

export const homepageProductOverrideSchema = z.object({
  pin: z.boolean().optional(),
  exclude: z.boolean().optional(),
  featured: z.boolean().optional(),
  trending: z.boolean().optional(),
  seasonal: z.boolean().optional(),
  /** Multiplier applied after the score (0.5–2). */
  boost: z.number().min(0.5).max(2).optional(),
});

export const homepageRankingConfigSchema = z.object({
  homepageProductCount: z.number().int().min(20).max(800).default(500),
  explorationPercentage: z.number().min(0).max(50).default(20),
  performanceWindowDays: z.number().int().min(7).max(90).default(30),
  trendWindowDays: z.number().int().min(3).max(30).default(14),
  minimumClicksForRanking: z.number().int().min(0).max(500).default(20),
  minimumOrdersForConversionRanking: z.number().int().min(0).max(50).default(5),
  minimumImpressionsForCtr: z.number().int().min(0).max(2000).default(40),
  countryPersonalizationEnabled: z.boolean().default(false),
  regionPersonalizationEnabled: z.boolean().default(false),
  cityPersonalizationEnabled: z.boolean().default(false),
  /** Chat product clicks are stored separately and do not dominate homepage ranking. */
  chatClickWeight: z.number().min(0).max(1).default(0),
  profitabilityWeight: z.number().min(0).max(1).default(0),
  seasonalWeight: z.number().min(0).max(1).default(0),
  maxShareSameCategory: z.number().min(0.05).max(1).default(0.28),
  maxShareSameTheme: z.number().min(0.05).max(1).default(0.35),
  slotTopPerformers: z.number().int().min(0).max(500).default(200),
  slotTrending: z.number().int().min(0).max(500).default(100),
  slotNew: z.number().int().min(0).max(500).default(75),
  slotCategoryDiversity: z.number().int().min(0).max(500).default(75),
  slotExploration: z.number().int().min(0).max(500).default(50),
  weights: z
    .object({
      ctr: z.number().min(0).max(1).default(0.2),
      atcRate: z.number().min(0).max(1).default(0.15),
      conversionRate: z.number().min(0).max(1).default(0.25),
      orders: z.number().min(0).max(1).default(0.2),
      revenue: z.number().min(0).max(1).default(0.1),
      trend: z.number().min(0).max(1).default(0.1),
    })
    .default({
      ctr: 0.2,
      atcRate: 0.15,
      conversionRate: 0.25,
      orders: 0.2,
      revenue: 0.1,
      trend: 0.1,
    }),
  overrides: z.record(homepageProductOverrideSchema).default({}),
});

export type HomepageRankingConfig = z.infer<typeof homepageRankingConfigSchema>;
export type HomepageProductOverride = z.infer<typeof homepageProductOverrideSchema>;

export const DEFAULT_HOMEPAGE_RANKING_CONFIG: HomepageRankingConfig =
  homepageRankingConfigSchema.parse({});

export const homepageSnapshotGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  slugs: z.array(z.string()),
});

export const homepageSnapshotSchema = z.object({
  generatedAt: z.string(),
  windowDays: z.number().int(),
  poolSize: z.number().int(),
  groups: z.array(homepageSnapshotGroupSchema),
  ranked: z.array(z.string()),
});

export type HomepageSnapshot = z.infer<typeof homepageSnapshotSchema>;
export type HomepageSnapshotGroup = z.infer<typeof homepageSnapshotGroupSchema>;
