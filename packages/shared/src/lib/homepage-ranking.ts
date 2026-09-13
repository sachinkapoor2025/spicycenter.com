import type { Product } from "../schemas/product";
import {
  DEFAULT_HOMEPAGE_RANKING_CONFIG,
  type HomepageRankingConfig,
  type HomepageSnapshot,
} from "../schemas/homepage-ranking";
import { isQuoteableStorefrontCountry } from "./shipping-availability";

export type FunnelCounts = {
  impressions: number;
  clicks: number;
  views: number;
  adds: number;
  checkouts: number;
  orders: number;
  revenueUsd: number;
  qty: number;
  homepageImpressions: number;
  homepageClicks: number;
  homepageOrders: number;
};

export type ProductPerformanceInput = {
  slug: string;
  categorySlug: string;
  name: string;
  price: number;
  inventory: number;
  published: boolean;
  availableCountryCodes?: string[] | null;
  unitsSold: number;
  createdAt?: string;
  tags?: string[];
  current: FunnelCounts;
  previous: FunnelCounts;
  recent7: FunnelCounts;
};

export type ClickOrderQuadrant =
  | "high_click_high_order"
  | "high_click_low_order"
  | "low_click_high_order"
  | "low_click_low_order";

export type TrendLabel = "rising" | "stable" | "falling";

export type RankedProduct = {
  slug: string;
  categorySlug: string;
  name: string;
  theme: string;
  audience: string;
  priceBand: string;
  score: number;
  sampleQuality: "low" | "medium" | "high";
  sampleSize: number;
  trend: TrendLabel;
  trendScore: number;
  quadrant: ClickOrderQuadrant;
  ctr: number;
  atcRate: number;
  conversionRate: number;
  metrics: FunnelCounts;
  homepagePriority: number;
};

export const EMPTY_FUNNEL: FunnelCounts = {
  impressions: 0,
  clicks: 0,
  views: 0,
  adds: 0,
  checkouts: 0,
  orders: 0,
  revenueUsd: 0,
  qty: 0,
  homepageImpressions: 0,
  homepageClicks: 0,
  homepageOrders: 0,
};

const THEMES = [
  "cumin",
  "turmeric",
  "chilli",
  "cardamom",
  "cinnamon",
  "pepper",
  "coriander",
  "masala",
  "fenugreek",
  "clove",
] as const;

export function inferProductTheme(name: string, tags: string[] = []): string {
  const hay = `${name} ${tags.join(" ")}`.toLowerCase();
  return THEMES.find((t) => hay.includes(t)) ?? "general";
}

export function inferProductAudience(name: string, tags: string[] = []): string {
  const hay = `${name} ${tags.join(" ")}`.toLowerCase();
  if (/\b(kid|kids|child|children|toddler)\b/.test(hay)) return "kids";
  if (/\b(pet|dog|cat)\b/.test(hay)) return "pets";
  if (/\b(couple|couples)\b/.test(hay)) return "couples";
  if (/\b(family|families)\b/.test(hay)) return "families";
  if (/\b(women|woman|female|girl)\b/.test(hay)) return "women";
  if (/\b(men|man|male|boy)\b/.test(hay)) return "men";
  if (/\b(adult)\b/.test(hay)) return "adults";
  return "all";
}

export function priceBand(price: number): string {
  if (price < 15) return "under15";
  if (price < 30) return "15to30";
  if (price < 50) return "30to50";
  return "50plus";
}

function shrinkRate(successes: number, trials: number, prior: number, strength: number): number {
  if (trials <= 0) return prior;
  return (successes + prior * strength) / (trials + strength);
}

function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(n).fill(0);
  indexed.forEach((row, rank) => {
    out[row.i] = n === 1 ? 50 : (rank / (n - 1)) * 100;
  });
  return out;
}

export function sampleQuality(clicks: number, orders: number, cfg: HomepageRankingConfig): RankedProduct["sampleQuality"] {
  if (clicks >= cfg.minimumClicksForRanking * 4 && orders >= cfg.minimumOrdersForConversionRanking * 2) return "high";
  if (clicks >= cfg.minimumClicksForRanking || orders >= cfg.minimumOrdersForConversionRanking) return "medium";
  return "low";
}

export function trendFromWindows(currentClicks: number, previousClicks: number): { label: TrendLabel; score: number } {
  const denom = Math.max(previousClicks, 8);
  const delta = (currentClicks - previousClicks) / denom;
  if (delta >= 0.25) return { label: "rising", score: Math.min(100, 50 + delta * 50) };
  if (delta <= -0.25) return { label: "falling", score: Math.max(0, 50 + delta * 50) };
  return { label: "stable", score: 50 + delta * 40 };
}

export function classifyQuadrant(
  clicks: number,
  orders: number,
  clickMedian: number,
  orderMedian: number
): ClickOrderQuadrant {
  const highClick = clicks >= clickMedian;
  const highOrder = orders >= orderMedian;
  if (highClick && highOrder) return "high_click_high_order";
  if (highClick && !highOrder) return "high_click_low_order";
  if (!highClick && highOrder) return "low_click_high_order";
  return "low_click_low_order";
}

export function productIsEligible(p: ProductPerformanceInput): boolean {
  if (p.published === false) return false;
  if ((p.inventory ?? 0) <= 0) return false;
  if (p.availableCountryCodes?.length) {
    const quoteable = p.availableCountryCodes.some((c) => isQuoteableStorefrontCountry(c));
    if (!quoteable) return false;
  }
  return true;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function scoreProducts(
  inputs: ProductPerformanceInput[],
  cfg: HomepageRankingConfig = DEFAULT_HOMEPAGE_RANKING_CONFIG
): RankedProduct[] {
  const eligible = inputs.filter(productIsEligible);
  const w = cfg.weights;
  const weightSum = w.ctr + w.atcRate + w.conversionRate + w.orders + w.revenue + w.trend || 1;

  const ctrs = eligible.map((p) =>
    shrinkRate(p.current.clicks, Math.max(p.current.impressions, p.current.clicks), 0.03, cfg.minimumImpressionsForCtr)
  );
  const atcs = eligible.map((p) =>
    shrinkRate(p.current.adds, Math.max(p.current.views, p.current.clicks, 1), 0.04, 30)
  );
  const convs = eligible.map((p) =>
    shrinkRate(p.current.orders, Math.max(p.current.views, p.current.clicks, 1), 0.02, Math.max(cfg.minimumClicksForRanking, 20))
  );
  const ordersN = percentileRanks(eligible.map((p) => p.current.orders));
  const revenueN = percentileRanks(eligible.map((p) => p.current.revenueUsd));
  const ctrN = percentileRanks(ctrs);
  const atcN = percentileRanks(atcs);
  const convN = percentileRanks(convs);
  const clickMedian = median(eligible.map((p) => p.current.clicks));
  const orderMedian = median(eligible.map((p) => p.current.orders));

  return eligible.map((p, i) => {
    const trend = trendFromWindows(p.current.clicks, p.previous.clicks);
    const override = cfg.overrides[p.slug];
    const raw =
      ((ctrN[i] ?? 0) * w.ctr +
        (atcN[i] ?? 0) * w.atcRate +
        (convN[i] ?? 0) * w.conversionRate +
        (ordersN[i] ?? 0) * w.orders +
        (revenueN[i] ?? 0) * w.revenue +
        trend.score * w.trend) /
      weightSum;
    const boosted = Math.max(0, Math.min(100, raw * (override?.boost ?? 1)));
    return {
      slug: p.slug,
      categorySlug: p.categorySlug,
      name: p.name,
      theme: inferProductTheme(p.name, p.tags),
      audience: inferProductAudience(p.name, p.tags),
      priceBand: priceBand(p.price),
      score: Math.round(boosted * 10) / 10,
      sampleQuality: sampleQuality(p.current.clicks, p.current.orders, cfg),
      sampleSize: p.current.clicks + p.current.views + p.current.orders,
      trend: trend.label,
      trendScore: Math.round(trend.score),
      quadrant: classifyQuadrant(p.current.clicks, p.current.orders, clickMedian, orderMedian),
      ctr: ctrs[i] ?? 0,
      atcRate: atcs[i] ?? 0,
      conversionRate: convs[i] ?? 0,
      metrics: p.current,
      homepagePriority: override?.pin ? 1000 : boosted,
    };
  }).sort((a, b) => b.homepagePriority - a.homepagePriority || b.score - a.score);
}

function takeDiverse(
  ranked: RankedProduct[],
  limit: number,
  cfg: HomepageRankingConfig,
  used: Set<string>
): string[] {
  const out: string[] = [];
  const catCount = new Map<string, number>();
  const themeCount = new Map<string, number>();
  const maxCat = Math.max(2, Math.floor(limit * cfg.maxShareSameCategory));
  const maxTheme = Math.max(2, Math.floor(limit * cfg.maxShareSameTheme));

  for (const p of ranked) {
    if (out.length >= limit) break;
    if (used.has(p.slug)) continue;
    if (cfg.overrides[p.slug]?.exclude) continue;
    const cats = catCount.get(p.categorySlug) ?? 0;
    const themes = themeCount.get(p.theme) ?? 0;
    if (cats >= maxCat || themes >= maxTheme) continue;
    out.push(p.slug);
    used.add(p.slug);
    catCount.set(p.categorySlug, cats + 1);
    themeCount.set(p.theme, themes + 1);
  }

  if (out.length < limit) {
    for (const p of ranked) {
      if (out.length >= limit) break;
      if (used.has(p.slug) || cfg.overrides[p.slug]?.exclude) continue;
      out.push(p.slug);
      used.add(p.slug);
    }
  }
  return out;
}

export function buildHomepageSnapshot(
  ranked: RankedProduct[],
  inputs: ProductPerformanceInput[],
  cfg: HomepageRankingConfig = DEFAULT_HOMEPAGE_RANKING_CONFIG
): HomepageSnapshot {
  const used = new Set<string>();
  const bySlug = new Map(ranked.map((p) => [p.slug, p]));
  const pinned = Object.entries(cfg.overrides)
    .filter(([, o]) => o.pin)
    .map(([slug]) => slug)
    .filter((slug) => bySlug.has(slug));
  for (const slug of pinned) used.add(slug);

  const top = ranked.filter((p) => p.quadrant === "high_click_high_order" || p.score >= 55);
  const trending = ranked.filter((p) => p.trend === "rising");
  const mostClicked = [...ranked].sort((a, b) => b.metrics.clicks - a.metrics.clicks);
  const mostOrdered = [...ranked].sort((a, b) => b.metrics.orders - a.metrics.orders || b.metrics.qty - a.metrics.qty);
  const newest = inputs
    .filter((p) => productIsEligible(p))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .map((p) => bySlug.get(p.slug))
    .filter((p): p is RankedProduct => Boolean(p));
  const exploration = ranked.filter(
    (p) => p.metrics.impressions < Math.max(cfg.minimumImpressionsForCtr, 40) || p.sampleQuality === "low"
  );
  const hiddenWinners = ranked.filter((p) => p.quadrant === "low_click_high_order");
  const exploreSlots = Math.max(
    cfg.slotExploration,
    Math.round(cfg.homepageProductCount * (cfg.explorationPercentage / 100))
  );

  const groups = [
    { id: "pinned", title: "Featured", slugs: pinned },
    { id: "top", title: "Top Performing Products", slugs: takeDiverse(top.length ? top : ranked, cfg.slotTopPerformers, cfg, used) },
    { id: "trending", title: "Trending Products", slugs: takeDiverse(trending.length ? trending : ranked, cfg.slotTrending, cfg, used) },
    { id: "most_clicked", title: "Most Clicked", slugs: takeDiverse(mostClicked, 40, cfg, new Set()) },
    { id: "most_ordered", title: "Most Ordered", slugs: takeDiverse(mostOrdered, 40, cfg, new Set()) },
    { id: "best_sellers", title: "spice Best Sellers", slugs: takeDiverse(mostOrdered, 40, cfg, used) },
    { id: "new", title: "New & Trending", slugs: takeDiverse(newest, cfg.slotNew, cfg, used) },
    { id: "hidden", title: "Recommended", slugs: takeDiverse(hiddenWinners.length ? hiddenWinners : ranked, cfg.slotCategoryDiversity, cfg, used) },
    { id: "explore", title: "Discover", slugs: takeDiverse(exploration.length ? exploration : ranked, exploreSlots, cfg, used) },
  ];

  const rankedPool: string[] = [...pinned];
  for (const g of groups) {
    for (const slug of g.slugs) {
      if (!rankedPool.includes(slug)) rankedPool.push(slug);
    }
  }
  for (const p of ranked) {
    if (rankedPool.length >= cfg.homepageProductCount) break;
    if (cfg.overrides[p.slug]?.exclude) continue;
    if (!rankedPool.includes(p.slug)) rankedPool.push(p.slug);
  }

  return {
    generatedAt: new Date().toISOString(),
    windowDays: cfg.performanceWindowDays,
    poolSize: rankedPool.slice(0, cfg.homepageProductCount).length,
    groups: groups.filter((g) => g.slugs.length > 0),
    ranked: rankedPool.slice(0, cfg.homepageProductCount),
  };
}

export function recommendationCopy(p: RankedProduct): string | null {
  if (p.quadrant === "high_click_low_order" && p.metrics.clicks >= 40) {
    return `${p.name} gets clicks but few orders. Investigate price, shipping, images, or PDP trust — do not just add more homepage exposure.`;
  }
  if (p.quadrant === "low_click_high_order" && p.metrics.orders >= 3) {
    return `${p.name} converts well with little discovery. Increase homepage exposure.`;
  }
  if (p.trend === "rising" && p.metrics.clicks >= 20) {
    return `${p.name} is trending upward and should receive more homepage exposure.`;
  }
  if (p.trend === "falling" && p.metrics.clicks >= 40) {
    return `${p.name} is declining. Review whether it still belongs in the top homepage slots.`;
  }
  if (p.quadrant === "high_click_high_order") {
    return `${p.name} is a best product (high click and high order). Keep or increase homepage exposure.`;
  }
  return null;
}
