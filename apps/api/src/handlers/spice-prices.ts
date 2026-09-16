import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { findTrackedCommodity, isIsoDate } from "@spicycorner/shared";
import { badRequest, json, notFound } from "../lib/response";
import { getLatestMandi, getMandiHistory } from "../lib/bulk-store";

const PRICE_CACHE = {
  "Cache-Control": "public, max-age=3600, s-maxage=43200, stale-while-revalidate=86400",
};

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
