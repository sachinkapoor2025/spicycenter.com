"use client";

import { getApiUrl } from "./env";
import { getOrCreateSessionId } from "./session";
import { attributionEventMetadata } from "./attribution-store";
import { EVENT_TYPES, type EventType, parseClientDevice } from "@spicycorner/shared";

interface TrackPayload {
  type: EventType;
  path?: string;
  productSlug?: string;
  query?: string;
  resultCount?: number;
  value?: number;
  metadata?: Record<string, string>;
  /** Send right away (page views, purchases). */
  immediate?: boolean;
}

interface QueuedEvent extends TrackPayload {
  sessionId: string;
  referrer?: string;
  at: string;
  metadata: Record<string, string>;
}

const BATCH_SIZE = 8;
const FLUSH_DELAY_MS = 1200;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let clientMeta: Record<string, string> | null = null;
let geoPromise: Promise<void> | null = null;
let pageEnteredAt = 0;
let currentPath = "";

function endpoint(): string {
  return `${getApiUrl()}/events`;
}

function applyGeoFields(data: Record<string, string | undefined>) {
  clientMeta = clientMeta ?? {};
  for (const key of ["country", "city", "region", "regionName"] as const) {
    const value = data[key];
    if (value) clientMeta[key] = value;
  }
}

/** Load city/state/country from /api/geo (CloudFront headers on Amplify). */
export function ensureVisitorGeo(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (clientMeta?.country && clientMeta?.city) return Promise.resolve();
  if (!geoPromise) {
    geoPromise = fetch("/api/geo", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          applyGeoFields(data as Record<string, string | undefined>);
        }
      })
      .catch(() => {
        /* analytics must never break UX */
      });
  }
  return geoPromise;
}

function getClientMetadata(): Record<string, string> {
  if (clientMeta) return clientMeta;
  clientMeta = {};
  try {
    clientMeta.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    clientMeta.locale = navigator.language;
    if (screen?.width) clientMeta.screen = `${screen.width}x${screen.height}`;
    if (typeof navigator !== "undefined" && navigator.userAgent) {
      const device = parseClientDevice(navigator.userAgent);
      clientMeta.userAgent = device.userAgent;
      clientMeta.deviceType = device.deviceType;
      clientMeta.browser = device.browser;
      clientMeta.os = device.os;
    }
  } catch {
    /* ignore */
  }
  return clientMeta;
}

/** Send everything queued right now (used on unload + when batch fills). */
export function flushEvents(): void {
  if (typeof window === "undefined" || queue.length === 0) return;
  const events = queue.map(({ immediate: _i, ...rest }) => rest);
  queue = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const body = JSON.stringify({ events });

  fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* analytics must never break UX */
  });
}

function scheduleFlush(immediate = false): void {
  if (queue.length >= BATCH_SIZE || immediate) {
    flushEvents();
    return;
  }
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flushEvents();
  }, FLUSH_DELAY_MS);
}

export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  queue.push({
    ...payload,
    sessionId,
    path: payload.path ?? window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
    at: new Date().toISOString(),
    metadata: {
      ...getClientMetadata(),
      ...attributionEventMetadata(),
      ...payload.metadata,
    },
  });

  scheduleFlush(payload.immediate);
}

/** Record time spent on the current page (called before navigation or tab close). */
export function trackPageLeave(path?: string): void {
  if (typeof window === "undefined" || !pageEnteredAt) return;
  const durationMs = Date.now() - pageEnteredAt;
  if (durationMs < 500) return;

  track({
    type: EVENT_TYPES.SESSION_PING,
    path: path ?? currentPath,
    metadata: { durationMs: String(durationMs) },
    immediate: true,
  });
}

/**
 * Heartbeat for engagement milestones (e.g. Discount of the Day shown after 10s).
 * Ensures admin visitor duration is at least `minDurationMs` when the event fires.
 */
export function trackSessionHeartbeat(
  reason: string,
  minDurationMs = 0,
  path?: string
): void {
  if (typeof window === "undefined") return;
  const elapsed = pageEnteredAt ? Date.now() - pageEnteredAt : minDurationMs;
  const durationMs = Math.max(elapsed, minDurationMs);
  if (durationMs < 500) return;

  track({
    type: EVENT_TYPES.SESSION_PING,
    path: path ?? currentPath ?? window.location.pathname,
    metadata: {
      durationMs: String(durationMs),
      reason,
      // Floor mode: admin duration should be at least this, not summed on top of leave pings
      durationMode: reason === "daily_deal_shown" ? "floor" : "add",
    },
    immediate: true,
  });
}

/**
 * Lightweight presence ping while the storefront tab is visible.
 * Powers admin live-visitors map (server upserts PRESENCE#LIVE with short TTL).
 */
export function trackLivePresence(): void {
  if (typeof window === "undefined") return;
  if (document.visibilityState === "hidden") return;
  const path = window.location.pathname + window.location.search;
  if (path.startsWith("/admin") || path.startsWith("/ses-email")) return;

  const elapsed = pageEnteredAt ? Date.now() - pageEnteredAt : 0;
  track({
    type: EVENT_TYPES.SESSION_PING,
    path,
    metadata: {
      durationMs: String(Math.max(elapsed, 1000)),
      reason: "live_presence",
      durationMode: "floor",
    },
    immediate: true,
  });
}

export function beginPageTiming(path?: string): void {
  if (typeof window === "undefined") return;
  currentPath = path ?? window.location.pathname + window.location.search;
  pageEnteredAt = Date.now();
}

export const trackPageView = (path?: string) => {
  getClientMetadata();
  track({ type: EVENT_TYPES.PAGE_VIEW, path, immediate: true });
  beginPageTiming(path);
};
export const trackProductView = (productSlug: string) =>
  track({ type: EVENT_TYPES.PRODUCT_VIEW, productSlug });
export const trackProductImpression = (
  productSlug: string,
  meta?: { position?: number; listingPage?: string; category?: string }
) =>
  track({
    type: EVENT_TYPES.PRODUCT_IMPRESSION,
    productSlug,
    metadata: {
      ...(meta?.position != null ? { position: String(meta.position) } : {}),
      ...(meta?.listingPage ? { listingPage: meta.listingPage } : {}),
      ...(meta?.category ? { category: meta.category } : {}),
    },
  });
export const trackProductClick = (
  productSlug: string,
  meta?: { position?: number; listingPage?: string; category?: string }
) =>
  track({
    type: EVENT_TYPES.PRODUCT_CLICK,
    productSlug,
    metadata: {
      ...(meta?.position != null ? { position: String(meta.position) } : {}),
      ...(meta?.listingPage ? { listingPage: meta.listingPage } : {}),
      ...(meta?.category ? { category: meta.category } : {}),
    },
    immediate: true,
  });
export const trackSearch = (query: string, resultCount: number) =>
  track({ type: EVENT_TYPES.SEARCH, query, resultCount });
export const trackCartAdd = (
  productSlug: string,
  value?: number,
  contact?: { name?: string; email?: string; phone?: string },
  extra?: Record<string, string>
) =>
  track({
    type: EVENT_TYPES.CART_ADD,
    productSlug,
    value,
    metadata: {
      ...(contact?.name?.trim() ? { name: contact.name.trim() } : {}),
      ...(contact?.email?.trim() ? { email: contact.email.trim() } : {}),
      ...(contact?.phone?.trim() ? { phone: contact.phone.trim() } : {}),
      ...extra,
    },
    immediate: true,
  });
export const trackCartRemove = (productSlug: string) =>
  track({ type: EVENT_TYPES.CART_REMOVE, productSlug });

export const trackChatOpen = (path?: string) =>
  track({
    type: EVENT_TYPES.CHAT_OPEN,
    path,
    metadata: { channel: "chat" },
    immediate: true,
  });

export const trackChatClose = (path?: string) =>
  track({
    type: EVENT_TYPES.CHAT_CLOSE,
    path,
    metadata: { channel: "chat" },
    immediate: true,
  });

export const trackChatMessage = (intent?: string) =>
  track({
    type: EVENT_TYPES.CHAT_MESSAGE,
    metadata: { channel: "chat", ...(intent ? { intent } : {}) },
  });

export const trackChatSearch = (query: string, resultCount: number, intent?: string) =>
  track({
    type: EVENT_TYPES.SEARCH,
    query,
    resultCount,
    metadata: { channel: "chat", ...(intent ? { intent } : {}) },
    immediate: true,
  });

export const trackChatProductImpression = (productSlug: string, position?: number) =>
  track({
    type: EVENT_TYPES.PRODUCT_IMPRESSION,
    productSlug,
    metadata: {
      channel: "chat",
      listingPage: "chat",
      ...(position != null ? { position: String(position) } : {}),
    },
  });

export const trackChatProductClick = (productSlug: string, position?: number) =>
  track({
    type: EVENT_TYPES.PRODUCT_CLICK,
    productSlug,
    metadata: { channel: "chat", listingPage: "chat", ...(position != null ? { position: String(position) } : {}) },
    immediate: true,
  });
export const trackCheckoutStart = (value?: number, productSlugs?: string[]) =>
  track({
    type: EVENT_TYPES.CHECKOUT_START,
    value,
    ...(productSlugs?.length
      ? { metadata: { productSlugs: productSlugs.slice(0, 40).join(",") } }
      : {}),
    immediate: true,
  });

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    gtagSendEvent?: (url: string) => boolean;
    fbq?: (...args: unknown[]) => void;
    uetq?: unknown[] & { push: (...args: unknown[]) => void };
  }
}

/** Fire purchase to GTM, GA4, Meta Pixel, and Bing UET (when loaded). */
function pushPurchaseToAdPixels(value: number, metadata?: Record<string, string>): void {
  if (typeof window === "undefined") return;

  const currency = metadata?.currency === "INR" ? "INR" : "USD";
  const transactionId = metadata?.orderId;
  const payload = { value, currency, transaction_id: transactionId };

  try {
    window.dataLayer?.push({
      event: "purchase",
      ecommerce: {
        transaction_id: transactionId,
        value,
        currency,
      },
    });
  } catch {
    /* analytics must never break UX */
  }

  try {
    window.gtag?.("event", "purchase", payload);
  } catch {
    /* ignore */
  }

  try {
    window.gtag?.("event", "conversion_event_purchase_2", payload);
  } catch {
    /* ignore */
  }

  try {
    window.fbq?.("track", "Purchase", { value, currency });
  } catch {
    /* ignore */
  }

  try {
    window.uetq?.push("event", "purchase", { revenue_value: value, currency });
  } catch {
    /* ignore */
  }
}

export const trackPurchase = (value?: number, metadata?: Record<string, string>) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    pushPurchaseToAdPixels(value, metadata);
  }
  track({ type: EVENT_TYPES.PURCHASE, value, metadata, immediate: true });
};
