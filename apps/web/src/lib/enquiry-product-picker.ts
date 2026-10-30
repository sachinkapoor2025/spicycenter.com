import { cjStorefrontProductsPath, enquiryRequiresCommercialQuantity } from "@spicycorner/shared";
import { enquiryProductName } from "./catalogue";

/** Storefront search cap for the enquiry picker. The client never loads the full catalogue. */
export const ENQUIRY_PRODUCT_SEARCH_LIMIT = 8;

export const ENQUIRY_PRODUCT_SEARCH_DEBOUNCE_MS = 300;

/** A typed character is enough to filter. An empty field uses the short browse list. */
export const ENQUIRY_PRODUCT_SEARCH_MIN_LENGTH = 1;

export type EnquiryPickerCatalogueProduct = {
  slug: string;
  name: string;
  tags?: string[];
};

export type EnquiryPickerSuggestion = {
  key: string;
  name: string;
};

export type EnquiryPickerSelection = {
  key: string;
  name: string;
  quantity: string;
  unit: string;
  unlisted: boolean;
};

/** Storefront page cap used only to browse distinct names. The picker still shows at most eight. */
const ENQUIRY_PRODUCT_BROWSE_LIMIT = 48;

/** Upstream catalogue request. The browser calls the enquiry route instead of this path. */
export function enquiryUpstreamBrowsePath(): string {
  return cjStorefrontProductsPath({ limit: ENQUIRY_PRODUCT_BROWSE_LIMIT });
}

export function enquiryUpstreamSearchPath(query: string): string {
  return cjStorefrontProductsPath({
    search: query.trim(),
    limit: ENQUIRY_PRODUCT_SEARCH_LIMIT,
  });
}

export function enquiryProductBrowsePath(): string {
  return "/api/enquiry-products";
}

export function normalizePickerName(name: string): string {
  return enquirySpiceLabel({ name }).toLowerCase();
}

const SPICE_FORM_TOKENS = ["whole", "powder", "roasted", "crushed", "flakes", "flake", "blend", "seeds", "seed", "leaves", "leaf"];

function spiceIdFromTags(tags?: string[]): string {
  return tags?.find((tag) => tag.startsWith("spice:"))?.slice(6) ?? "";
}

/** Catalogue label with pack size and form removed. The spice tag keeps distinct spices apart. */
export function enquirySpiceLabel(product: { name: string; tags?: string[] }): string {
  const spiceId = spiceIdFromTags(product.tags);
  let label = enquiryProductName(product.name);
  const keep = new Set<string>();
  if (spiceId.endsWith("powder")) keep.add("powder");
  if (spiceId.includes("leaf") || spiceId.endsWith("leaves")) {
    keep.add("leaf");
    keep.add("leaves");
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const token of SPICE_FORM_TOKENS) {
      if (keep.has(token)) continue;
      const next = label.replace(new RegExp(`\\s+${token}$`, "i"), "").replace(/\s{2,}/g, " ").trim();
      if (next && next !== label) {
        label = next;
        changed = true;
      }
    }
  }
  return label;
}

export function enquirySpiceKey(product: EnquiryPickerCatalogueProduct): string {
  const spiceId = spiceIdFromTags(product.tags);
  if (spiceId) return `spice:${spiceId}`;
  return `name:${enquirySpiceLabel(product).toLowerCase()}`;
}

function canonicalSpiceLabel(labels: string[]): string {
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  const folded = unique.map((label) => label.replace(/\bleaves\b/gi, "leaf").toLowerCase());
  if (new Set(folded).size === 1) {
    return unique.find((label) => /\bleaf\b/i.test(label) && !/leaves/i.test(label)) ?? unique[0];
  }
  return unique.slice().sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

/** One suggestion per base spice. Pack sizes and whole/powder forms collapse. */
export function uniqueEnquirySpiceSuggestions(
  products: EnquiryPickerCatalogueProduct[]
): EnquiryPickerSuggestion[] {
  const groups = new Map<string, string[]>();
  const order: string[] = [];
  for (const product of products) {
    const key = enquirySpiceKey(product);
    const labels = groups.get(key);
    if (!labels) {
      groups.set(key, [enquirySpiceLabel(product)]);
      order.push(key);
    } else {
      labels.push(enquirySpiceLabel(product));
    }
  }
  return order.map((key) => ({ key, name: canonicalSpiceLabel(groups.get(key) ?? []) }));
}

export function suggestionsFromCatalogueProducts(
  products: EnquiryPickerCatalogueProduct[]
): EnquiryPickerSuggestion[] {
  return uniqueEnquirySpiceSuggestions(products).slice(0, ENQUIRY_PRODUCT_SEARCH_LIMIT);
}

function productMatchesEnquirySearch(product: EnquiryPickerCatalogueProduct, needle: string): boolean {
  const label = enquirySpiceLabel(product).toLowerCase();
  const stem = enquiryProductName(product.name).toLowerCase();
  const spiceId = spiceIdFromTags(product.tags).replace(/-/g, " ");
  return (
    label.includes(needle) ||
    stem.includes(needle) ||
    product.name.toLowerCase().includes(needle) ||
    spiceId.includes(needle) ||
    (product.tags?.some((tag) => tag.toLowerCase().includes(needle)) ?? false)
  );
}

/** One collapsed catalogue row whose display name equals the query. Fragments stay unselected. */
export function exactCatalogueSuggestion(
  query: string,
  suggestions: EnquiryPickerSuggestion[]
): EnquiryPickerSuggestion | null {
  const needle = normalizePickerName(query);
  if (!needle) return null;
  const matches = suggestions.filter((row) => normalizePickerName(row.name) === needle);
  return matches.length === 1 ? matches[0] : null;
}

export function isCollapsedProductSelected(
  selected: Array<Pick<EnquiryPickerSelection, "key" | "name">>,
  candidate: { key?: string; name: string }
): boolean {
  const name = normalizePickerName(candidate.name);
  if (!name && !candidate.key) return false;
  return selected.some((row) => {
    if (candidate.key && row.key === candidate.key) return true;
    return name.length > 0 && normalizePickerName(row.name) === name;
  });
}

export function visiblePickerSuggestions(
  suggestions: EnquiryPickerSuggestion[],
  selected: Array<Pick<EnquiryPickerSelection, "key" | "name">>
): EnquiryPickerSuggestion[] {
  return suggestions.filter((row) => !isCollapsedProductSelected(selected, row));
}

export function selectionFromCatalogue(
  suggestion: EnquiryPickerSuggestion,
  prefill?: { quantity?: string; unit?: string }
): EnquiryPickerSelection {
  return {
    key: suggestion.key,
    name: suggestion.name,
    quantity: prefill?.quantity ?? "",
    unit: prefill?.unit ?? "",
    unlisted: false,
  };
}

export function selectionFromUnlisted(
  name: string,
  prefill?: { quantity?: string; unit?: string }
): EnquiryPickerSelection {
  const trimmed = name.trim();
  return {
    key: `unlisted:${normalizePickerName(trimmed)}`,
    name: trimmed,
    quantity: prefill?.quantity ?? "",
    unit: prefill?.unit ?? "",
    unlisted: true,
  };
}

export function addPickerProduct(
  selected: EnquiryPickerSelection[],
  candidate: EnquiryPickerSelection
): EnquiryPickerSelection[] | null {
  if (!candidate.name.trim()) return null;
  if (isCollapsedProductSelected(selected, candidate)) return null;
  return [...selected, candidate];
}

export function toEnquiryFormProducts(
  selected: EnquiryPickerSelection[]
): Array<{ name: string; quantity: string; unit: string }> {
  return selected.map((row) => ({
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
  }));
}

export function enquiryProductSearchPath(query: string): string {
  return `/api/enquiry-products?${new URLSearchParams({ search: query.trim() }).toString()}`;
}

/** Use the bundled catalogue when it is loaded. An empty catalogue falls back to live API rows. */
export function resolveEnquiryProductSuggestions(
  apiProducts: EnquiryPickerCatalogueProduct[],
  catalogProducts: EnquiryPickerCatalogueProduct[],
  search: string
): EnquiryPickerSuggestion[] {
  const pool = catalogProducts.length > 0 ? catalogProducts : apiProducts;
  const needle = search.trim().toLowerCase();
  const filtered = needle ? pool.filter((product) => productMatchesEnquirySearch(product, needle)) : pool;
  return suggestionsFromCatalogueProducts(filtered);
}

export const OTHER_PRODUCT_LABEL = "Other";

export const OTHER_PRODUCT_NOTE = "This name is not a catalogue match.";

/** Sample and generic enquiries must not submit quantities left over from a commercial order. */
export function productsForSubmission(
  selected: EnquiryPickerSelection[],
  kind: string
): Array<{ name: string; quantity: string; unit: string }> {
  const products = toEnquiryFormProducts(selected);
  if (pickerQuantityFieldsVisible(kind)) return products;
  return products.map((row) => ({ name: row.name, quantity: "", unit: "" }));
}

export function unlistedProductOffer(
  query: string,
  suggestions: EnquiryPickerSuggestion[],
  selected: Array<Pick<EnquiryPickerSelection, "key" | "name">>
): { name: string; label: string } | null {
  const name = query.trim();
  if (!name) return null;
  if (exactCatalogueSuggestion(name, suggestions)) return null;
  if (isCollapsedProductSelected(selected, { name })) return null;
  return { name, label: OTHER_PRODUCT_LABEL };
}

/** Commercial orders ask for quantity and unit. Sample and simple enquiries keep any saved values hidden. */
export function pickerQuantityFieldsVisible(kind: string): boolean {
  return enquiryRequiresCommercialQuantity(kind);
}
