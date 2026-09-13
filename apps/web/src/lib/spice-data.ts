import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Product, Category } from "@spicycorner/shared";
import type { MarketPrice, SpiceEntity } from "@spicycorner/shared";

function resolvePath(relatives: string[]): string | null {
  const cwd = process.cwd();
  const candidates = relatives.flatMap((rel) => [
    join(cwd, rel),
    join(cwd, "..", rel),
    join(cwd, "../..", rel),
  ]);
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function loadSpiceEntities(): SpiceEntity[] {
  const path = resolvePath(["data/spices.json", "../../data/spices.json"]);
  if (!path) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as SpiceEntity[];
}

export function loadMarketPrices(): MarketPrice[] {
  const path = resolvePath(["data/market-prices.json", "../../data/market-prices.json"]);
  if (!path) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as MarketPrice[];
}

export function loadSpiceCatalogFile(): { categories: Category[]; products: Product[] } {
  const path = resolvePath([
    "scripts/data/spicycenter-catalog.json",
    "../../scripts/data/spicycenter-catalog.json",
  ]);
  if (!path) return { categories: [], products: [] };
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function getSpiceBySlug(slug: string): SpiceEntity | undefined {
  return loadSpiceEntities().find((s) => s.slug === slug || s.id === slug);
}

export function searchSpices(q: string) {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  return loadSpiceEntities().filter((s) => {
    const hay = [
      s.canonicalName,
      s.slug,
      s.hindiName,
      s.botanicalName,
      ...(s.aliases || []),
      ...(s.commonNames || []),
      ...(s.indianNames || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(n) || n.split(/\s+/).every((p) => hay.includes(p));
  });
}
