import { z } from "zod";
import { EVENT_TYPES } from "../constants";

export const eventTypeEnum = z.enum([
  EVENT_TYPES.PAGE_VIEW,
  EVENT_TYPES.PRODUCT_VIEW,
  EVENT_TYPES.PRODUCT_IMPRESSION,
  EVENT_TYPES.PRODUCT_CLICK,
  EVENT_TYPES.SEARCH,
  EVENT_TYPES.CART_ADD,
  EVENT_TYPES.CART_REMOVE,
  EVENT_TYPES.CHECKOUT_START,
  EVENT_TYPES.PURCHASE,
  EVENT_TYPES.SESSION_PING,
  EVENT_TYPES.COUNTRY_CHANGED,
  EVENT_TYPES.POSTAL_CODE_ENTERED,
  EVENT_TYPES.CHAT_OPEN,
  EVENT_TYPES.CHAT_CLOSE,
  EVENT_TYPES.CHAT_MESSAGE,
]);

export const trackEventSchema = z.object({
  type: eventTypeEnum,
  sessionId: z.string().min(1),
  path: z.string().max(512).optional(),
  productSlug: z.string().max(256).optional(),
  query: z.string().max(256).optional(),
  resultCount: z.number().int().nonnegative().optional(),
  value: z.number().nonnegative().optional(),
  referrer: z.string().max(512).optional(),
  metadata: z.record(z.string()).optional(),
  at: z.string().optional(),
});

/** Events are sent in batches to reduce request volume. */
export const trackEventBatchSchema = z.object({
  events: z.array(trackEventSchema).min(1).max(50),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
export type TrackEventBatch = z.infer<typeof trackEventBatchSchema>;

export type AnalyticsEvent = TrackEventInput & {
  eventId: string;
  createdAt: string;
};
