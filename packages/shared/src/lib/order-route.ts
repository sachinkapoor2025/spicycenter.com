import {
  assistedFromTouches,
  extractCampaignParams,
  formatTrafficTouchLabel,
  isAcquisitionTouch,
  overallAttributionConfidence,
  resolveTrafficSource,
  touchKey,
} from "./attribution";
import type { OrderAttribution, OrderRouteEvent, TrafficTouch } from "../schemas/attribution";
import type { Order } from "../schemas/order";

export type RawAnalyticsEvent = {
  eventId?: string;
  type?: string;
  createdAt?: string;
  at?: string;
  path?: string;
  productSlug?: string;
  referrer?: string;
  metadata?: Record<string, string>;
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page View",
  product_view: "Product Page",
  search: "Search",
  cart_add: "Add to Cart",
  cart_remove: "Remove from Cart",
  checkout_start: "Begin Checkout",
  purchase: "Payment / Purchase",
  session_ping: "Session Activity",
};

function eventTime(e: RawAnalyticsEvent): string {
  return (e.createdAt || e.at || "") as string;
}

function labelForEvent(e: RawAnalyticsEvent): string {
  const type = e.type ?? "event";
  if (type === "product_view" && e.productSlug) return `Product: ${e.productSlug}`;
  if (type === "page_view" && e.path) {
    const pathOnly = e.path.split("?")[0] || e.path;
    if (pathOnly === "/") return "Landing Page / Home";
    if (pathOnly.startsWith("/products/")) return "Product Page";
    if (pathOnly.startsWith("/cart")) return "Cart";
    if (pathOnly.startsWith("/checkout")) return "Checkout";
    if (pathOnly.includes("rakhi")) return pathOnly;
    return pathOnly;
  }
  return EVENT_LABELS[type] ?? type;
}

/** Reconstruct acquisition touches from session events (legacy orders / backfill). */
export function reconstructTouchesFromEvents(events: RawAnalyticsEvent[]): TrafficTouch[] {
  const touches: TrafficTouch[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if (e.type === "session_ping") continue;
    const pageUrl = e.path;
    const touch = resolveTrafficSource({
      pageUrl,
      referrer: e.referrer,
      at: eventTime(e),
    });
    if (!isAcquisitionTouch(touch) || touch.source === "internal") continue;
    // Skip low-confidence direct unless it is the only signal later
    const key = touchKey(touch);
    if (seen.has(key)) continue;
    // Prefer first high/medium confidence occurrence of a source
    if (touch.source === "direct" && touch.confidence === "low") {
      // keep for later if nothing else
      continue;
    }
    seen.add(key);
    touches.push(touch);
  }
  // If nothing but we had page views with no referrer, add a single low-confidence direct
  if (!touches.length) {
    const first = events.find((e) => e.type === "page_view" || e.path);
    if (first) {
      touches.push(
        resolveTrafficSource({
          pageUrl: first.path,
          referrer: first.referrer,
          at: eventTime(first),
        })
      );
    }
  }
  return touches;
}

export function buildTimeline(
  events: RawAnalyticsEvent[],
  order: Order
): OrderRouteEvent[] {
  const timeline: OrderRouteEvent[] = [];
  for (const e of events) {
    if (e.type === "session_ping") {
      const reason = e.metadata?.reason;
      if (reason === "live_presence") continue;
    }
    const touch = resolveTrafficSource({
      pageUrl: e.path,
      referrer: e.referrer,
      at: eventTime(e),
    });
    const { utm } = extractCampaignParams(e.path);
    timeline.push({
      eventId: e.eventId,
      eventType: e.type ?? "event",
      timestamp: eventTime(e) || order.createdAt,
      label: labelForEvent(e),
      pageUrl: e.path,
      productSlug: e.productSlug,
      source: isAcquisitionTouch(touch) && touch.source !== "internal" ? touch.source : undefined,
      medium: isAcquisitionTouch(touch) && touch.source !== "internal" ? touch.medium : undefined,
      campaign: utm.campaign || touch.campaign,
      referrer: e.referrer,
      confidence: touch.confidence,
      confidenceReason: touch.confidenceReason,
      metadata: e.metadata,
    });
  }

  timeline.push({
    eventType: "order_created",
    timestamp: order.createdAt,
    label: "Order Created",
    pageUrl: "/checkout",
    source: order.attribution?.lastTouch?.source ?? order.attribution?.conversionTouch?.source,
    medium: order.attribution?.lastTouch?.medium ?? order.attribution?.conversionTouch?.medium,
    campaign: order.attribution?.lastTouch?.campaign,
    confidence: order.attribution?.lastTouch?.confidence,
  });

  return timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export type OrderRouteResponse = {
  orderId: string;
  orderNumber?: string;
  customerEmail?: string;
  customerName?: string;
  sessionId?: string;
  visitorId?: string;
  orderCreatedAt: string;
  attribution: OrderAttribution;
  summary: {
    firstTouchLabel: string;
    lastTouchLabel: string;
    conversionLabel: string;
    confidence: string;
    confidenceReason?: string;
    sessionsBeforePurchase?: number;
    pagesViewed: number;
    daysToConversion?: number;
    device?: string;
    browser?: string;
    os?: string;
    location?: string;
    landingPage?: string;
    referrer?: string;
    primaryCampaign?: string;
  };
  timeline: OrderRouteEvent[];
  eventsAvailable: number;
  eventsNote?: string;
};

/** Lean row for Analytics → Order routes overview. */
export type OrderRouteListItem = {
  orderId: string;
  orderNumber?: string;
  orderCreatedAt: string;
  customerName?: string;
  customerEmail?: string;
  total: number;
  currency: "USD" | "INR";
  status: string;
  paymentProvider?: string;
  firstTouchLabel: string;
  lastTouchLabel: string;
  firstSource?: string;
  lastSource?: string;
  medium?: string;
  campaign?: string;
  confidence: string;
  landingPage?: string;
  referrer?: string;
  device?: string;
  /** True when checkout stamped attribution on the order. */
  hasAttributionSnapshot: boolean;
  /** Where overview fields came from. */
  attributionOrigin: "checkout_snapshot" | "session_events" | "none";
};

export function buildOrderRouteListItem(
  order: Order,
  events: RawAnalyticsEvent[] = []
): OrderRouteListItem {
  const hasSnapshot = Boolean(order.attribution?.firstTouch || order.attribution?.lastTouch);
  const route = buildOrderRoutePayload(order, events);
  const first = route.attribution.firstTouch;
  const last = route.attribution.lastTouch;
  const hasUseful =
    Boolean(first?.source && first.source !== "unknown") ||
    Boolean(last?.source && last.source !== "unknown") ||
    Boolean(route.summary.landingPage) ||
    Boolean(route.summary.device);

  let attributionOrigin: OrderRouteListItem["attributionOrigin"] = "none";
  if (hasSnapshot) attributionOrigin = "checkout_snapshot";
  else if (events.length > 0 && hasUseful) attributionOrigin = "session_events";

  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    orderCreatedAt: order.createdAt,
    customerName: order.shippingAddress?.name,
    customerEmail: order.shippingAddress?.email,
    total: order.total,
    currency: order.currency === "INR" ? "INR" : "USD",
    status: order.status,
    paymentProvider: order.paymentProvider,
    firstTouchLabel: route.summary.firstTouchLabel,
    lastTouchLabel: route.summary.lastTouchLabel,
    firstSource: first?.source,
    lastSource: last?.source,
    medium: last?.medium ?? first?.medium,
    campaign: route.summary.primaryCampaign,
    confidence: route.summary.confidence,
    landingPage: route.summary.landingPage,
    referrer: route.summary.referrer,
    device: route.summary.device,
    hasAttributionSnapshot: hasSnapshot,
    attributionOrigin,
  };
}

export function buildOrderRoutePayload(
  order: Order,
  events: RawAnalyticsEvent[]
): OrderRouteResponse {
  const reconstructed = reconstructTouchesFromEvents(events);
  const stored = order.attribution;

  const firstTouch = stored?.firstTouch ?? reconstructed[0];
  const lastTouch =
    stored?.lastTouch ?? reconstructed[reconstructed.length - 1] ?? firstTouch;
  const assistedTouches =
    stored?.assistedTouches ??
    assistedFromTouches(reconstructed.length ? reconstructed : firstTouch ? [firstTouch] : []);

  const pageViews = events.filter((e) => e.type === "page_view" || e.type === "product_view");
  const firstEventAt = events[0] ? eventTime(events[0]) : stored?.firstVisitAt;
  const lastEventAt = events.length
    ? eventTime(events[events.length - 1]!)
    : stored?.lastVisitAt;

  let timeToPurchaseMs = stored?.timeToPurchaseMs;
  if (timeToPurchaseMs == null && firstEventAt) {
    const ms = Date.parse(order.createdAt) - Date.parse(firstEventAt);
    if (Number.isFinite(ms) && ms >= 0) timeToPurchaseMs = ms;
  }

  const daysToConversion =
    timeToPurchaseMs != null ? Math.max(0, Math.round(timeToPurchaseMs / 86_400_000)) : undefined;

  const meta = events.find((e) => e.metadata?.deviceType || e.metadata?.country)?.metadata;

  const attribution: OrderAttribution = {
    version: 1,
    visitorId: stored?.visitorId ?? order.sessionId,
    sessionId: order.sessionId,
    firstTouch,
    lastTouch,
    conversionTouch: stored?.conversionTouch ?? lastTouch,
    assistedTouches: assistedTouches.length ? assistedTouches : undefined,
    landingPage: stored?.landingPage ?? firstTouch?.landingPage ?? pageViews[0]?.path?.split("?")[0],
    checkoutUrl: stored?.checkoutUrl ?? "/checkout",
    conversionPage: stored?.conversionPage ?? "/checkout",
    deviceType: stored?.deviceType ?? meta?.deviceType,
    browser: stored?.browser ?? meta?.browser,
    os: stored?.os ?? meta?.os,
    country: stored?.country ?? meta?.country,
    region: stored?.region ?? meta?.regionName ?? meta?.region,
    city: stored?.city ?? meta?.city,
    isNewCustomer: stored?.isNewCustomer,
    sessionsBeforePurchase: stored?.sessionsBeforePurchase ?? 1,
    pagesViewed: stored?.pagesViewed ?? pageViews.length,
    firstVisitAt: stored?.firstVisitAt ?? firstEventAt,
    lastVisitAt: stored?.lastVisitAt ?? lastEventAt,
    timeToPurchaseMs,
  };

  const confidence = overallAttributionConfidence(firstTouch, lastTouch);
  const location = [attribution.city, attribution.region, attribution.country]
    .filter(Boolean)
    .join(", ");

  const eventsNote =
    events.length === 0
      ? "No session events found (may have expired after 90 days). Showing attribution snapshot stored on the order when available."
      : undefined;

  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    customerEmail: order.shippingAddress?.email,
    customerName: order.shippingAddress?.name,
    sessionId: order.sessionId,
    visitorId: attribution.visitorId,
    orderCreatedAt: order.createdAt,
    attribution,
    summary: {
      firstTouchLabel: firstTouch ? formatTrafficTouchLabel(firstTouch) : "Unknown",
      lastTouchLabel: lastTouch ? formatTrafficTouchLabel(lastTouch) : "Unknown",
      conversionLabel: attribution.conversionTouch
        ? formatTrafficTouchLabel(attribution.conversionTouch)
        : lastTouch
          ? formatTrafficTouchLabel(lastTouch)
          : "Unknown",
      confidence,
      confidenceReason: lastTouch?.confidenceReason ?? firstTouch?.confidenceReason,
      sessionsBeforePurchase: attribution.sessionsBeforePurchase,
      pagesViewed: attribution.pagesViewed ?? 0,
      daysToConversion,
      device: attribution.deviceType,
      browser: attribution.browser,
      os: attribution.os,
      location: location || undefined,
      landingPage: attribution.landingPage,
      referrer: firstTouch?.referrerDomain ?? firstTouch?.referrer,
      primaryCampaign: lastTouch?.campaign ?? firstTouch?.campaign,
    },
    timeline: buildTimeline(events, order),
    eventsAvailable: events.length,
    eventsNote,
  };
}
