import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import {
  AGMARKNET_RESOURCE_URL,
  AGMARKNET_SECRET_NAME,
  AGMARKNET_SOURCE_DISCLAIMER,
  TRACKED_COMMODITIES,
  type TrackedCommodity,
} from "@spicycorner/shared";

export type AgmarknetRecord = {
  commodity?: string;
  market?: string;
  state?: string;
  district?: string;
  min_price?: string | number;
  max_price?: string | number;
  modal_price?: string | number;
  arrival_date?: string;
  variety?: string;
};

function num(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseSecret(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { apiKey?: string; "api-key"?: string; value?: string };
      const key = parsed.apiKey ?? parsed["api-key"] ?? parsed.value;
      if (key) return key;
    } catch {
      /* use raw */
    }
  }
  return trimmed;
}

export async function readAgmarknetApiKey(): Promise<string> {
  const secretId = process.env.AGMARKNET_SECRET_NAME?.trim() || AGMARKNET_SECRET_NAME;
  const client = new SecretsManagerClient({});
  const result = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  const raw = result.SecretString;
  if (!raw) throw new Error("Agmarknet API key secret is empty");
  const key = parseSecret(raw);
  if (!key) throw new Error("Agmarknet API key secret has no value");
  return key;
}

export async function fetchCommodityPage(opts: {
  apiKey: string;
  commodity: string;
  offset: number;
  limit: number;
  arrivalDate?: string;
}): Promise<{ records: AgmarknetRecord[]; total: number }> {
  const url = new URL(AGMARKNET_RESOURCE_URL);
  url.searchParams.set("api-key", opts.apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("filters[commodity]", opts.commodity);
  url.searchParams.set("limit", String(opts.limit));
  url.searchParams.set("offset", String(opts.offset));
  if (opts.arrivalDate) url.searchParams.set("filters[arrival_date]", opts.arrivalDate);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Agmarknet HTTP ${res.status}`);
  }
  const body = (await res.json()) as { records?: AgmarknetRecord[]; total?: number };
  return { records: body.records ?? [], total: Number(body.total ?? 0) };
}

export async function fetchAllCommodityRecords(
  apiKey: string,
  commodity: TrackedCommodity,
  arrivalDate?: string
): Promise<AgmarknetRecord[]> {
  const limit = 100;
  let offset = 0;
  const all: AgmarknetRecord[] = [];
  for (;;) {
    const page = await fetchCommodityPage({
      apiKey,
      commodity: commodity.agmarknetName,
      offset,
      limit,
      arrivalDate,
    });
    all.push(...page.records);
    if (page.records.length === 0) break;
    offset += page.records.length;
    if (page.total > 0 && offset >= page.total) break;
    if (page.records.length < limit) break;
    if (offset > 20_000) break;
  }
  return all;
}

export function toIsoArrivalDate(raw?: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}

export function normalizeMarketName(market?: string): string {
  return (market ?? "unknown")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function parsePriceRow(record: AgmarknetRecord) {
  return {
    commodity: record.commodity ?? "",
    market: normalizeMarketName(record.market),
    state: record.state ?? "",
    district: record.district ?? "",
    min_price: num(record.min_price),
    max_price: num(record.max_price),
    modal_price: num(record.modal_price),
    arrival_date: toIsoArrivalDate(record.arrival_date),
    unit: "INR/quintal as reported",
    source_disclaimer: AGMARKNET_SOURCE_DISCLAIMER,
  };
}

export { TRACKED_COMMODITIES };
