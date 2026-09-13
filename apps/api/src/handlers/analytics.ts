import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  eventKeys,
  customerKeys,
  cartKeys,
  orderKeys,
  EVENT_TYPES,
  ORDER_STATUS,
  viewerGeoFromMetadata,
  inferViewerCountryCode,
  isRevenueOrder,
  getOrderPaidAt,
  applyContactFields,
  backfillContactsByIdentity,
  isKnownContact,
  ADMIN_ANALYTICS_TIMEZONE,
  rangeBusinessDays,
  businessDaysBetween,
  utcDayBucketsForBusinessDays,
  instantToBusinessDay,
  LIVE_VISITOR_TTL_SECONDS,
  approxGeoCoords,
  type Order,
  type LiveVisitor,
  type LiveVisitorsResponse,
} from "@spicycorner/shared";
import { docClient, EVENTS_TABLE, CUSTOMERS_TABLE, CARTS_TABLE, ORDERS_TABLE, dayBucket, now } from "../lib/db";
import { ok, forbidden, badRequest } from "../lib/response";
import { requireAdmin } from "../lib/auth";

type RollupItem = Record<string, unknown> & { SK: string; kind?: string; label?: string };

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

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

type DayListRange = {
  /** UTC GSI day keys to query events (may be longer than businessDays). */
  days: string[];
  /** Calendar days in Asia/Kolkata for charts / from-to display (chronological). */
  businessDays: string[];
  from: string;
  to: string;
  windowDays: number;
  timeZone: string;
};

/**
 * Inclusive day list for admin visitors/analytics.
 * Presets and from/to are interpreted in Asia/Kolkata (IST); event storage stays UTC.
 */
function parseDayList(
  event: APIGatewayProxyEventV2,
  fallbackDays = 7,
  max = 90
): DayListRange | { error: string } {
  const fromRaw = event.queryStringParameters?.from?.trim();
  const toRaw = event.queryStringParameters?.to?.trim();

  if (fromRaw || toRaw) {
    if (!fromRaw || !toRaw || !ISO_DAY.test(fromRaw) || !ISO_DAY.test(toRaw)) {
      return { error: "from and to must be YYYY-MM-DD" };
    }
    if (fromRaw > toRaw) return { error: "from must be on or before to" };

    const businessDays = businessDaysBetween(fromRaw, toRaw);
    if (!businessDays.length) return { error: "Invalid from/to date" };
    if (businessDays.length > max) {
      return { error: `Date range cannot exceed ${max} days` };
    }
    const days = utcDayBucketsForBusinessDays(businessDays);
    return {
      days,
      businessDays,
      from: fromRaw,
      to: toRaw,
      windowDays: businessDays.length,
      timeZone: ADMIN_ANALYTICS_TIMEZONE,
    };
  }

  const windowDays = parseDays(event, fallbackDays, max);
  const businessNewestFirst = rangeBusinessDays(windowDays);
  const businessDays = [...businessNewestFirst].reverse();
  const days = utcDayBucketsForBusinessDays(businessDays);
  return {
    days,
    businessDays,
    from: businessDays[0] ?? businessDayFallback(),
    to: businessDays[businessDays.length - 1] ?? businessDayFallback(),
    windowDays,
    timeZone: ADMIN_ANALYTICS_TIMEZONE,
  };
}

function businessDayFallback(): string {
  return rangeBusinessDays(1)[0] ?? dayBucket();
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

/** Fields needed to rebuild SessionSummary — avoid pulling full event payloads. */
const SESSION_EVENT_PROJECTION =
  "sessionId, #type, createdAt, #at, #path, productSlug, referrer, metadata";
const SESSION_EVENT_ATTR_NAMES = {
  "#type": "type",
  "#at": "at",
  "#path": "path",
};

/** Paginate GSI1 so we collect every event for a type/day (not just the first page). */
async function querySessionEventsForDay(
  type: string,
  day: string
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: EVENTS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": eventKeys.gsi1pk(type, day) },
        ProjectionExpression: SESSION_EVENT_PROJECTION,
        ExpressionAttributeNames: SESSION_EVENT_ATTR_NAMES,
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of (res.Items ?? []) as Record<string, unknown>[]) {
      items.push(item);
    }
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return items;
}

async function mapInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(fn));
  }
}

/** Run async work over items with a concurrency cap (cuts wall-clock vs serial awaits). */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return results;
}

const EVENT_QUERY_CONCURRENCY = 12;

const FUNNEL_TYPES = [
  EVENT_TYPES.PAGE_VIEW,
  EVENT_TYPES.PRODUCT_VIEW,
  EVENT_TYPES.CART_ADD,
  EVENT_TYPES.CHECKOUT_START,
  EVENT_TYPES.PURCHASE,
] as const;

export async function getAnalyticsOverview(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const dayList = rangeDays(days);

  const rollups = await Promise.all(dayList.map((d) => getRollup(d)));

  const totals: Record<string, number> = {};
  const trafficByDay: { day: string; pageViews: number; purchases: number }[] = [];

  dayList.forEach((day, idx) => {
    const items = rollups[idx];
    let pageViews = 0;
    let purchases = 0;
    for (const item of items) {
      if (item.kind === "type") {
        const count = Number(item.count ?? 0);
        totals[item.label as string] = (totals[item.label as string] ?? 0) + count;
        if (item.label === EVENT_TYPES.PAGE_VIEW) pageViews = count;
        if (item.label === EVENT_TYPES.PURCHASE) purchases = count;
      }
    }
    trafficByDay.push({ day, pageViews, purchases });
  });

  // chronological order (oldest first) for charts
  trafficByDay.reverse();

  const funnel = FUNNEL_TYPES.map((type) => ({ type, count: totals[type] ?? 0 }));
  const pageViews = totals[EVENT_TYPES.PAGE_VIEW] ?? 0;
  const purchases = totals[EVENT_TYPES.PURCHASE] ?? 0;
  const conversionRate = pageViews > 0 ? purchases / pageViews : 0;

  return ok({
    days,
    totals,
    funnel,
    trafficByDay,
    conversionRate,
  });
}

export async function getTopProducts(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const rollups = await Promise.all(rangeDays(days).map((d) => getRollup(d)));

  const map = new Map<string, { slug: string; views: number; adds: number }>();
  for (const items of rollups) {
    for (const item of items) {
      if (item.kind !== "product") continue;
      const slug = item.label as string;
      const entry = map.get(slug) ?? { slug, views: 0, adds: 0 };
      entry.views += Number(item.views ?? 0);
      entry.adds += Number(item.adds ?? 0);
      map.set(slug, entry);
    }
  }

  const products = [...map.values()].sort((a, b) => b.views - a.views).slice(0, 25);
  return ok({ days, products });
}

export async function getTopSearches(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const rollups = await Promise.all(rangeDays(days).map((d) => getRollup(d)));

  const map = new Map<string, { term: string; count: number; zero: number }>();
  for (const items of rollups) {
    for (const item of items) {
      if (item.kind !== "search") continue;
      const term = item.label as string;
      const entry = map.get(term) ?? { term, count: 0, zero: 0 };
      entry.count += Number(item.count ?? 0);
      entry.zero += Number(item.zero ?? 0);
      map.set(term, entry);
    }
  }

  const all = [...map.values()].sort((a, b) => b.count - a.count);
  const searches = all.slice(0, 25);
  const zeroResult = all.filter((s) => s.zero > 0).sort((a, b) => b.zero - a.zero).slice(0, 25);
  return ok({ days, searches, zeroResult });
}

interface SessionSummary {
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  lastPath?: string;
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  region?: string;
  regionName?: string;
  timezone?: string;
  locale?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  purchased?: boolean;
  checkoutStarted?: boolean;
  cartAdds?: number;
  hasCart?: boolean;
  cartItems?: number;
  activeDurationMs?: number;
  pages: string[];
  products: string[];
}

type SessionCollectCacheEntry = { at: number; list: SessionSummary[] };
/** Warm-Lambda cache: identical day windows reuse rebuilt sessions for ~60s. */
const SESSION_COLLECT_CACHE = new Map<string, SessionCollectCacheEntry>();
const SESSION_COLLECT_TTL_MS = 60_000;

function trimSessionForList(s: SessionSummary): SessionSummary {
  return {
    ...s,
    pages: s.pages.slice(0, 12),
    products: s.products.slice(0, 12),
  };
}

const SESSION_EVENT_TYPES = [
  EVENT_TYPES.PAGE_VIEW,
  EVENT_TYPES.PRODUCT_VIEW,
  EVENT_TYPES.CART_ADD,
  EVENT_TYPES.CART_REMOVE,
  EVENT_TYPES.CHECKOUT_START,
  EVENT_TYPES.PURCHASE,
  EVENT_TYPES.SEARCH,
  EVENT_TYPES.SESSION_PING,
] as const;

function mergeContactFields(
  target: SessionSummary,
  fields: { name?: string; email?: string; phone?: string }
) {
  applyContactFields(target, fields);
}

async function enrichSessionIdentity(s: SessionSummary): Promise<void> {
  const pk = customerKeys.pk(s.sessionId);

  const profileRes = await docClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: { PK: pk, SK: customerKeys.profileSk() },
    })
  );
  if (profileRes.Item) {
    mergeContactFields(s, {
      name: profileRes.Item.name as string | undefined,
      email: profileRes.Item.email as string | undefined,
      phone: profileRes.Item.phone as string | undefined,
    });
  }

  if (!s.email || !s.name || !s.phone) {
    const leadsRes = await docClient.send(
      new QueryCommand({
        TableName: CUSTOMERS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": pk, ":sk": "LEAD#" },
        ScanIndexForward: false,
        Limit: 20,
      })
    );
    for (const lead of leadsRes.Items ?? []) {
      mergeContactFields(s, {
        name: lead.name as string | undefined,
        email: lead.email as string | undefined,
        phone: lead.phone as string | undefined,
      });
      if (s.name && s.email && s.phone) break;
    }
  }

  const cartRes = await docClient.send(
    new GetCommand({
      TableName: CARTS_TABLE,
      Key: { PK: cartKeys.pk(s.sessionId), SK: cartKeys.sk() },
    })
  );
  if (cartRes.Item) {
    const itemCount = Number(cartRes.Item.itemCount ?? 0);
    if (itemCount > 0) {
      s.hasCart = true;
      s.cartItems = itemCount;
    }
    mergeContactFields(s, {
      name: cartRes.Item.name as string | undefined,
      email: cartRes.Item.email as string | undefined,
      phone: cartRes.Item.phone as string | undefined,
    });
  }
}

/**
 * Attach lead contact for sessions that still lack identity.
 * Bounded parallel queries — avoids scanning the entire lead GSI as it grows.
 */
async function attachLeadContacts(list: SessionSummary[], maxLookups = 600): Promise<void> {
  const missing = list.filter((s) => !isKnownContact(s)).slice(0, maxLookups);
  if (!missing.length) return;

  await mapInBatches(missing, 40, async (s) => {
    const pk = customerKeys.pk(s.sessionId);
    const leadsRes = await docClient.send(
      new QueryCommand({
        TableName: CUSTOMERS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": pk, ":sk": "LEAD#" },
        ProjectionExpression: "#n, email, phone",
        ExpressionAttributeNames: { "#n": "name" },
        ScanIndexForward: false,
        Limit: 8,
      })
    );
    for (const lead of leadsRes.Items ?? []) {
      mergeContactFields(s, {
        name: lead.name as string | undefined,
        email: lead.email as string | undefined,
        phone: lead.phone as string | undefined,
      });
      if (s.name && s.email && s.phone) break;
    }
  });
}

function mergeSessionEvent(
  sessions: Map<string, SessionSummary>,
  raw: Record<string, unknown>,
  sessionId: string
) {
  const at = (raw.createdAt as string) ?? (raw.at as string) ?? now();
  const path = raw.path as string | undefined;
  const productSlug = raw.productSlug as string | undefined;
  const metadata = (raw.metadata as Record<string, string> | undefined) ?? {};
  const geo = viewerGeoFromMetadata(metadata);
  const eventType = (raw.type as string | undefined) ?? "";

  if (eventType === EVENT_TYPES.SESSION_PING) {
    const pingMs = Number(metadata.durationMs ?? 0);
    if (pingMs > 0) {
      const existingPing = sessions.get(sessionId);
      const useFloor = metadata.durationMode === "floor" || metadata.reason === "daily_deal_shown";
      if (existingPing) {
        existingPing.activeDurationMs = useFloor
          ? Math.max(existingPing.activeDurationMs ?? 0, pingMs)
          : (existingPing.activeDurationMs ?? 0) + pingMs;
        existingPing.eventCount += 1;
        if (at > existingPing.lastSeen) existingPing.lastSeen = at;
        if (at < existingPing.firstSeen) existingPing.firstSeen = at;
      } else {
        sessions.set(sessionId, {
          sessionId,
          firstSeen: at,
          lastSeen: at,
          eventCount: 1,
          activeDurationMs: pingMs,
          country: geo.country,
          city: geo.city,
          region: geo.region,
          regionName: geo.regionName,
          timezone: metadata.timezone,
          locale: metadata.locale,
          referrer: (raw.referrer as string | undefined) ?? undefined,
          deviceType: metadata.deviceType,
          browser: metadata.browser,
          os: metadata.os,
          pages: [],
          products: [],
        });
      }
      mergeContactFields(sessions.get(sessionId)!, {
        name: metadata.name,
        email: metadata.email,
        phone: metadata.phone,
      });
    }
    return;
  }

  const existing = sessions.get(sessionId);
  if (!existing) {
    sessions.set(sessionId, {
      sessionId,
      firstSeen: at,
      lastSeen: at,
      eventCount: 1,
      lastPath: path,
      country: geo.country,
      city: geo.city,
      region: geo.region,
      regionName: geo.regionName,
      timezone: metadata.timezone,
      locale: metadata.locale,
      referrer: (raw.referrer as string | undefined) ?? undefined,
      deviceType: metadata.deviceType,
      browser: metadata.browser,
      os: metadata.os,
      purchased: eventType === EVENT_TYPES.PURCHASE,
      pages: path ? [path] : [],
      products: productSlug ? [productSlug] : [],
    });
    return;
  }

  existing.eventCount += 1;
  if (eventType === EVENT_TYPES.PURCHASE) existing.purchased = true;
  if (eventType === EVENT_TYPES.CHECKOUT_START) existing.checkoutStarted = true;
  if (eventType === EVENT_TYPES.CART_ADD) existing.cartAdds = (existing.cartAdds ?? 0) + 1;
  mergeContactFields(existing, {
    name: metadata.name,
    email: metadata.email,
    phone: metadata.phone,
  });
  if (at > existing.lastSeen) {
    existing.lastSeen = at;
    existing.lastPath = path ?? existing.lastPath;
    if (geo.country) existing.country = geo.country;
    if (geo.city) existing.city = geo.city;
    if (geo.region) existing.region = geo.region;
    if (geo.regionName) existing.regionName = geo.regionName;
    if (metadata.timezone) existing.timezone = metadata.timezone;
    if (metadata.locale) existing.locale = metadata.locale;
  }
  if (at < existing.firstSeen) existing.firstSeen = at;
  if (!existing.referrer && raw.referrer) existing.referrer = raw.referrer as string;
  if (path && !existing.pages.includes(path)) existing.pages.push(path);
  if (productSlug && !existing.products.includes(productSlug)) existing.products.push(productSlug);
  if (!existing.country && geo.country) existing.country = geo.country;
  if (!existing.city && geo.city) existing.city = geo.city;
  if (!existing.region && geo.region) existing.region = geo.region;
  if (!existing.regionName && geo.regionName) existing.regionName = geo.regionName;
  if (!existing.timezone && metadata.timezone) existing.timezone = metadata.timezone;
  if (!existing.locale && metadata.locale) existing.locale = metadata.locale;
  if (!existing.deviceType && metadata.deviceType) existing.deviceType = metadata.deviceType;
  if (!existing.browser && metadata.browser) existing.browser = metadata.browser;
  if (!existing.os && metadata.os) existing.os = metadata.os;
}

async function collectSessionsForDayList(dayList: string[]): Promise<SessionSummary[]> {
  const cacheKey = dayList.join(",");
  const cached = SESSION_COLLECT_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < SESSION_COLLECT_TTL_MS) {
    return cached.list.map((s) => ({ ...s, pages: [...s.pages], products: [...s.products] }));
  }

  const sessions = new Map<string, SessionSummary>();
  const jobs = dayList.flatMap((day) =>
    SESSION_EVENT_TYPES.map((type) => ({ day, type: type as string }))
  );

  // Parallel GSI queries (bounded) — biggest wall-clock win vs nested serial awaits.
  const batches = await mapPool(jobs, EVENT_QUERY_CONCURRENCY, async ({ day, type }) =>
    querySessionEventsForDay(type, day)
  );
  for (const items of batches) {
    for (const raw of items) {
      const sessionId = raw.sessionId as string;
      if (!sessionId) continue;
      mergeSessionEvent(sessions, raw, sessionId);
    }
  }

  let list = [...sessions.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  // Full profile/cart/lead lookup for commerce-active or already-identified sessions.
  const needsEnrich = list.filter(
    (s) =>
      isKnownContact(s) ||
      (s.cartAdds ?? 0) > 0 ||
      Boolean(s.checkoutStarted) ||
      Boolean(s.purchased)
  );
  await mapInBatches(needsEnrich, 25, (s) => enrichSessionIdentity(s));

  // Light lead join for remaining anonymous (capped) — no full lead-index scan.
  await attachLeadContacts(list);

  list = backfillContactsByIdentity(list);
  SESSION_COLLECT_CACHE.set(cacheKey, { at: Date.now(), list });
  // Bound cache size (warm Lambda reuse)
  if (SESSION_COLLECT_CACHE.size > 24) {
    const oldest = [...SESSION_COLLECT_CACHE.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) SESSION_COLLECT_CACHE.delete(oldest[0]);
  }
  return list;
}

export async function listSessions(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const range = parseDayList(event, 7, 90);
  if ("error" in range) return badRequest(range.error);
  const identityFilter = (event.queryStringParameters?.identity ?? "all").toLowerCase();

  let list = await collectSessionsForDayList(range.days);

  const knownCount = list.filter((s) => isKnownContact(s)).length;
  const anonymousCount = list.length - knownCount;

  if (identityFilter === "known") {
    list = list.filter((s) => isKnownContact(s));
  } else if (identityFilter === "anonymous") {
    list = list.filter((s) => !isKnownContact(s));
  }

  return ok({
    days: range.windowDays,
    from: range.from,
    to: range.to,
    timeZone: range.timeZone,
    sessions: list.map(trimSessionForList),
    identity: { known: knownCount, anonymous: anonymousCount },
    total: list.length,
  });
}

/** Active storefront visitors (presence TTL rows on the events table). */
export async function listLiveVisitors(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: EVENTS_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": eventKeys.presencePk() },
        ExclusiveStartKey,
        Limit: 200,
      })
    );
    items.push(...((res.Items ?? []) as Record<string, unknown>[]));
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  const cutoffMs = Date.now() - LIVE_VISITOR_TTL_SECONDS * 1000;
  const nowIso = now();
  const visitors: LiveVisitor[] = [];

  for (const item of items) {
    const lastSeen = typeof item.lastSeen === "string" ? item.lastSeen : "";
    if (!lastSeen) continue;
    const lastMs = Date.parse(lastSeen);
    if (!Number.isFinite(lastMs) || lastMs < cutoffMs) continue;
    const path = typeof item.path === "string" ? item.path : "/";
    if (path.startsWith("/admin") || path.startsWith("/ses-email")) continue;

    const country = typeof item.country === "string" ? item.country : undefined;
    const city = typeof item.city === "string" ? item.city : undefined;
    const region = typeof item.region === "string" ? item.region : undefined;
    const { lat, lng } = approxGeoCoords({ country, city, region });

    visitors.push({
      sessionId: String(item.sessionId ?? ""),
      lastSeen,
      firstSeen: typeof item.firstSeen === "string" ? item.firstSeen : undefined,
      path,
      country,
      city,
      region,
      regionName: typeof item.regionName === "string" ? item.regionName : undefined,
      timezone: typeof item.timezone === "string" ? item.timezone : undefined,
      locale: typeof item.locale === "string" ? item.locale : undefined,
      deviceType: typeof item.deviceType === "string" ? item.deviceType : undefined,
      browser: typeof item.browser === "string" ? item.browser : undefined,
      os: typeof item.os === "string" ? item.os : undefined,
      referrer: typeof item.referrer === "string" ? item.referrer : undefined,
      name: typeof item.name === "string" ? item.name : undefined,
      email: typeof item.email === "string" ? item.email : undefined,
      phone: typeof item.phone === "string" ? item.phone : undefined,
      lat,
      lng,
      secondsAgo: Math.max(0, Math.round((Date.now() - lastMs) / 1000)),
    });
  }

  visitors.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  const countryCounts = new Map<string, number>();
  for (const v of visitors) {
    const key = (v.country || "??").toUpperCase();
    countryCounts.set(key, (countryCounts.get(key) ?? 0) + 1);
  }
  const byCountry = [...countryCounts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  const payload: LiveVisitorsResponse = {
    generatedAt: nowIso,
    activeWithinSeconds: LIVE_VISITOR_TTL_SECONDS,
    activeCount: visitors.length,
    visitors,
    byCountry,
  };
  return ok(payload);
}

export async function getVisitorAnalytics(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const range = parseDayList(event, 7, 90);
  if ("error" in range) return badRequest(range.error);

  const list = await collectSessionsForDayList(range.days);
  const knownCount = list.filter((s) => isKnownContact(s)).length;
  const anonymousCount = list.length - knownCount;
  const purchased = list.filter((s) => s.purchased).length;
  const checkoutStarted = list.filter((s) => s.checkoutStarted).length;
  const withCart = list.filter((s) => s.hasCart || (s.cartAdds ?? 0) > 0).length;

  type CountryAgg = {
    country: string;
    visitors: number;
    purchased: number;
    checkoutStarted: number;
    withCart: number;
    identified: number;
    events: number;
    devices: Record<string, number>;
    inferred?: boolean;
  };

  const byCountryMap = new Map<string, CountryAgg>();
  for (const s of list) {
    const inferred = inferViewerCountryCode(
      {
        country: s.country,
        city: s.city,
        region: s.region,
        regionName: s.regionName,
      },
      { timezone: s.timezone, locale: s.locale }
    );
    const country = (inferred || "Unknown").toUpperCase();
    const row =
      byCountryMap.get(country) ??
      ({
        country,
        visitors: 0,
        purchased: 0,
        checkoutStarted: 0,
        withCart: 0,
        identified: 0,
        events: 0,
        devices: {},
        inferred: !s.country && Boolean(inferred),
      } satisfies CountryAgg);
    row.visitors += 1;
    row.events += s.eventCount;
    if (s.purchased) row.purchased += 1;
    if (s.checkoutStarted) row.checkoutStarted += 1;
    if (s.hasCart || (s.cartAdds ?? 0) > 0) row.withCart += 1;
    if (isKnownContact(s)) row.identified += 1;
    if (!s.country && inferred) row.inferred = true;
    const device = s.deviceType || "unknown";
    row.devices[device] = (row.devices[device] ?? 0) + 1;
    byCountryMap.set(country, row);
  }

  const byCountry = [...byCountryMap.values()]
    .map((row) => ({
      ...row,
      share: list.length ? row.visitors / list.length : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);

  /**
   * Unique sessions per IST calendar day (last activity in range).
   * Matches totalVisitors: every session in `list` is counted exactly once.
   */
  type DayAgg = {
    day: string;
    visitors: number;
    known: number;
    anonymous: number;
    purchased: number;
    checkoutStarted: number;
    withCart: number;
    events: number;
  };
  const byDayMap = new Map<string, DayAgg>();
  for (const day of range.businessDays) {
    byDayMap.set(day, {
      day,
      visitors: 0,
      known: 0,
      anonymous: 0,
      purchased: 0,
      checkoutStarted: 0,
      withCart: 0,
      events: 0,
    });
  }
  const fallbackDay = range.businessDays[range.businessDays.length - 1];
  for (const s of list) {
    const lastDay = instantToBusinessDay(s.lastSeen);
    const firstDay = instantToBusinessDay(s.firstSeen);
    const day =
      (lastDay && byDayMap.has(lastDay) ? lastDay : undefined) ||
      (firstDay && byDayMap.has(firstDay) ? firstDay : undefined) ||
      fallbackDay;
    if (!day || !byDayMap.has(day)) continue;
    const row = byDayMap.get(day)!;
    row.visitors += 1;
    row.events += s.eventCount ?? 0;
    if (isKnownContact(s)) row.known += 1;
    else row.anonymous += 1;
    if (s.purchased) row.purchased += 1;
    if (s.checkoutStarted) row.checkoutStarted += 1;
    if (s.hasCart || (s.cartAdds ?? 0) > 0) row.withCart += 1;
  }
  const byDay = range.businessDays.map((day) => byDayMap.get(day)!);

  return ok({
    days: range.windowDays,
    from: range.from,
    to: range.to,
    timeZone: range.timeZone,
    stats: {
      totalVisitors: list.length,
      known: knownCount,
      anonymous: anonymousCount,
      purchased,
      checkoutStarted,
      withCart,
      countries: byCountry.length,
    },
    byDay,
    byCountry,
    sessions: list.map(trimSessionForList),
  });
}

export async function getSessionTimeline(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const sessionId = event.pathParameters?.sessionId;
  if (!sessionId) return badRequest("Session id required");

  const eventsRes = await docClient.send(
    new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": eventKeys.pk(sessionId) },
      ScanIndexForward: true,
    })
  );

  const identityRes = await docClient.send(
    new QueryCommand({
      TableName: CUSTOMERS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": customerKeys.pk(sessionId) },
    })
  );

  const identityItems = (identityRes.Items ?? []) as Record<string, unknown>[];
  const profile = identityItems.find((i) => i.SK === customerKeys.profileSk());
  const leads = identityItems.filter((i) => String(i.SK).startsWith("LEAD#"));

  return ok({
    sessionId,
    profile: profile ?? null,
    leads,
    events: eventsRes.Items ?? [],
  });
}

function trafficSourceLabel(referrer?: string): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("google")) return "Google";
    if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("bing")) return "Bing";
    if (host.includes("spicycorner")) return "Internal";
    return host;
  } catch {
    return referrer.slice(0, 40);
  }
}

async function collectSessions(days: number): Promise<Map<string, SessionSummary>> {
  const dayList = rangeDays(days);
  // Insights only needs funnel-ish fields — skip high-volume session_ping partition.
  const types = SESSION_EVENT_TYPES.filter((t) => t !== EVENT_TYPES.SESSION_PING);
  const sessions = new Map<string, SessionSummary>();
  const jobs = dayList.flatMap((day) => types.map((type) => ({ day, type: type as string })));
  const batches = await mapPool(jobs, EVENT_QUERY_CONCURRENCY, async ({ day, type }) =>
    querySessionEventsForDay(type, day)
  );
  for (const items of batches) {
    for (const raw of items) {
      const sessionId = raw.sessionId as string;
      if (!sessionId) continue;
      mergeSessionEvent(sessions, raw, sessionId);
    }
  }
  return sessions;
}

async function fetchPaidOrdersSince(isoFrom: string): Promise<Order[]> {
  const items: Order[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk AND GSI2SK >= :from",
        ExpressionAttributeValues: {
          ":pk": orderKeys.gsi2pk(),
          ":from": isoFrom,
        },
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false,
      })
    );
    items.push(...((res.Items ?? []) as Order[]));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

export async function getAnalyticsInsights(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event, 7, 90);
  const dayList = rangeDays(days);
  const fromIso = new Date();
  fromIso.setUTCDate(fromIso.getUTCDate() - days);
  const fromIsoStr = fromIso.toISOString();

  const [sessions, orders] = await Promise.all([
    collectSessions(days),
    fetchPaidOrdersSince(fromIsoStr),
  ]);

  const sessionList = [...sessions.values()];

  const byLocation = new Map<
    string,
    { location: string; orderCount: number; revenueUSD: number; revenueINR: number }
  >();
  for (const order of orders) {
    if (!isRevenueOrder(order.status) || order.status === ORDER_STATUS.PENDING_PAYMENT) continue;
    const paidAt = getOrderPaidAt(order);
    if (!paidAt || paidAt < fromIsoStr) continue;

    const state = order.shippingAddress?.state?.trim();
    const country = order.shippingAddress?.country?.trim() ?? "Unknown";
    const location = state ? `${state}, ${country}` : country;
    const entry = byLocation.get(location) ?? {
      location,
      orderCount: 0,
      revenueUSD: 0,
      revenueINR: 0,
    };
    entry.orderCount += 1;
    if (order.currency === "USD") entry.revenueUSD += order.total;
    else entry.revenueINR += order.total;
    byLocation.set(location, entry);
  }

  const byTraffic = new Map<
    string,
    { source: string; visitors: number; orders: number }
  >();
  const byDevice = new Map<string, number>();
  const byBrowser = new Map<string, number>();
  const byOs = new Map<string, number>();

  for (const s of sessionList) {
    const source = trafficSourceLabel(s.referrer);
    const t = byTraffic.get(source) ?? { source, visitors: 0, orders: 0 };
    t.visitors += 1;
    if (s.purchased) t.orders += 1;
    byTraffic.set(source, t);

    const device = s.deviceType ?? "Unknown";
    byDevice.set(device, (byDevice.get(device) ?? 0) + 1);
    const browser = s.browser ?? "Unknown";
    byBrowser.set(browser, (byBrowser.get(browser) ?? 0) + 1);
    const os = s.os ?? "Unknown";
    byOs.set(os, (byOs.get(os) ?? 0) + 1);
  }

  const rollups = await Promise.all(dayList.map((d) => getRollup(d)));
  const ordersByDay: { day: string; orders: number; pageViews: number }[] = [];
  dayList.forEach((day, idx) => {
    const items = rollups[idx];
    let pageViews = 0;
    let orders = 0;
    for (const item of items) {
      if (item.kind !== "type") continue;
      if (item.label === EVENT_TYPES.PAGE_VIEW) pageViews = Number(item.count ?? 0);
      if (item.label === EVENT_TYPES.PURCHASE) orders = Number(item.count ?? 0);
    }
    ordersByDay.push({ day, orders, pageViews });
  });
  ordersByDay.reverse();

  return ok({
    days,
    byLocation: [...byLocation.values()].sort((a, b) => b.orderCount - a.orderCount).slice(0, 25),
    byTrafficSource: [...byTraffic.values()]
      .map((t) => ({
        ...t,
        conversionRate: t.visitors > 0 ? t.orders / t.visitors : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 20),
    byDevice: [...byDevice.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    byBrowser: [...byBrowser.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    byOs: [...byOs.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    ordersByDay,
  });
}

export async function getChatAnalytics(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const rollups = await Promise.all(rangeDays(days).map((d) => getRollup(d)));

  const totals = {
    opens: 0,
    closes: 0,
    messages: 0,
    searches: 0,
    productClicks: 0,
    addToCarts: 0,
    impressions: 0,
    orders: 0,
    revenueUsd: 0,
  };
  const intents = new Map<string, number>();
  const searches = new Map<string, { term: string; count: number; zero: number }>();
  const unfulfilled = new Map<string, { term: string; count: number }>();
  const products = new Map<string, { slug: string; impressions: number; clicks: number; adds: number }>();
  const countries = new Map<string, number>();

  for (const items of rollups) {
    for (const item of items) {
      const label = String(item.label ?? "");
      if (item.kind === "type") {
        if (label === EVENT_TYPES.CHAT_OPEN) totals.opens += Number(item.count ?? 0);
        if (label === EVENT_TYPES.CHAT_CLOSE) totals.closes += Number(item.count ?? 0);
        if (label === EVENT_TYPES.CHAT_MESSAGE) totals.messages += Number(item.count ?? 0);
      }
      if (item.kind === "chat_intent") {
        intents.set(label, (intents.get(label) ?? 0) + Number(item.count ?? 0));
      }
      if (item.kind === "chat_search") {
        const entry = searches.get(label) ?? { term: label, count: 0, zero: 0 };
        entry.count += Number(item.count ?? 0);
        entry.zero += Number(item.zero ?? 0);
        searches.set(label, entry);
        totals.searches += Number(item.count ?? 0);
      }
      if (item.kind === "chat_unfulfilled") {
        const entry = unfulfilled.get(label) ?? { term: label, count: 0 };
        entry.count += Number(item.count ?? 0);
        unfulfilled.set(label, entry);
      }
      if (item.kind === "chat_product") {
        const entry = products.get(label) ?? { slug: label, impressions: 0, clicks: 0, adds: 0 };
        entry.impressions += Number(item.impressions ?? 0);
        entry.clicks += Number(item.clicks ?? 0);
        entry.adds += Number(item.adds ?? 0);
        products.set(label, entry);
        totals.impressions += Number(item.impressions ?? 0);
        totals.productClicks += Number(item.clicks ?? 0);
        totals.addToCarts += Number(item.adds ?? 0);
      }
      if (item.kind === "chat_country") {
        countries.set(label, (countries.get(label) ?? 0) + Number(item.count ?? 0));
      }
      if (item.kind === "source" && label === "chat_assistant") {
        totals.orders += Number(item.orders ?? 0);
        totals.revenueUsd += Number(item.revenueUsd ?? 0);
      }
    }
  }

  const intentTotal = [...intents.values()].reduce((a, b) => a + b, 0) || 1;
  return ok({
    days,
    totals,
    conversionRate: totals.opens > 0 ? totals.orders / totals.opens : 0,
    revenuePerSession: totals.opens > 0 ? totals.revenueUsd / totals.opens : 0,
    intents: [...intents.entries()]
      .map(([intent, count]) => ({ intent, count, share: count / intentTotal }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    searches: [...searches.values()].sort((a, b) => b.count - a.count).slice(0, 25),
    unfulfilled: [...unfulfilled.values()].sort((a, b) => b.count - a.count).slice(0, 25),
    products: [...products.values()].sort((a, b) => b.clicks + b.adds - (a.clicks + a.adds)).slice(0, 25),
    countries: [...countries.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
  });
}
