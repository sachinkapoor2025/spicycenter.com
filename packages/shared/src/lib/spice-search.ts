export type SearchHitKind = "product" | "spice" | "guide" | "recipe" | "article" | "market";

export function normalizeSearchQuery(q: string): string {
  return q
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detect bulk quantity hints such as 25kg / 25 kg. */
export function parseBulkHint(q: string): { kg: number | null; prefersBulk: boolean } {
  const n = normalizeSearchQuery(q);
  const m = n.match(/(\d+(?:\.\d+)?)\s*kg/);
  const kg = m ? Number(m[1]) : null;
  const prefersBulk = Boolean(kg && kg >= 10) || /\bbulk\b|\bwholesale\b/.test(n);
  return { kg, prefersBulk };
}

export function aliasMatches(query: string, aliases: string[]): boolean {
  const n = normalizeSearchQuery(query);
  if (!n) return false;
  return aliases.some((a) => {
    const alias = normalizeSearchQuery(a);
    return alias === n || alias.includes(n) || n.includes(alias);
  });
}
