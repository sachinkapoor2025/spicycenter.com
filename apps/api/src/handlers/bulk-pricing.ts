import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  addOnPricingSchema,
  bulkDestinationSchema,
  bulkPricingSpiceSchema,
  computeBulkQuote,
  findTrackedCommodity,
  mandiQuintalToInrPerKg,
  qtyBelowMinimum,
} from "@spicycorner/shared";
import { badRequest, forbidden, ok } from "../lib/response";
import { requireAdmin } from "../lib/auth";
import {
  getAddOnPricing,
  getCachedFx,
  getLatestMandi,
  getSpicePricing,
  listSpicePricing,
  mandiInrPerKg,
  putAddOnPricing,
  putSpicePricing,
} from "../lib/bulk-store";

function qs(event: APIGatewayProxyEventV2, key: string): string {
  const mapped = event.queryStringParameters?.[key];
  if (mapped) return mapped;
  try {
    return new URLSearchParams(event.rawQueryString ?? "").get(key) ?? "";
  } catch {
    return "";
  }
}

function quoteRequest(event: APIGatewayProxyEventV2): {
  spiceId: string;
  qtyKg: number;
  destination: string;
  grade: string;
  sample: boolean;
  documentation: boolean;
} {
  const method = event.requestContext?.http?.method ?? "GET";
  if (method === "POST" && event.body) {
    const body = JSON.parse(event.body) as Record<string, unknown>;
    return {
      spiceId: String(body.spiceId ?? body.commodity ?? ""),
      qtyKg: Number(body.qtyKg),
      destination: String(body.destination ?? "UK"),
      grade: String(body.grade ?? ""),
      sample: Boolean(body.sampleSelected ?? body.sample),
      documentation: Boolean(body.documentationSelected ?? body.documentation),
    };
  }
  return {
    spiceId: qs(event, "spiceId") || qs(event, "commodity"),
    qtyKg: Number(qs(event, "qtyKg")),
    destination: qs(event, "destination") || "UK",
    grade: qs(event, "grade"),
    sample: qs(event, "sample") === "1" || qs(event, "sample") === "true",
    documentation: qs(event, "documentation") === "1" || qs(event, "documentation") === "true",
  };
}

export async function previewQuote(event: APIGatewayProxyEventV2) {
  const input = quoteRequest(event);
  const tracked = findTrackedCommodity(input.spiceId);
  if (!tracked) return badRequest("Unknown spice. Choose a tracked bulk commodity.");
  const destParse = bulkDestinationSchema.safeParse(input.destination.toUpperCase());
  if (!destParse.success) return badRequest("destination must be UK or EU.");
  const spice = await getSpicePricing(tracked.spiceId);
  if (qtyBelowMinimum(input.qtyKg, spice.min_bulk_qty_kg)) {
    return badRequest(`Minimum bulk quantity is ${spice.min_bulk_qty_kg}kg. Enter at least that amount — we do not round up.`);
  }
  const latest = await getLatestMandi(tracked.slug);
  const fx = await getCachedFx();
  const addOns = await getAddOnPricing();
  const grades = (latest?.by_grade ?? []).map((g) => ({
    variety: g.variety,
    grade: g.grade,
    label: g.label,
    key: `${g.variety}|${g.grade}`,
    average_modal_price: g.average_modal_price,
    inr_per_kg: mandiQuintalToInrPerKg(g.average_modal_price),
    market_count: g.market_count,
  }));
  const mandiAvgKg = mandiInrPerKg(latest);
  const mandiKg = mandiInrPerKg(latest, input.grade || undefined) ?? mandiAvgKg;
  const quote = computeBulkQuote({
    spice,
    qtyKg: input.qtyKg,
    destination: destParse.data,
    agmarknetModalAvgInr: mandiKg,
    fxInrGbp: fx.inr_gbp,
    fxInrEur: fx.inr_eur,
    addOns,
    sampleSelected: input.sample,
    documentationSelected: input.documentation,
  });
  return ok(
    {
      quote,
      spice,
      fx,
      addOns,
      mandiInrPerKg: mandiAvgKg,
      minQtyKg: spice.min_bulk_qty_kg,
      needsChaQuoteConfirmation: spice.needsChaQuoteConfirmation,
      grades,
      selectedGrade: input.grade || null,
    },
    { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" }
  );
}

export async function adminListBulkPricing(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const spices = await listSpicePricing();
  const addOns = await getAddOnPricing();
  const fx = await getCachedFx();
  return ok({ spices, addOns, fx });
}

export async function adminUpsertSpicePricing(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const body = JSON.parse(event.body || "{}");
  const parsed = bulkPricingSpiceSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  const saved = await putSpicePricing(parsed.data);
  return ok({ spice: saved });
}

export async function adminUpsertAddOns(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const body = JSON.parse(event.body || "{}");
  const parsed = addOnPricingSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  const saved = await putAddOnPricing(parsed.data);
  return ok({ addOns: saved });
}
