/** Gift-set plumbing kept for cart line matching. No bundled gift SKUs are seeded. */

import type { CartAddonLike } from "./product-addons";

export function galleryImagesForHamper(
  contents: Array<{ image?: string }> | undefined,
  fallback: string[] = []
): string[] {
  const fromContents = (contents ?? []).map((c) => c.image).filter((u): u is string => Boolean(u));
  return fromContents.length ? fromContents : fallback;
}

export type HamperCustomization = {
  excludedSlugs: string[];
  replacements: Array<{ fromSlug: string; toSlug: string }>;
  extraSlugs: string[];
};

export type HamperLine = { slug: string; name?: string; price?: number; image?: string };

export function isGiftSetProduct(_product: {
  categorySlug?: string | null;
  tags?: string[] | null;
  slug?: string | null;
}): boolean {
  return false;
}

export function isStorefrontVisibleProduct(product: {
  vendorSlug?: string | null;
  cjPid?: string | null;
  tags?: string[] | null;
}): boolean {
  if (product.tags?.some((t) => t.startsWith("spice:") || t === "draft-pricing")) return true;
  if (!product.vendorSlug && !product.cjPid) return true;
  if (product.vendorSlug === "spicycorner") return true;
  return false;
}

export function hamperContentsValue(contents: Array<{ price: number }>): number {
  return contents.reduce((sum, item) => sum + item.price, 0);
}

export function emptyHamperCustomization(): HamperCustomization {
  return { excludedSlugs: [], replacements: [], extraSlugs: [] };
}

export function hamperCustomizationSignature(custom?: HamperCustomization | null): string {
  if (!custom) return "";
  const excluded = [...(custom.excludedSlugs ?? [])].sort().join(",");
  const reps = [...(custom.replacements ?? [])]
    .map((r) => `${r.fromSlug}>${r.toSlug}`)
    .sort()
    .join(",");
  const extras = [...(custom.extraSlugs ?? [])].sort().join(",");
  if (!excluded && !reps && !extras) return "";
  return `ex:${excluded}|rp:${reps}|ad:${extras}`;
}

export function cartLinesMatch(
  a: {
    addons?: Array<{ id: string; quantity?: number }> | null;
    hamperCustomization?: HamperCustomization | null;
    cjVid?: string | null;
  },
  b: {
    addons?: Array<{ id: string; quantity?: number }> | null;
    hamperCustomization?: HamperCustomization | null;
    cjVid?: string | null;
  }
): boolean {
  return (
    (a.cjVid || "") === (b.cjVid || "") &&
    hamperCustomizationSignature(a.hamperCustomization) === hamperCustomizationSignature(b.hamperCustomization) &&
    JSON.stringify(a.addons ?? []) === JSON.stringify(b.addons ?? [])
  );
}

export function resolveHamperCustomization(
  _product: unknown,
  custom?: HamperCustomization | null
): { ok: true; extras: CartAddonLike[]; custom: HamperCustomization } | { ok: false; error: string } {
  return { ok: true, extras: [], custom: custom ?? emptyHamperCustomization() };
}

export function resolvedHamperContentSlugs(
  contents: HamperLine[],
  custom?: HamperCustomization | null
): string[] {
  const excluded = new Set(custom?.excludedSlugs ?? []);
  const kept = contents.filter((c) => !excluded.has(c.slug)).map((c) => c.slug);
  const swapped = (custom?.replacements ?? []).map((r) => r.toSlug);
  const extras = custom?.extraSlugs ?? [];
  return [...kept, ...swapped, ...extras];
}

/** No gift-set catalog is seeded for SpicyCenter. */
export function getspiceHamperDef(_slug: string): { contents: HamperLine[] } | undefined {
  return undefined;
}

export function buildGiftSetCatalogProducts(): unknown[] {
  return [];
}

export const GIFT_SETS_CATEGORY = {
  name: "Gift sets",
  slug: "gift-sets",
  description: "Optional spice gift sets — none are seeded by default.",
  sortOrder: 99,
} as const;
