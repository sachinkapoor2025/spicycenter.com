"use client";

import {
  applyTouchToJourney,
  isAcquisitionTouch,
  parseClientDevice,
  resolveTrafficSource,
  type OrderAttribution,
  type TrafficTouch,
} from "@spicycorner/shared";
import { getOrCreateSessionId } from "@/lib/session";

const FIRST_KEY = "spicycorner_attr_first_v1";
const LAST_KEY = "spicycorner_attr_last_v1";
const ASSISTED_KEY = "spicycorner_attr_assisted_v1";
const FIRST_VISIT_KEY = "spicycorner_attr_first_visit_v1";
const LANDING_KEY = "spicycorner_attr_landing_v1";
const TOUCH_LOG_KEY = "spicycorner_attr_touch_log_v1";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

function clientDeviceFields(): Pick<OrderAttribution, "deviceType" | "browser" | "os"> {
  try {
    const d = parseClientDevice(navigator.userAgent);
    return { deviceType: d.deviceType, browser: d.browser, os: d.os };
  } catch {
    return {};
  }
}

/**
 * Capture acquisition touch from the current URL + referrer.
 * First-touch is write-once; last-touch updates on new acquisition signals.
 */
export function captureAttributionFromLocation(): TrafficTouch | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  if (path.startsWith("/admin") || path.startsWith("/ses-email")) return null;

  const pageUrl = window.location.href;
  const referrer = document.referrer || undefined;
  const at = new Date().toISOString();
  const touch = resolveTrafficSource({ pageUrl, referrer, at });

  if (!readJson<string>(FIRST_VISIT_KEY)) {
    writeJson(FIRST_VISIT_KEY, at);
  }
  if (!readJson<string>(LANDING_KEY) && touch.landingPage) {
    writeJson(LANDING_KEY, touch.landingPage);
  }

  if (!isAcquisitionTouch(touch) || touch.source === "internal") {
    return touch;
  }

  const existingFirst = readJson<TrafficTouch>(FIRST_KEY) ?? undefined;
  const existingLast = readJson<TrafficTouch>(LAST_KEY) ?? undefined;
  const existingAssisted = readJson<TrafficTouch[]>(ASSISTED_KEY) ?? [];
  const journey = applyTouchToJourney(
    { first: existingFirst, last: existingLast, assisted: existingAssisted },
    touch
  );

  if (!existingFirst) writeJson(FIRST_KEY, journey.first);
  writeJson(LAST_KEY, journey.last);
  writeJson(ASSISTED_KEY, journey.assisted);

  const log = readJson<TrafficTouch[]>(TOUCH_LOG_KEY) ?? [];
  const lastLog = log[log.length - 1];
  if (
    !lastLog ||
    lastLog.source !== touch.source ||
    lastLog.medium !== touch.medium ||
    (lastLog.campaign ?? "") !== (touch.campaign ?? "")
  ) {
    log.push(touch);
    writeJson(TOUCH_LOG_KEY, log.slice(-30));
  }

  return touch;
}

export function getStoredFirstTouch(): TrafficTouch | undefined {
  return readJson<TrafficTouch>(FIRST_KEY) ?? undefined;
}

export function getStoredLastTouch(): TrafficTouch | undefined {
  return readJson<TrafficTouch>(LAST_KEY) ?? undefined;
}

/** Snapshot sent with checkout — durable attribution for Order Route. */
export function getAttributionSnapshotForCheckout(): OrderAttribution {
  const sessionId = getOrCreateSessionId();
  const firstTouch = getStoredFirstTouch();
  const lastTouch = getStoredLastTouch();
  const assistedTouches = readJson<TrafficTouch[]>(ASSISTED_KEY) ?? undefined;
  const firstVisitAt = readJson<string>(FIRST_VISIT_KEY) ?? undefined;
  const landingPage = readJson<string>(LANDING_KEY) ?? firstTouch?.landingPage;
  const nowIso = new Date().toISOString();
  const conversionTouch = resolveTrafficSource({
    pageUrl: typeof window !== "undefined" ? window.location.href : "/checkout",
    referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    at: nowIso,
  });

  let timeToPurchaseMs: number | undefined;
  if (firstVisitAt) {
    const ms = Date.parse(nowIso) - Date.parse(firstVisitAt);
    if (Number.isFinite(ms) && ms >= 0) timeToPurchaseMs = ms;
  }

  return {
    version: 1,
    visitorId: sessionId || undefined,
    sessionId: sessionId || undefined,
    firstTouch,
    lastTouch: lastTouch ?? firstTouch,
    conversionTouch,
    assistedTouches: assistedTouches?.length ? assistedTouches : undefined,
    landingPage,
    checkoutUrl: "/checkout",
    conversionPage: "/checkout",
    ...clientDeviceFields(),
    firstVisitAt,
    lastVisitAt: nowIso,
    timeToPurchaseMs,
  };
}

/** Compact metadata fields to attach to analytics events. */
export function attributionEventMetadata(): Record<string, string> {
  const first = getStoredFirstTouch();
  const last = getStoredLastTouch();
  const out: Record<string, string> = {};
  if (first?.source) out.attrFirstSource = first.source;
  if (first?.medium) out.attrFirstMedium = first.medium;
  if (first?.campaign) out.attrFirstCampaign = first.campaign;
  if (last?.source) out.attrLastSource = last.source;
  if (last?.medium) out.attrLastMedium = last.medium;
  if (last?.campaign) out.attrLastCampaign = last.campaign;
  if (first?.confidence) out.attrFirstConfidence = first.confidence;
  if (last?.confidence) out.attrLastConfidence = last.confidence;
  if (last?.source === "chat_assistant") out.source = "chat_assistant";
  return out;
}

/** Last-touch from the shopping assistant — used for chat-assisted order attribution. */
export function markChatAssistedTouch(productSlug?: string): void {
  if (typeof window === "undefined") return;
  const touch: TrafficTouch = {
    source: "chat_assistant",
    medium: "assistant",
    campaign: "personal-shopping-assistant",
    content: productSlug,
    landingPage: window.location.pathname,
    channel: "chat",
    confidence: "high",
    confidenceReason: "Product interaction inside SpicyCorner shopping assistant",
    at: new Date().toISOString(),
  };
  const existingFirst = readJson<TrafficTouch>(FIRST_KEY) ?? undefined;
  const existingLast = readJson<TrafficTouch>(LAST_KEY) ?? undefined;
  const existingAssisted = readJson<TrafficTouch[]>(ASSISTED_KEY) ?? [];
  const journey = applyTouchToJourney(
    { first: existingFirst, last: existingLast, assisted: existingAssisted },
    touch
  );
  if (!existingFirst) writeJson(FIRST_KEY, journey.first);
  writeJson(LAST_KEY, journey.last);
  writeJson(ASSISTED_KEY, journey.assisted);
}
