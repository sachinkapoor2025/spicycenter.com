export type LiveMandiGrade = {
  label: string;
  inrPerKg: number | null;
  marketCount: number;
};

export type LiveMandiPriceRow = {
  slug: string;
  spiceId: string;
  spiceName: string;
  inrPerKg: number | null;
  minInrPerKg: number | null;
  maxInrPerKg: number | null;
  marketCount: number | null;
  arrivalDate: string | null;
  fetchedAt: string | null;
  grades: LiveMandiGrade[];
  available: boolean;
};

export type LiveMandiBoard = {
  prices: LiveMandiPriceRow[];
  fetchedAt: string | null;
  source: string;
  disclaimer: string;
  live: boolean;
};

export function formatInrPerKg(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}/kg`;
}

export function formatMandiDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const d = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return day;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export const MANDI_BOARD_PAGE_SIZE = 20;

export type MandiCatalogSpice = {
  id: string;
  slug: string;
  canonicalName: string;
};

function emptyRow(spice: MandiCatalogSpice): LiveMandiPriceRow {
  return {
    slug: spice.slug,
    spiceId: spice.id,
    spiceName: spice.canonicalName,
    inrPerKg: null,
    minInrPerKg: null,
    maxInrPerKg: null,
    marketCount: null,
    arrivalDate: null,
    fetchedAt: null,
    grades: [],
    available: false,
  };
}

/** Join the full spice encyclopaedia with Agmarknet prints. Missing prints stay on the board as pending. */
export function mergeMandiWithCatalog(
  spices: MandiCatalogSpice[],
  prices: LiveMandiPriceRow[]
): LiveMandiPriceRow[] {
  const byKey = new Map<string, LiveMandiPriceRow>();
  for (const p of prices) {
    byKey.set(p.slug, p);
    byKey.set(p.spiceId, p);
  }
  const used = new Set<string>();
  const merged = spices.map((s) => {
    const hit = byKey.get(s.id) ?? byKey.get(s.slug);
    if (!hit) return emptyRow(s);
    used.add(hit.slug);
    return {
      ...hit,
      slug: s.slug,
      spiceId: s.id,
      spiceName: s.canonicalName,
    };
  });
  for (const p of prices) {
    if (!used.has(p.slug)) merged.push(p);
  }
  return merged.sort((a, b) => a.spiceName.localeCompare(b.spiceName, "en"));
}
