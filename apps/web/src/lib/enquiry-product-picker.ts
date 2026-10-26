import { cjStorefrontProductsPath, enquiryRequiresCommercialQuantity } from "@spicycorner/shared";
import { collapseToOneEnquiryProduct, enquiryProductKey, enquiryProductName } from "./catalogue";

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

export function enquiryProductBrowsePath(): string {
  return cjStorefrontProductsPath({ limit: ENQUIRY_PRODUCT_BROWSE_LIMIT });
}

export function normalizePickerName(name: string): string {
  return enquiryProductName(name).trim().toLowerCase();
}

export function suggestionsFromCatalogueProducts(
  products: EnquiryPickerCatalogueProduct[]
): EnquiryPickerSuggestion[] {
  return collapseToOneEnquiryProduct(products)
    .map((product) => ({
      key: enquiryProductKey(product),
      name: product.name,
    }))
    .slice(0, ENQUIRY_PRODUCT_SEARCH_LIMIT);
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
  return cjStorefrontProductsPath({
    search: query.trim(),
    limit: ENQUIRY_PRODUCT_SEARCH_LIMIT,
  });
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
