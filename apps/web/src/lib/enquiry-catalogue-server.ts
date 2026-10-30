import { api } from "@/lib/api";
import { loadSpiceCatalogFile } from "@/lib/spice-data";
import {
  ENQUIRY_PRODUCT_SEARCH_MIN_LENGTH,
  enquiryUpstreamBrowsePath,
  enquiryUpstreamSearchPath,
  resolveEnquiryProductSuggestions,
  type EnquiryPickerCatalogueProduct,
  type EnquiryPickerSuggestion,
} from "@/lib/enquiry-product-picker";

function catalogProducts(): EnquiryPickerCatalogueProduct[] {
  return (loadSpiceCatalogFile().products ?? [])
    .filter((product) => product.tags?.some((tag) => tag.startsWith("spice:")))
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      tags: product.tags,
    }));
}

/** Bundled catalogue is the complete suggestion source. Live rows are used when that catalogue is empty. A failed request still falls back to the bundled catalogue. */
export async function loadEnquiryProductSuggestions(search: string): Promise<EnquiryPickerSuggestion[]> {
  const trimmed = search.trim();
  const browsing = trimmed.length < ENQUIRY_PRODUCT_SEARCH_MIN_LENGTH;
  const catalog = catalogProducts();
  let apiProducts: EnquiryPickerCatalogueProduct[] = [];
  try {
    const data = await api<{ products?: EnquiryPickerCatalogueProduct[] }>(
      browsing ? enquiryUpstreamBrowsePath() : enquiryUpstreamSearchPath(trimmed),
      { revalidate: false }
    );
    apiProducts = data.products ?? [];
  } catch (error) {
    if (catalog.length === 0) throw error;
  }
  return resolveEnquiryProductSuggestions(apiProducts, catalog, trimmed);
}
