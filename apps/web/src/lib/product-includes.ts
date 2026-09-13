import type { Product } from "@spicycorner/shared";
import { looksLikeHtml, stripHtml } from "./html-text";

type ProductLike = Pick<Product, "name" | "description" | "categorySlug" | "tags"> & {
  slug?: string;
  hamperContents?: Product["hamperContents"];
};

function hasChocolateSignal(text: string): boolean {
  return /chocolate|ferrero|hershey|lindor|lindt|kitkat|dairy\s*milk|snicker|candy|treat/i.test(
    text
  );
}

/** Parse explicit chocolate / candy includes from name/description. */
export function parseChocolateInclude(text: string): string | null {
  const patterns: { re: RegExp; label: (n: string) => string }[] = [
    {
      re: /includes\s+(\d+)\s+ferrero\s*rocher\s+chocolates?/i,
      label: (n) => `${n} Ferrero Rocher Chocolates`,
    },
    {
      re: /includes\s+(\d+)\s+(?:small\s+)?hershey'?s?\s+chocolates?/i,
      label: (n) => `${n} small Hershey's chocolates`,
    },
    {
      re: /includes\s+(\d+)\s+lind(?:or|t(?:\s+lindor)?)\s+chocolates?/i,
      label: (n) => `${n} Lindor Chocolates`,
    },
    {
      re: /includes\s+\d+\s+assorted\s+chocolates?/i,
      label: () => "Assorted Chocolates",
    },
    {
      re: /includes\s+\d+\s+chocolates?/i,
      label: () => "Assorted Chocolates",
    },
    {
      re: /with\s+(\d+)\s+(?:small\s+)?hershey'?s?\s+chocolates?/i,
      label: (n) => `${n} small Hershey's chocolates`,
    },
    {
      re: /with\s+(\d+)\s+ferrero\s*rocher\s+chocolates?/i,
      label: (n) => `${n} Ferrero Rocher Chocolates`,
    },
    {
      re: /with\s+(\d+)\s+lind(?:or|t)\s+chocolates?/i,
      label: (n) => `${n} Lindor Chocolates`,
    },
    {
      re: /with\s+\d+\s+assorted\s+chocolates?/i,
      label: () => "Assorted Chocolates",
    },
    {
      re: /with\s+\d+\s+chocolates?/i,
      label: () => "Assorted Chocolates",
    },
  ];

  for (const { re, label } of patterns) {
    const m = text.match(re);
    if (m) return label(m[1] ?? "");
  }

  if (!hasChocolateSignal(text)) return null;

  if (/ferrero/i.test(text)) return "3 Ferrero Rocher Chocolates";
  if (/hershey/i.test(text)) return "2 small Hershey's chocolates";
  if (/lindor|lindt/i.test(text)) return "5 Lindor Chocolates";
  return "Assorted spice treats";
}

function categoryIncludeLines(categorySlug: string): string[] {
  switch (categorySlug) {
    case "whole-spices":
      return ["Whole spice as pictured (pack size on the product page)"];
    case "ground-spices":
      return ["Ground spice as pictured"];
    case "indian-chillies":
      return ["Indian chilli as pictured"];
    case "indian-masalas":
      return ["Masala blend as pictured"];
    case "bulk-spices":
      return ["Bulk spice pack (10kg minimum wholesale)"];
    default:
      return ["Spice product as pictured"];
  }
}

/** Shown on every product's What's included checklist. */
function shippingIncludeLines(): string[] {
  return ["Delivering in 5–7 days", "Best quality at competitive rates"];
}

function fromHtmlList(description: string): string[] {
  return [...description.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripHtml(m[1]!))
    .filter(Boolean);
}

function isMarketingLine(line: string): boolean {
  return /clear what'?s-included|domestic usa shipping|ships from|from china|from usa|california warehouse|festive packaging|secure checkout|no international customs|stripe|razorpay/i.test(
    line
  );
}

/** Normalize include checklist lines (shared platform helper). */
export function normalizeHamperIncludeLine(line: string): string[] {
  const t = line.replace(/\.$/, "").replace(/\s+/g, " ").trim();
  if (!t || isMarketingLine(t)) return [];
  return [t];
}

/**
 * Customer-facing "What's included" lines for SpicyCorner product detail pages.
 */
export function getProductIncludes(product: ProductLike): string[] {
  const { description, name, categorySlug, tags, hamperContents } = product;

  if (hamperContents?.length) {
    return [...hamperContents.map((c) => c.name), ...shippingIncludeLines()];
  }

  if (looksLikeHtml(description) && /<li[\s>]/i.test(description)) {
    const fromHtml = fromHtmlList(description).flatMap(normalizeHamperIncludeLine);
    if (fromHtml.length > 0) return [...fromHtml, ...shippingIncludeLines()];
  }

  const blob = [name, description, ...(tags ?? [])].join(" ");
  const plain = looksLikeHtml(blob) ? stripHtml(blob) : blob;

  const items = [...categoryIncludeLines(categorySlug)];
  const chocolate = parseChocolateInclude(plain);
  if (chocolate) items.push(chocolate);

  return [...items, ...shippingIncludeLines()];
}
