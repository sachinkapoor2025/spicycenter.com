import { GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  addOnPricingSchema,
  bulkPricingKeys,
  bulkPricingSpiceSchema,
  defaultAdvisoryNote,
  DEFAULT_BULK_MIN_QTY_KG,
  DEFAULT_CLEARANCE_CHARGE_INR,
  DEFAULT_DESICCANT_FEE_HIGH_INR,
  DEFAULT_DESICCANT_FEE_STANDARD_INR,
  DEFAULT_DOCUMENTATION_FEE_EUR,
  DEFAULT_DOCUMENTATION_FEE_GBP,
  DEFAULT_FREIGHT_TIERS,
  DEFAULT_MARKUP_PERCENT,
  DEFAULT_SAMPLE_FEE_EUR,
  DEFAULT_SAMPLE_FEE_GBP,
  DEFAULT_SHIPPING_INR_PER_KG_UK,
  DEFAULT_TESTING_CHARGE_INR,
  findTrackedCommodity,
  freightTiersSchema,
  fxRateKeys,
  mandiPriceKeys,
  mandiQuintalToInrPerKg,
  moistureTreatmentPricingSchema,
  TRACKED_COMMODITIES,
  type AddOnPricing,
  type BulkPricingSpice,
  type FreightTiersConfig,
  type FxCache,
  type MoistureTreatmentPricing,
} from "@spicycorner/shared";
import { BULK_PRICING_TABLE, docClient, SPICE_MANDI_PRICES_TABLE } from "./db";

export type MandiGradeSlice = {
  variety: string;
  grade: string;
  label: string;
  average_modal_price: number;
  market_count: number;
};

export type LatestMandi = {
  commodity: string;
  modal_price: number;
  average_modal_price?: number;
  min_price?: number;
  max_price?: number;
  arrival_date?: string;
  fetched_at?: string;
  market_count?: number;
  unit?: string;
  source_disclaimer?: string;
  by_grade?: MandiGradeSlice[];
};

const FALLBACK_FX: FxCache = {
  inr_gbp: 0.009,
  inr_eur: 0.0105,
  fetched_at: "1970-01-01T00:00:00.000Z",
  source: "static-fallback",
};

export function mandiFieldInrPerKg(latest: LatestMandi | null, quintal: number | undefined | null): number | null {
  if (!latest || typeof quintal !== "number" || quintal <= 0) return null;
  const unit = String(latest.unit ?? "");
  if (/quintal/i.test(unit) || quintal >= 400) return mandiQuintalToInrPerKg(quintal);
  return quintal;
}

export function mandiInrPerKg(latest: LatestMandi | null, gradeKey?: string): number | null {
  if (!latest) return null;
  let quintal = latest.average_modal_price ?? latest.modal_price;
  if (gradeKey && latest.by_grade?.length) {
    const slice = latest.by_grade.find(
      (g) => g.label === gradeKey || `${g.variety}|${g.grade}` === gradeKey
    );
    if (slice?.average_modal_price) quintal = slice.average_modal_price;
  }
  return mandiFieldInrPerKg(latest, quintal);
}

function feeNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getLatestMandi(slug: string): Promise<LatestMandi | null> {
  const res = await docClient.send(
    new GetCommand({
      TableName: SPICE_MANDI_PRICES_TABLE,
      Key: { PK: mandiPriceKeys.pk(slug), SK: mandiPriceKeys.latestSk() },
    })
  );
  if (!res.Item || typeof res.Item.modal_price !== "number") return null;
  return res.Item as LatestMandi;
}

export async function listLatestMandi(): Promise<{ slug: string; latest: LatestMandi | null }[]> {
  return Promise.all(
    TRACKED_COMMODITIES.map(async (c) => ({
      slug: c.slug,
      latest: await getLatestMandi(c.slug),
    }))
  );
}

export async function getMandiHistory(slug: string, from: string, to: string) {
  const res = await docClient.send(
    new QueryCommand({
      TableName: SPICE_MANDI_PRICES_TABLE,
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :from AND :to",
      ExpressionAttributeValues: {
        ":pk": mandiPriceKeys.pk(slug),
        ":from": `DATE#${from}`,
        ":to": `DATE#${to}\uffff`,
      },
    })
  );
  const items = (res.Items ?? []).filter((i) => typeof i.SK === "string" && i.SK.startsWith("DATE#"));
  items.sort((a, b) => String(a.SK).localeCompare(String(b.SK)));
  return items;
}

export async function getCachedFx(): Promise<FxCache> {
  try {
    const res = await docClient.send(
      new GetCommand({
        TableName: SPICE_MANDI_PRICES_TABLE,
        Key: { PK: fxRateKeys.pk(), SK: fxRateKeys.latestSk() },
      })
    );
    const gbp = Number(res.Item?.inr_gbp);
    const eur = Number(res.Item?.inr_eur);
    if (gbp > 0 && eur > 0) {
      return {
        inr_gbp: gbp,
        inr_eur: eur,
        fetched_at: String(res.Item?.fetched_at ?? ""),
        source: String(res.Item?.source ?? "cache"),
      };
    }
  } catch (err) {
    console.error("FX cache read failed; using last-known static fallback", err);
  }
  return FALLBACK_FX;
}

function defaultSpicePricing(spiceId: string): BulkPricingSpice {
  const tracked = findTrackedCommodity(spiceId) ?? TRACKED_COMMODITIES.find((c) => c.spiceId === spiceId);
  const name = tracked?.spiceName ?? spiceId;
  return bulkPricingSpiceSchema.parse({
    spice_id: tracked?.spiceId ?? spiceId,
    spice_name: name,
    base_price_inr_per_kg: null,
    markup_percent: DEFAULT_MARKUP_PERCENT,
    shipping_rate_inr_per_kg_uk: DEFAULT_SHIPPING_INR_PER_KG_UK,
    shipping_rate_inr_per_kg_eu: DEFAULT_SHIPPING_INR_PER_KG_UK,
    clearance_charge_inr: DEFAULT_CLEARANCE_CHARGE_INR,
    testing_charge_inr: DEFAULT_TESTING_CHARGE_INR,
    min_bulk_qty_kg: DEFAULT_BULK_MIN_QTY_KG,
    needsChaQuoteConfirmation: true,
    spice_form: "whole",
    moisture_sensitivity: "standard",
    advisory_note: defaultAdvisoryNote(name, "whole"),
  });
}

function hydrateSpicePricing(row: BulkPricingSpice): BulkPricingSpice {
  const form = row.spice_form ?? "whole";
  const sensitivity = row.moisture_sensitivity ?? (form === "ground" ? "high" : "standard");
  return {
    ...row,
    spice_form: form,
    moisture_sensitivity: sensitivity,
    advisory_note: row.advisory_note?.trim() ? row.advisory_note : defaultAdvisoryNote(row.spice_name, form),
  };
}

export async function getSpicePricing(spiceId: string): Promise<BulkPricingSpice> {
  const res = await docClient.send(
    new GetCommand({
      TableName: BULK_PRICING_TABLE,
      Key: { PK: bulkPricingKeys.spicePk(spiceId), SK: bulkPricingKeys.spiceSk() },
    })
  );
  if (!res.Item) return defaultSpicePricing(spiceId);
  return hydrateSpicePricing(bulkPricingSpiceSchema.parse({ ...defaultSpicePricing(spiceId), ...res.Item }));
}

export async function putSpicePricing(row: BulkPricingSpice) {
  const parsed = bulkPricingSpiceSchema.parse(row);
  await docClient.send(
    new PutCommand({
      TableName: BULK_PRICING_TABLE,
      Item: { PK: bulkPricingKeys.spicePk(parsed.spice_id), SK: bulkPricingKeys.spiceSk(), ...parsed },
    })
  );
  return parsed;
}

export async function listSpicePricing(): Promise<BulkPricingSpice[]> {
  const res = await docClient.send(
    new ScanCommand({
      TableName: BULK_PRICING_TABLE,
      FilterExpression: "begins_with(PK, :p)",
      ExpressionAttributeValues: { ":p": "SPICE#" },
    })
  );
  const fromDb = (res.Items ?? []).map((i) =>
    hydrateSpicePricing(bulkPricingSpiceSchema.parse({ ...defaultSpicePricing(String(i.spice_id)), ...i }))
  );
  const byId = new Map(fromDb.map((r) => [r.spice_id, r]));
  return TRACKED_COMMODITIES.map((c) => byId.get(c.spiceId) ?? byId.get(c.slug) ?? defaultSpicePricing(c.spiceId));
}

export async function getAddOnPricing(): Promise<AddOnPricing> {
  const res = await docClient.send(
    new GetCommand({
      TableName: BULK_PRICING_TABLE,
      Key: { PK: bulkPricingKeys.addOnsPk(), SK: bulkPricingKeys.addOnsSk() },
    })
  );
  const item = res.Item ?? {};
  return addOnPricingSchema.parse({
    sample_fee_gbp: (() => {
      const n = feeNumber(item.sample_fee_gbp, DEFAULT_SAMPLE_FEE_GBP);
      return n === 9 ? DEFAULT_SAMPLE_FEE_GBP : n;
    })(),
    sample_fee_eur: feeNumber(item.sample_fee_eur, DEFAULT_SAMPLE_FEE_EUR),
    documentation_handling_fee_gbp: feeNumber(item.documentation_handling_fee_gbp, DEFAULT_DOCUMENTATION_FEE_GBP),
    documentation_handling_fee_eur: feeNumber(item.documentation_handling_fee_eur, DEFAULT_DOCUMENTATION_FEE_EUR),
  });
}

export async function putAddOnPricing(row: AddOnPricing) {
  const parsed = addOnPricingSchema.parse(row);
  await docClient.send(
    new PutCommand({
      TableName: BULK_PRICING_TABLE,
      Item: { PK: bulkPricingKeys.addOnsPk(), SK: bulkPricingKeys.addOnsSk(), ...parsed },
    })
  );
  return parsed;
}

export async function getMoistureTreatmentPricing(): Promise<MoistureTreatmentPricing> {
  const res = await docClient.send(
    new GetCommand({
      TableName: BULK_PRICING_TABLE,
      Key: { PK: bulkPricingKeys.moisturePk(), SK: bulkPricingKeys.moistureSk() },
    })
  );
  const item = res.Item ?? {};
  return moistureTreatmentPricingSchema.parse({
    desiccant_fee_standard_inr: feeNumber(item.desiccant_fee_standard_inr, DEFAULT_DESICCANT_FEE_STANDARD_INR),
    desiccant_fee_high_inr: feeNumber(item.desiccant_fee_high_inr, DEFAULT_DESICCANT_FEE_HIGH_INR),
  });
}

export async function putMoistureTreatmentPricing(row: MoistureTreatmentPricing) {
  const parsed = moistureTreatmentPricingSchema.parse(row);
  await docClient.send(
    new PutCommand({
      TableName: BULK_PRICING_TABLE,
      Item: { PK: bulkPricingKeys.moisturePk(), SK: bulkPricingKeys.moistureSk(), ...parsed },
    })
  );
  return parsed;
}

export async function getFreightTiers(): Promise<FreightTiersConfig> {
  const res = await docClient.send(
    new GetCommand({
      TableName: BULK_PRICING_TABLE,
      Key: { PK: bulkPricingKeys.freightTiersPk(), SK: bulkPricingKeys.freightTiersSk() },
    })
  );
  const item = res.Item ?? {};
  return freightTiersSchema.parse({
    lcl_max_kg: feeNumber(item.lcl_max_kg, DEFAULT_FREIGHT_TIERS.lcl_max_kg) || DEFAULT_FREIGHT_TIERS.lcl_max_kg,
    payload_20ft_kg:
      feeNumber(item.payload_20ft_kg, DEFAULT_FREIGHT_TIERS.payload_20ft_kg) || DEFAULT_FREIGHT_TIERS.payload_20ft_kg,
    payload_40ft_kg:
      feeNumber(item.payload_40ft_kg, DEFAULT_FREIGHT_TIERS.payload_40ft_kg) || DEFAULT_FREIGHT_TIERS.payload_40ft_kg,
  });
}

export async function putFreightTiers(row: FreightTiersConfig) {
  const parsed = freightTiersSchema.parse(row);
  await docClient.send(
    new PutCommand({
      TableName: BULK_PRICING_TABLE,
      Item: { PK: bulkPricingKeys.freightTiersPk(), SK: bulkPricingKeys.freightTiersSk(), ...parsed },
    })
  );
  return parsed;
}
