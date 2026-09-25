/** Catalogue display helpers. Pack sizes are enquiry options, never prices. */

export const BRAND_NAME = "SpicyCenter";
export const PRODUCT_ORIGIN = "India";

export const BULK_PACK_SIZES = [
  "100 gm",
  "200 gm",
  "500 gm",
  "1 kg",
  "5 kg",
  "10 kg",
  "15 kg",
  "20 kg",
  "25 kg",
] as const;

export type BulkPackSize = (typeof BULK_PACK_SIZES)[number];

const FEATURED_ARABIC: { match: RegExp; english: string; arabic: string }[] = [
  { match: /\bturmeric\b|\bhaldi\b/i, english: "Turmeric", arabic: "الكركم" },
  { match: /\bcumin\b|\bjeera\b/i, english: "Cumin", arabic: "الكمون" },
  { match: /\bblack pepper\b|\bpeppercorn\b|\bkali mirch\b/i, english: "Black Pepper", arabic: "الفلفل الأسود" },
  { match: /\bcardamom\b|\belaichi\b|\bilaychi\b/i, english: "Cardamom", arabic: "الهيل" },
  { match: /\bcoriander\b|\bdhania\b|\bdhaniya\b/i, english: "Coriander", arabic: "الكزبرة" },
];

export function featuredBilingualName(
  name: string,
  slug = ""
): { english: string; arabic: string } | null {
  const hay = `${slug} ${name}`.replace(/-/g, " ");
  if (/\bblack cumin\b|\bkala jeera\b|\bbunium\b/i.test(hay)) return null;
  if (/\bblack cardamom\b|\bbadi elaichi\b|\bamomum\b/i.test(hay)) return null;
  return FEATURED_ARABIC.find((row) => row.match.test(hay)) ?? null;
}

export function productTypeLabel(categorySlug?: string): string {
  if (!categorySlug) return "Spice";
  return categorySlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function enquiryHref(productName: string, quantity?: string): string {
  const params = new URLSearchParams();
  if (productName.trim()) params.set("product", productName.trim());
  if (quantity?.trim()) params.set("quantity", quantity.trim());
  const qs = params.toString();
  return qs ? `/enquiry?${qs}` : "/enquiry";
}

/** Hide draft price and retail wording baked into generated catalogue copy. */
export function catalogueDescription(text: string): string {
  return text
    .replace(/Selling price is a draft placeholder, not an Indian market reference price\.?/gi, "")
    .replace(/\bRetail pack\.?/gi, "")
    .replace(/Minimum bulk order 10kg\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isKnownPackSize(value: string): value is BulkPackSize {
  return (BULK_PACK_SIZES as readonly string[]).includes(value);
}
