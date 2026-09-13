import { z } from "zod";

export const ATTRIBUTION_CONFIDENCE = ["high", "medium", "low", "unknown"] as const;
export type AttributionConfidence = (typeof ATTRIBUTION_CONFIDENCE)[number];

export const ATTRIBUTION_CHANNELS = [
  "paid_search",
  "organic_search",
  "paid_social",
  "organic_social",
  "referral",
  "email",
  "direct",
  "chat",
  "unknown",
] as const;
export type AttributionChannel = (typeof ATTRIBUTION_CHANNELS)[number];

/** Normalized marketing touch (first / last / assisted). */
export const trafficTouchSchema = z.object({
  source: z.string().min(1).max(80),
  medium: z.string().min(1).max(80),
  campaign: z.string().max(200).optional(),
  term: z.string().max(200).optional(),
  content: z.string().max(200).optional(),
  referrer: z.string().max(512).optional(),
  referrerDomain: z.string().max(200).optional(),
  landingPage: z.string().max(512).optional(),
  entryUrl: z.string().max(1024).optional(),
  /** Platform click ids (gclid, msclkid, fbclid, ttclid, …) — values only. */
  clickIds: z.record(z.string().max(256)).optional(),
  channel: z.enum(ATTRIBUTION_CHANNELS).optional(),
  confidence: z.enum(ATTRIBUTION_CONFIDENCE),
  confidenceReason: z.string().max(300).optional(),
  at: z.string().optional(),
});

export type TrafficTouch = z.infer<typeof trafficTouchSchema>;

/**
 * Snapshot stamped on the order at checkout (survives event TTL).
 * Supports first/last/assisted attribution and future source analytics.
 */
export const orderAttributionSchema = z.object({
  version: z.literal(1).optional(),
  visitorId: z.string().max(80).optional(),
  sessionId: z.string().max(80).optional(),
  firstTouch: trafficTouchSchema.optional(),
  lastTouch: trafficTouchSchema.optional(),
  conversionTouch: trafficTouchSchema.optional(),
  assistedTouches: z.array(trafficTouchSchema).max(20).optional(),
  landingPage: z.string().max(512).optional(),
  checkoutUrl: z.string().max(512).optional(),
  conversionPage: z.string().max(512).optional(),
  deviceType: z.string().max(40).optional(),
  browser: z.string().max(40).optional(),
  os: z.string().max(40).optional(),
  country: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  isNewCustomer: z.boolean().optional(),
  sessionsBeforePurchase: z.number().int().nonnegative().optional(),
  pagesViewed: z.number().int().nonnegative().optional(),
  firstVisitAt: z.string().optional(),
  lastVisitAt: z.string().optional(),
  timeToPurchaseMs: z.number().nonnegative().optional(),
});

export type OrderAttribution = z.infer<typeof orderAttributionSchema>;

/** Client → checkout payload (subset; server may enrich). */
export const checkoutAttributionSchema = orderAttributionSchema.omit({ version: true }).extend({
  version: z.literal(1).optional(),
});

export type CheckoutAttributionInput = z.infer<typeof checkoutAttributionSchema>;

export const orderRouteEventSchema = z.object({
  eventId: z.string().optional(),
  eventType: z.string(),
  timestamp: z.string(),
  label: z.string(),
  pageUrl: z.string().optional(),
  productSlug: z.string().optional(),
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  referrer: z.string().optional(),
  confidence: z.enum(ATTRIBUTION_CONFIDENCE).optional(),
  confidenceReason: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export type OrderRouteEvent = z.infer<typeof orderRouteEventSchema>;
