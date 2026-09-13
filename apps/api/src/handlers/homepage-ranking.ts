import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  configKeys,
  eventKeys,
  homepageRankingConfigSchema,
  DEFAULT_HOMEPAGE_RANKING_CONFIG,
  EMPTY_FUNNEL,
  scoreProducts,
  buildHomepageSnapshot,
  buildHomepageFeedSlugs,
  parseHomepageFeedQuery,
  paginateHomepageFeed,
  recommendationCopy,
  isCjDropshippingProduct,
  type FunnelCounts,
  type HomepageRankingConfig,
  type HomepageSnapshot,
  type Product,
  type ProductPerformanceInput,
  type RankedProduct,
} from "@spicycorner/shared";
import { docClient, CONFIG_TABLE, EVENTS_TABLE, dayBucket, now } from "../lib/db";
import { ok, okCached, badRequest, forbidden, notFound } from "../lib/response";
import { requireAdmin } from "../lib/auth";
import { forStorefrontListing, listCatalogProducts } from "./products";

type RollupItem = Record<string, unknown> & { SK?: string; kind?: string; label?: string };

function rangeDays(days: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    out.push(dayBucket(d));
  }
  return out;
}

function parseDays(event: APIGatewayProxyEventV2, fallback = 30, max = 90): number {
  const raw = Number(event.queryStringParameters?.days ?? fallback);
  if (!Number.isFinite(raw) || raw < 1) return fallback;
  return Math.min(Math.floor(raw), max);
}

async function getRollup(day: string): Promise<RollupItem[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": eventKeys.rollupPk(day) },
    })
  );
  return (res.Items ?? []) as RollupItem[];
}

function funnelFromItem(item: RollupItem): FunnelCounts {
  return {
    impressions: Number(item.impressions ?? 0),
    clicks: Number(item.clicks ?? 0),
    views: Number(item.views ?? 0),
    adds: Number(item.adds ?? 0),
    checkouts: Number(item.checkouts ?? 0),
    orders: Number(item.orders ?? 0),
    revenueUsd: Number(item.revenueUsd ?? 0),
    qty: Number(item.qty ?? 0),
    homepageImpressions: Number(item.homepageImpressions ?? 0),
    homepageClicks: Number(item.homepageClicks ?? 0),
    homepageOrders: Number(item.homepageOrders ?? 0),
  };
}

function addFunnel(a: FunnelCounts, b: FunnelCounts): FunnelCounts {
  return {
    impressions: a.impressions + b.impressions,
    clicks: a.clicks + b.clicks,
    views: a.views + b.views,
    adds: a.adds + b.adds,
    checkouts: a.checkouts + b.checkouts,
    orders: a.orders + b.orders,
    revenueUsd: a.revenueUsd + b.revenueUsd,
    qty: a.qty + b.qty,
    homepageImpressions: a.homepageImpressions + b.homepageImpressions,
    homepageClicks: a.homepageClicks + b.homepageClicks,
    homepageOrders: a.homepageOrders + b.homepageOrders,
  };
}

export async function loadRankingConfig(): Promise<HomepageRankingConfig> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.homepageRanking.pk, SK: configKeys.homepageRanking.sk },
    })
  );
  const parsed = homepageRankingConfigSchema.safeParse(result.Item ?? {});
  return parsed.success ? parsed.data : DEFAULT_HOMEPAGE_RANKING_CONFIG;
}

async function loadSnapshot(): Promise<HomepageSnapshot | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.homepageSnapshot.pk, SK: configKeys.homepageSnapshot.sk },
    })
  );
  const item = result.Item as HomepageSnapshot | undefined;
  if (!item?.ranked?.length) return null;
  return item;
}

function productFunnelMap(rollups: RollupItem[][]): Map<string, FunnelCounts> {
  const map = new Map<string, FunnelCounts>();
  for (const items of rollups) {
    for (const item of items) {
      if (item.kind !== "product" || !item.label) continue;
      const slug = String(item.label);
      map.set(slug, addFunnel(map.get(slug) ?? { ...EMPTY_FUNNEL }, funnelFromItem(item)));
    }
  }
  return map;
}

function toInput(product: Product, current: FunnelCounts, previous: FunnelCounts, recent7: FunnelCounts): ProductPerformanceInput {
  return {
    slug: product.slug,
    categorySlug: product.categorySlug,
    name: product.name,
    price: product.price,
    inventory: product.inventory ?? 0,
    published: product.published !== false,
    availableCountryCodes: product.availableCountryCodes,
    unitsSold: product.unitsSold ?? 0,
    createdAt: (product as Product & { createdAt?: string }).createdAt,
    tags: product.tags,
    current,
    previous,
    recent7,
  };
}

async function computeRanking(cfg: HomepageRankingConfig) {
  const windowDays = cfg.performanceWindowDays;
  const trendDays = cfg.trendWindowDays;
  const currentDays = rangeDays(windowDays);
  const previousDays = rangeDays(windowDays + trendDays).slice(windowDays);
  const recent7Days = rangeDays(7);

  const [products, currentRollups, previousRollups, recentRollups] = await Promise.all([
    listCatalogProducts(),
    Promise.all(currentDays.map(getRollup)),
    Promise.all(previousDays.map(getRollup)),
    Promise.all(recent7Days.map(getRollup)),
  ]);

  const currentMap = productFunnelMap(currentRollups);
  const previousMap = productFunnelMap(previousRollups);
  const recentMap = productFunnelMap(recentRollups);

  const catalog = products.filter((p) => p.published !== false && isCjDropshippingProduct(p));
  const inputs = catalog.map((p) =>
    toInput(
      p,
      currentMap.get(p.slug) ?? { ...EMPTY_FUNNEL },
      previousMap.get(p.slug) ?? { ...EMPTY_FUNNEL },
      recentMap.get(p.slug) ?? { ...EMPTY_FUNNEL }
    )
  );
  const ranked = scoreProducts(inputs, cfg);
  const snapshot = buildHomepageSnapshot(ranked, inputs, cfg);
  return { ranked, snapshot, catalog, currentRollups };
}

export async function refreshHomepageSnapshot(): Promise<HomepageSnapshot> {
  const cfg = await loadRankingConfig();
  const { snapshot } = await computeRanking(cfg);
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.homepageSnapshot.pk,
        SK: configKeys.homepageSnapshot.sk,
        ...snapshot,
        updatedAt: now(),
      },
    })
  );
  return snapshot;
}

export async function getHomepageRankingConfig(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const config = await loadRankingConfig();
  return ok({ config });
}

export async function updateHomepageRankingConfig(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const parsed = homepageRankingConfigSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.homepageRanking.pk,
        SK: configKeys.homepageRanking.sk,
        ...parsed.data,
        updatedAt: now(),
      },
    })
  );
  const snapshot = await refreshHomepageSnapshot();
  return ok({ config: parsed.data, snapshot });
}

export async function postRefreshHomepageRanking(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const snapshot = await refreshHomepageSnapshot();
  return ok({ snapshot });
}

export async function getHomepageCatalog(event: APIGatewayProxyEventV2) {
  const { offset, limit } = parseHomepageFeedQuery(event.queryStringParameters ?? undefined);
  const [snapshot, products] = await Promise.all([loadSnapshot(), listCatalogProducts()]);
  const bySlug = new Map(
    products.filter((p) => p.published !== false && isCjDropshippingProduct(p)).map((p) => [p.slug, p])
  );
  const inStock = [...bySlug.values()].filter((p) => (p.inventory ?? 0) > 0);

  let active: HomepageSnapshot;
  if (snapshot?.ranked.length) {
    active = snapshot;
  } else {
    const cfg = DEFAULT_HOMEPAGE_RANKING_CONFIG;
    const inputs = inStock.map((p) =>
      toInput(p, { ...EMPTY_FUNNEL }, { ...EMPTY_FUNNEL }, { ...EMPTY_FUNNEL })
    );
    active = buildHomepageSnapshot(scoreProducts(inputs, cfg), inputs, cfg);
  }

  const feed = buildHomepageFeedSlugs(active)
    .map((slug) => bySlug.get(slug))
    .filter((p): p is Product => p != null && (p.inventory ?? 0) > 0);
  const page = paginateHomepageFeed(feed, offset, limit);
  const compactSnapshot =
    offset === 0
      ? {
          generatedAt: active.generatedAt,
          poolSize: active.poolSize,
          groups: active.groups.map((group) => ({
            ...group,
            slugs: group.slugs.slice(0, 12),
          })),
          ranked: page.items.map((p) => p.slug),
        }
      : undefined;

  return okCached(
    {
      snapshot: compactSnapshot,
      products: page.items.map(forStorefrontListing),
      offset: page.offset,
      limit: page.limit,
      total: page.total,
      hasMore: page.hasMore,
    },
    30
  );
}

export async function getProductPerformance(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const cfg = await loadRankingConfig();
  const { ranked, snapshot } = await computeRanking({ ...cfg, performanceWindowDays: days });
  const exposure = new Map(snapshot.ranked.map((slug, i) => [slug, i + 1]));
  const rows = ranked.map((p, i) => ({
    rank: i + 1,
    ...p,
    homepageExposure: exposure.has(p.slug),
    homepageRank: exposure.get(p.slug) ?? null,
    recommendation: recommendationCopy(p),
  }));
  return ok({ days, totals: summarize(rows), products: rows.slice(0, 400) });
}

function summarize(rows: Array<RankedProduct & { homepageExposure: boolean }>) {
  const top = rows[0];
  const byCountryPlaceholder = "";
  return {
    products: rows.length,
    impressions: rows.reduce((s, r) => s + r.metrics.impressions, 0),
    clicks: rows.reduce((s, r) => s + r.metrics.clicks, 0),
    views: rows.reduce((s, r) => s + r.metrics.views, 0),
    adds: rows.reduce((s, r) => s + r.metrics.adds, 0),
    checkouts: rows.reduce((s, r) => s + r.metrics.checkouts, 0),
    orders: rows.reduce((s, r) => s + r.metrics.orders, 0),
    revenueUsd: rows.reduce((s, r) => s + r.metrics.revenueUsd, 0),
    qty: rows.reduce((s, r) => s + r.metrics.qty, 0),
    homepageClicks: rows.reduce((s, r) => s + r.metrics.homepageClicks, 0),
    homepageImpressions: rows.reduce((s, r) => s + r.metrics.homepageImpressions, 0),
    conversionRate:
      rows.reduce((s, r) => s + r.metrics.views, 0) > 0
        ? rows.reduce((s, r) => s + r.metrics.orders, 0) / rows.reduce((s, r) => s + r.metrics.views, 0)
        : 0,
    homepageCtr:
      rows.reduce((s, r) => s + r.metrics.homepageImpressions, 0) > 0
        ? rows.reduce((s, r) => s + r.metrics.homepageClicks, 0) /
          rows.reduce((s, r) => s + r.metrics.homepageImpressions, 0)
        : 0,
    topProduct: top?.name ?? "",
    topCategory: top?.categorySlug ?? "",
    rising: rows.filter((r) => r.trend === "rising").length,
    falling: rows.filter((r) => r.trend === "falling").length,
    highClickLowOrder: rows.filter((r) => r.quadrant === "high_click_low_order").length,
    lowClickHighOrder: rows.filter((r) => r.quadrant === "low_click_high_order").length,
    countryNote: byCountryPlaceholder,
  };
}

export async function getProductPerformanceDetail(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");
  const days = parseDays(event);
  const cfg = await loadRankingConfig();
  const { ranked, currentRollups } = await computeRanking({ ...cfg, performanceWindowDays: days });
  const product = ranked.find((p) => p.slug === slug);
  if (!product) return notFound("Product not in eligible catalog");

  type GeoRow = { label: string; clicks: number; orders: number; revenueUsd: number };
  const geo = { countries: [] as GeoRow[], regions: [] as GeoRow[], cities: [] as GeoRow[] };
  const GEO_MIN = 5;
  for (const items of currentRollups) {
    for (const item of items) {
      if (!String(item.label ?? "").startsWith(`${slug}|`)) continue;
      const parts = String(item.label).split("|");
      const funnel = funnelFromItem(item);
      const row = {
        label: parts.slice(1).join(" / "),
        clicks: funnel.clicks,
        orders: funnel.orders,
        revenueUsd: funnel.revenueUsd,
      };
      const volume = row.clicks + row.orders;
      if (item.kind === "product_geo") geo.countries.push(row);
      if (item.kind === "product_geo_region") geo.regions.push(row);
      if (item.kind === "product_geo_city" && volume >= GEO_MIN) geo.cities.push(row);
    }
  }
  const merge = (rows: typeof geo.countries) => {
    const map = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      const prev = map.get(r.label) ?? { label: r.label, clicks: 0, orders: 0, revenueUsd: 0 };
      prev.clicks += r.clicks;
      prev.orders += r.orders;
      prev.revenueUsd += r.revenueUsd;
      map.set(r.label, prev);
    }
    return [...map.values()].sort((a, b) => b.orders - a.orders || b.clicks - a.clicks);
  };

  return ok({
    days,
    product,
    recommendation: recommendationCopy(product),
    geo: {
      countries: merge(geo.countries),
      regions: merge(geo.regions),
      cities: merge(geo.cities),
    },
  });
}

export async function getMerchandisingInsights(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const cfg = await loadRankingConfig();
  const { ranked, snapshot, currentRollups } = await computeRanking({ ...cfg, performanceWindowDays: days });
  const recs = ranked.map(recommendationCopy).filter((t): t is string => Boolean(t)).slice(0, 12);

  const countries = new Map<string, { clicks: number; orders: number; revenueUsd: number }>();
  for (const items of currentRollups) {
    for (const item of items) {
      if (item.kind !== "product_geo" || !item.label) continue;
      const cc = String(item.label).split("|")[1] ?? "";
      if (!cc) continue;
      const f = funnelFromItem(item);
      const prev = countries.get(cc) ?? { clicks: 0, orders: 0, revenueUsd: 0 };
      prev.clicks += f.clicks;
      prev.orders += f.orders;
      prev.revenueUsd += f.revenueUsd;
      countries.set(cc, prev);
    }
  }
  const countryRows = [...countries.entries()]
    .map(([country, v]) => ({ country, ...v }))
    .sort((a, b) => b.orders - a.orders || b.revenueUsd - a.revenueUsd);

  const seo = countryRows.slice(0, 8).map((c) => ({
    country: c.country,
    message:
      c.orders >= 5
        ? `${c.country} has proven demand (${c.orders} orders). Prioritize /spices landing pages and ads for this market.`
        : `${c.country} has interest (${c.clicks} clicks) but few orders. Do not build thin SEO pages until conversion is understood.`,
  }));

  return ok({
    days,
    snapshot,
    recommendations: recs,
    countries: countryRows,
    seo,
    quadrants: {
      high_click_high_order: ranked.filter((p) => p.quadrant === "high_click_high_order").slice(0, 15),
      high_click_low_order: ranked.filter((p) => p.quadrant === "high_click_low_order").slice(0, 15),
      low_click_high_order: ranked.filter((p) => p.quadrant === "low_click_high_order").slice(0, 15),
      low_click_low_order: ranked.filter((p) => p.quadrant === "low_click_low_order").slice(0, 15),
    },
  });
}
