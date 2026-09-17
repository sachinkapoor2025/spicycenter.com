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
