import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  AGMARKNET_SOURCE_DISCLAIMER,
  findTrackedCommodity,
  isIsoDate,
  TRACKED_COMMODITIES,
} from "@spicycorner/shared";
import { badRequest, json, notFound } from "../lib/response";
import {
  getLatestMandi,
  getMandiHistory,
  listLatestMandi,
  mandiFieldInrPerKg,
  mandiInrPerKg,
} from "../lib/bulk-store";

const PRICE_CACHE = {
  "Cache-Control": "public, max-age=3600, s-maxage=43200, stale-while-revalidate=86400",
};

function roundKg(n: number | null): number | null {
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}

export async function listLatestPrices() {
  const rows = await listLatestMandi();
  const bySlug = new Map(rows.map((r) => [r.slug, r.latest]));
  const prices = TRACKED_COMMODITIES.map((c) => {
    const latest = bySlug.get(c.slug) ?? null;
    const inrPerKg = roundKg(mandiInrPerKg(latest));
    return {
      slug: c.slug,
      spiceId: c.spiceId,
      spiceName: c.spiceName,
      inrPerKg,
      minInrPerKg: roundKg(mandiFieldInrPerKg(latest, latest?.min_price)),
      maxInrPerKg: roundKg(mandiFieldInrPerKg(latest, latest?.max_price)),
      marketCount: latest?.market_count ?? null,
      arrivalDate: latest?.arrival_date ?? null,
      fetchedAt: latest?.fetched_at ?? null,
      grades: (latest?.by_grade ?? []).slice(0, 4).map((g) => ({
        label: g.label,
        inrPerKg: roundKg(mandiFieldInrPerKg(latest, g.average_modal_price)),
        marketCount: g.market_count,
      })),
      available: inrPerKg != null,
    };
  });
  const fetchedAt =
    prices
      .map((p) => p.fetchedAt)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;
  return json(
    200,
    {
      prices,
      fetchedAt,
      source: "Agmarknet / data.gov.in",
      disclaimer: AGMARKNET_SOURCE_DISCLAIMER,
      live: true,
    },
    PRICE_CACHE
  );
}

export async function getLatestPrice(event: APIGatewayProxyEventV2) {
  const raw = event.pathParameters?.commodity ?? "";
  const tracked = findTrackedCommodity(decodeURIComponent(raw));
  if (!tracked) {
    return badRequest(`Unknown commodity '${raw}'. Use one of the tracked spice slugs (e.g. cumin, turmeric).`);
  }
  const latest = await getLatestMandi(tracked.slug);
  if (!latest) {
    return notFound(`No Agmarknet price data yet for ${tracked.spiceName}. Try again after the daily fetch, or set an admin override.`);
  }
  return json(200, { commodity: tracked.slug, latest }, PRICE_CACHE);
}

export async function getPriceHistory(event: APIGatewayProxyEventV2) {
  const raw = event.pathParameters?.commodity ?? "";
  const tracked = findTrackedCommodity(decodeURIComponent(raw));
  if (!tracked) {
    return badRequest(`Unknown commodity '${raw}'.`);
  }
  const from = event.queryStringParameters?.from ?? "";
  const to = event.queryStringParameters?.to ?? "";
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return badRequest("Query params from and to must be ISO dates (YYYY-MM-DD).");
  }
  if (from > to) return badRequest("from must be on or before to.");
  const records = await getMandiHistory(tracked.slug, from, to);
  return json(200, { commodity: tracked.slug, from, to, records }, PRICE_CACHE);
}
