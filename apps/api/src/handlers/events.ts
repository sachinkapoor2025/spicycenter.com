import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  trackEventBatchSchema,
  eventKeys,
  EVENT_TYPES,
  EVENT_TTL_DAYS,
  LIVE_VISITOR_TTL_SECONDS,
  mergeViewerGeo,
  parseViewerGeoFromHeaders,
  type TrackEventInput,
} from "@spicycorner/shared";
import { docClient, EVENTS_TABLE, now, ttlInDays, dayBucket } from "../lib/db";
import { incrementRollup, geoRollupKeys } from "../lib/event-rollups";
import { ok, badRequest } from "../lib/response";

const PRESENCE_EVENT_TYPES = new Set<string>([
  EVENT_TYPES.PAGE_VIEW,
  EVENT_TYPES.SESSION_PING,
  EVENT_TYPES.PRODUCT_VIEW,
  EVENT_TYPES.PRODUCT_CLICK,
  EVENT_TYPES.CART_ADD,
  EVENT_TYPES.CHECKOUT_START,
]);

async function upsertLivePresence(
  e: TrackEventInput,
  geoFields: Record<string, string>,
  timestamp: string
) {
  if (!PRESENCE_EVENT_TYPES.has(e.type)) return;
  const path = (e.path ?? "").trim() || "/";
  // Don't show staff browsing /admin as storefront live customers.
  if (path.startsWith("/admin") || path.startsWith("/ses-email")) return;

  const meta = (e.metadata ?? {}) as Record<string, string | undefined>;
  const expiresAt = Math.floor(Date.now() / 1000) + LIVE_VISITOR_TTL_SECONDS;

  const names: Record<string, string> = {
    "#path": "path",
    "#entity": "entityType",
  };
  const values: Record<string, unknown> = {
    ":path": path,
    ":ls": timestamp,
    ":exp": expiresAt,
    ":sid": e.sessionId,
    ":entity": "live_presence",
  };
  const sets = [
    "#entity = :entity",
    "sessionId = :sid",
    "#path = :path",
    "lastSeen = :ls",
    "firstSeen = if_not_exists(firstSeen, :ls)",
    "expiresAt = :exp",
  ];

  const optional: Array<[string, string | undefined]> = [
    ["country", geoFields.country],
    ["city", geoFields.city],
    ["region", geoFields.region],
    ["regionName", geoFields.regionName],
    ["timezone", meta.timezone],
    ["locale", meta.locale],
    ["deviceType", meta.deviceType],
    ["browser", meta.browser],
    ["os", meta.os],
    ["referrer", e.referrer],
    ["name", meta.name?.trim()],
    ["email", meta.email?.trim()],
    ["phone", meta.phone?.trim()],
    ["productSlug", e.productSlug],
  ];
  let i = 0;
  for (const [field, value] of optional) {
    if (!value) continue;
    const nk = `#o${i}`;
    const vk = `:o${i}`;
    names[nk] = field;
    values[vk] = value;
    sets.push(`${nk} = ${vk}`);
    i += 1;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: EVENTS_TABLE,
      Key: { PK: eventKeys.presencePk(), SK: eventKeys.presenceSk(e.sessionId) },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

function looksLikeBot(meta: Record<string, string | undefined>, uaHeader?: string): boolean {
  const ua = `${meta.userAgent ?? ""} ${uaHeader ?? ""}`.toLowerCase();
  if (!ua.trim()) return false;
  return /\b(bot|crawler|spider|headlesschrome|preview|slurp|facebookexternalhit)\b/.test(ua);
}

function listingIsHomepage(meta: Record<string, string | undefined>, path?: string): boolean {
  const listing = (meta.listingPage ?? meta.page ?? "").toLowerCase();
  if (listing === "homepage" || listing === "home") return true;
  const p = (path ?? "").split("?")[0];
  return p === "/" || p === "";
}

function viewerGeoFromRequest(event: APIGatewayProxyEventV2) {
  return parseViewerGeoFromHeaders(event.headers ?? {});
}

function geoMetadata(client: Record<string, string | undefined>, edge: ReturnType<typeof viewerGeoFromRequest>) {
  const merged = mergeViewerGeo(
    {
      country: client.country,
      city: client.city,
      region: client.region,
      regionName: client.regionName,
    },
    edge
  );
  const out: Record<string, string> = {};
  if (merged.country) out.country = merged.country;
  if (merged.city) out.city = merged.city;
  if (merged.region) out.region = merged.region;
  if (merged.regionName) out.regionName = merged.regionName;
  return out;
}

async function persistEvent(
  e: TrackEventInput,
  edgeGeo: ReturnType<typeof viewerGeoFromRequest>,
  uaHeader?: string
) {
  const timestamp = e.at ?? now();
  const day = dayBucket(new Date(timestamp));
  const eventId = uuidv4();
  const clientMeta = (e.metadata ?? {}) as Record<string, string | undefined>;
  if (looksLikeBot(clientMeta, uaHeader)) return;

  const geoFields = geoMetadata(clientMeta, edgeGeo);
  const metadata = {
    ...e.metadata,
    ...geoFields,
  };
  const skipRaw = e.type === EVENT_TYPES.PRODUCT_IMPRESSION;

  if (!skipRaw) {
    await docClient.send(
      new PutCommand({
        TableName: EVENTS_TABLE,
        Item: {
          ...e,
          metadata: Object.keys(metadata).length ? metadata : undefined,
          eventId,
          createdAt: timestamp,
          PK: eventKeys.pk(e.sessionId),
          SK: eventKeys.sk(timestamp, eventId),
          GSI1PK: eventKeys.gsi1pk(e.type, day),
          GSI1SK: eventKeys.gsi1sk(timestamp),
          expiresAt: ttlInDays(EVENT_TTL_DAYS),
        },
      })
    );
  }

  const { isLoadTestMode } = await import("../lib/load-test");
  if (isLoadTestMode()) return;

  if (!skipRaw) {
    void upsertLivePresence(e, geoFields, timestamp).catch((err) => {
      console.warn("live presence upsert failed", err);
    });
  }

  const isPageView = e.type === EVENT_TYPES.PAGE_VIEW;
  if (isPageView && Math.random() > 0.2) return;

  const rollups: Promise<void>[] = [
    incrementRollup(day, `TYPE#${e.type}`, "type", e.type, { count: 1 }),
  ];

  const slug = e.productSlug;
  const onHome = listingIsHomepage(clientMeta, e.path);
  const position = clientMeta.position;
  const source = clientMeta.source ?? clientMeta.utm_source;
  const category = clientMeta.category;
  const fromChat = clientMeta.channel === "chat" || clientMeta.listingPage === "chat";

  const productFields: Record<string, number> = {};
  if (slug) {
    if (e.type === EVENT_TYPES.PRODUCT_IMPRESSION) {
      if (fromChat) {
        productFields.chatImpressions = 1;
      } else {
        productFields.impressions = 1;
        if (onHome) productFields.homepageImpressions = 1;
      }
    }
    if (e.type === EVENT_TYPES.PRODUCT_CLICK) {
      if (fromChat) {
        productFields.chatClicks = 1;
      } else {
        productFields.clicks = 1;
        if (onHome) productFields.homepageClicks = 1;
      }
    }
    if (e.type === EVENT_TYPES.PRODUCT_VIEW) productFields.views = 1;
    if (e.type === EVENT_TYPES.CART_ADD) {
      productFields.adds = 1;
      if (fromChat) productFields.chatAdds = 1;
    }
    if (e.type === EVENT_TYPES.CHECKOUT_START) productFields.checkouts = 1;
    if (Object.keys(productFields).length) {
      rollups.push(incrementRollup(day, `PRODUCT#${slug}`, "product", slug, productFields));
      for (const geo of geoRollupKeys(slug, geoFields.country, geoFields.region || geoFields.regionName, geoFields.city)) {
        rollups.push(incrementRollup(day, geo.metric, geo.kind, geo.label, productFields));
      }
    }
    if (fromChat && (productFields.chatClicks || productFields.chatImpressions || productFields.chatAdds)) {
      rollups.push(
        incrementRollup(day, `CHAT_PRODUCT#${slug}`, "chat_product", slug, {
          impressions: productFields.chatImpressions ?? 0,
          clicks: productFields.chatClicks ?? 0,
          adds: productFields.chatAdds ?? 0,
        })
      );
    }
  }

  const extraSlugs = (clientMeta.productSlugs ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (e.type === EVENT_TYPES.CHECKOUT_START && extraSlugs.length) {
    for (const extra of extraSlugs.slice(0, 40)) {
      rollups.push(incrementRollup(day, `PRODUCT#${extra}`, "product", extra, { checkouts: 1 }));
    }
  }

  if (e.type === EVENT_TYPES.SEARCH && e.query) {
    const term = e.query.trim().toLowerCase().slice(0, 80);
    if (term) {
      rollups.push(
        incrementRollup(day, `SEARCH#${term}`, "search", term, {
          count: 1,
          ...(e.resultCount === 0 ? { zero: 1 } : {}),
        })
      );
      if (fromChat) {
        rollups.push(
          incrementRollup(day, `CHAT_SEARCH#${term}`, "chat_search", term, {
            count: 1,
            ...(e.resultCount === 0 ? { zero: 1 } : {}),
          })
        );
        if (e.resultCount === 0) {
          rollups.push(
            incrementRollup(day, `CHAT_UNFULFILLED#${term}`, "chat_unfulfilled", term, {
              count: 1,
            })
          );
        }
      }
    }
  }

  const intent = clientMeta.intent?.slice(0, 40);
  if (fromChat && intent && e.type === EVENT_TYPES.CHAT_MESSAGE) {
    rollups.push(incrementRollup(day, `CHAT_INTENT#${intent}`, "chat_intent", intent, { count: 1 }));
  }

  if (fromChat && geoFields.country && (e.type === EVENT_TYPES.CHAT_OPEN || e.type === EVENT_TYPES.CHAT_MESSAGE)) {
    rollups.push(
      incrementRollup(day, `CHAT_COUNTRY#${geoFields.country}`, "chat_country", geoFields.country, { count: 1 })
    );
  }

  if (onHome && position && (e.type === EVENT_TYPES.PRODUCT_IMPRESSION || e.type === EVENT_TYPES.PRODUCT_CLICK)) {
    const pos = position.replace(/[^\d]/g, "").slice(0, 4) || "0";
    rollups.push(
      incrementRollup(
        day,
        `HOMEPOS#${pos}`,
        "home_position",
        pos,
        e.type === EVENT_TYPES.PRODUCT_CLICK ? { clicks: 1 } : { impressions: 1 }
      )
    );
  }

  if (source && (e.type === EVENT_TYPES.PRODUCT_CLICK || e.type === EVENT_TYPES.PURCHASE)) {
    rollups.push(
      incrementRollup(day, `SOURCE#${source.slice(0, 80)}`, "source", source.slice(0, 80), {
        count: 1,
        ...(e.type === EVENT_TYPES.PURCHASE ? { orders: 1, revenueUsd: e.value ?? 0 } : { clicks: 1 }),
      })
    );
  }

  if (category && slug) {
    rollups.push(
      incrementRollup(day, `CATEGORY#${category}`, "category", category, productFields)
    );
  }

  await Promise.all(rollups);
}

/** Reject oversized public payloads before parsing (abuse / cost guard). */
const MAX_BODY_BYTES = 64 * 1024;

export async function recordEvent(event: APIGatewayProxyEventV2) {
  if ((event.body?.length ?? 0) > MAX_BODY_BYTES) return badRequest("Payload too large");
  const body = JSON.parse(event.body ?? "{}");
  const payload = Array.isArray(body) ? { events: body } : body;
  const parsed = trackEventBatchSchema.safeParse(payload);
  if (!parsed.success) return badRequest(parsed.error.message);

  const edgeGeo = viewerGeoFromRequest(event);
  const ua = event.headers?.["user-agent"] ?? event.headers?.["User-Agent"];
  await Promise.all(parsed.data.events.map((e) => persistEvent(e, edgeGeo, ua)));
  return ok({ recorded: parsed.data.events.length });
}
