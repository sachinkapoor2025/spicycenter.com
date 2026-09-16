import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  addOnPricingSchema,
  bulkDestinationSchema,
  bulkPricingSpiceSchema,
  computeBulkQuote,
  findTrackedCommodity,
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
  return event.queryStringParameters?.[key] ?? "";
}

export async function previewQuote(event: APIGatewayProxyEventV2) {
  const spiceInput = qs(event, "spiceId") || qs(event, "commodity");
  const tracked = findTrackedCommodity(spiceInput);
  if (!tracked) return badRequest("Unknown spice. Choose a tracked bulk commodity.");
  const qtyKg = Number(qs(event, "qtyKg"));
  const destParse = bulkDestinationSchema.safeParse((qs(event, "destination") || "UK").toUpperCase());
  if (!destParse.success) return badRequest("destination must be UK or EU.");
  const spice = await getSpicePricing(tracked.spiceId);
  if (qtyBelowMinimum(qtyKg, spice.min_bulk_qty_kg)) {
    return badRequest(`Minimum bulk quantity is ${spice.min_bulk_qty_kg}kg. Enter at least that amount — we do not round up.`);
  }
  const latest = await getLatestMandi(tracked.slug);
  const fx = await getCachedFx();
  const addOns = await getAddOnPricing();
  const gradeKey = qs(event, "grade");
  const quote = computeBulkQuote({
    spice,
    qtyKg,
    destination: destParse.data,
    agmarknetModalAvgInr: mandiInrPerKg(latest, gradeKey || undefined),
    fxInrGbp: fx.inr_gbp,
    fxInrEur: fx.inr_eur,
    addOns,
    sampleSelected: qs(event, "sample") === "1" || qs(event, "sample") === "true",
    documentationSelected: qs(event, "documentation") === "1" || qs(event, "documentation") === "true",
  });
  return ok(
    {
      quote,
      fx,
      addOns,
      minQtyKg: spice.min_bulk_qty_kg,
      needsChaQuoteConfirmation: spice.needsChaQuoteConfirmation,
      grades: latest?.by_grade ?? [],
      selectedGrade: gradeKey || null,
    },
    { "Cache-Control": "no-store" }
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
