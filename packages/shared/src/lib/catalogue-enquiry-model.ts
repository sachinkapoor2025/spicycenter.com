/** Agreed catalogue enquiry model (Stage 1). Presentation and validation only — not the live POST /leads contract. */

export const ENQUIRY_MARKETS = {
  INDIA: "india",
  OVERSEAS: "overseas",
} as const;

export type EnquiryMarket = (typeof ENQUIRY_MARKETS)[keyof typeof ENQUIRY_MARKETS];

export const ENQUIRY_MARKET_OPTIONS = [
  { id: ENQUIRY_MARKETS.INDIA, label: "Within India" },
  { id: ENQUIRY_MARKETS.OVERSEAS, label: "Overseas & Abroad" },
] as const;

export const ENQUIRY_KINDS = {
  COMMERCIAL_ORDER: "commercial-order",
  SAMPLE_REQUEST: "sample-request",
  SIMPLE_PRODUCT_ENQUIRY: "simple-product-enquiry",
} as const;

export type EnquiryKind = (typeof ENQUIRY_KINDS)[keyof typeof ENQUIRY_KINDS];

export const ENQUIRY_KIND_OPTIONS = [
  { id: ENQUIRY_KINDS.COMMERCIAL_ORDER, label: "Commercial order" },
  { id: ENQUIRY_KINDS.SAMPLE_REQUEST, label: "Sample request" },
  { id: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY, label: "Simple product enquiry" },
] as const;

/** Buyer-chosen follow-up channel. Stored in lead metadata; does not change source. */
export const PREFERRED_CONTACT_CHANNELS = {
  EMAIL: "email",
  WHATSAPP: "whatsapp",
} as const;

export type PreferredContactChannel =
  (typeof PREFERRED_CONTACT_CHANNELS)[keyof typeof PREFERRED_CONTACT_CHANNELS];

export function formatPreferredContactChannel(value?: string): string {
  if (value === PREFERRED_CONTACT_CHANNELS.WHATSAPP) return "WhatsApp preferred";
  if (value === PREFERRED_CONTACT_CHANNELS.EMAIL) return "Email";
  return "";
}

/** Short form label for overseas commercial orders. Display copy only — not a calculated MOQ. */
export const OVERSEAS_COMMERCIAL_MOQ_LABEL =
  "Minimum order quantity: 1 × 20-foot Full Container Load (FCL).";

/** Admin-email wording for the same overseas commercial-order notice. Not a checkout calculation. */
export const OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER =
  "Minimum order quantity for overseas commercial orders is 1 × 20-foot Full Container Load (FCL). The buyer specifies the product quantities and units.";

export const CATALOGUE_ENQUIRY_SAMPLE_NOTICE =
  "Sample requests are considered based on your enquiry. The buyer is responsible for the sample cost and shipping charges. Our team will confirm the applicable costs before proceeding.";

export type EnquiryProductLine = {
  name: string;
  quantity?: string;
  unit?: string;
};

export type CatalogueEnquiryDraft = {
  market?: string;
  kind?: string;
  state?: string;
  city?: string;
  country?: string;
  address?: string;
  products?: Array<{ name?: string; quantity?: string; unit?: string }>;
};

export type CatalogueEnquiryIssue = {
  field: string;
  message: string;
};

export function isEnquiryMarket(value: string | undefined): value is EnquiryMarket {
  return value === ENQUIRY_MARKETS.INDIA || value === ENQUIRY_MARKETS.OVERSEAS;
}

export function isEnquiryKind(value: string | undefined): value is EnquiryKind {
  return (
    value === ENQUIRY_KINDS.COMMERCIAL_ORDER ||
    value === ENQUIRY_KINDS.SAMPLE_REQUEST ||
    value === ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY
  );
}

export function formatEnquiryMarket(market?: string): string {
  return ENQUIRY_MARKET_OPTIONS.find((option) => option.id === market)?.label ?? "";
}

export function formatEnquiryKind(kind?: string): string {
  return ENQUIRY_KIND_OPTIONS.find((option) => option.id === kind)?.label ?? "";
}

/** Commercial orders collect buyer-specified quantity and unit. Samples and simple enquiries do not require a commercial quantity. */
export function enquiryRequiresCommercialQuantity(kind?: string): boolean {
  return kind === ENQUIRY_KINDS.COMMERCIAL_ORDER;
}

export function shouldShowOverseasContainerDisclaimer(market?: string, kind?: string): boolean {
  return market === ENQUIRY_MARKETS.OVERSEAS && kind === ENQUIRY_KINDS.COMMERCIAL_ORDER;
}

export function shouldShowSampleNotice(kind?: string): boolean {
  return kind === ENQUIRY_KINDS.SAMPLE_REQUEST;
}

export function catalogueEnquiryLocationFields(market?: string): {
  state: boolean;
  country: boolean;
  city: boolean;
  address: boolean;
} {
  return {
    state: market === ENQUIRY_MARKETS.INDIA,
    country: market === ENQUIRY_MARKETS.OVERSEAS,
    city: market === ENQUIRY_MARKETS.INDIA || market === ENQUIRY_MARKETS.OVERSEAS,
    address: false,
  };
}

export function normalizeEnquiryProductLines(
  products: CatalogueEnquiryDraft["products"]
): EnquiryProductLine[] {
  return (products ?? [])
    .map((line) => ({
      name: line.name?.trim() ?? "",
      quantity: line.quantity?.trim() || undefined,
      unit: line.unit?.trim() || undefined,
    }))
    .filter((line) => line.name.length > 0);
}

export function validateCatalogueEnquiry(draft: CatalogueEnquiryDraft): CatalogueEnquiryIssue[] {
  const issues: CatalogueEnquiryIssue[] = [];

  if (!isEnquiryMarket(draft.market?.trim())) {
    issues.push({ field: "market", message: "Choose Within India or Overseas & Abroad." });
  }

  if (!isEnquiryKind(draft.kind?.trim())) {
    issues.push({ field: "kind", message: "Choose an enquiry type." });
  }

  const location = catalogueEnquiryLocationFields(draft.market?.trim());
  if (location.state && !draft.state?.trim()) {
    issues.push({ field: "state", message: "Enter the Indian state or union territory." });
  }
  if (location.country && !draft.country?.trim()) {
    issues.push({ field: "country", message: "Enter the destination country." });
  }
  if (location.city && !draft.city?.trim()) {
    issues.push({ field: "city", message: "Enter the city." });
  }

  const products = normalizeEnquiryProductLines(draft.products);
  if (products.length === 0) {
    issues.push({ field: "products", message: "Add at least one product." });
    return issues;
  }

  const requireQty = enquiryRequiresCommercialQuantity(draft.kind?.trim());
  products.forEach((line, index) => {
    if (!requireQty) return;
    if (!line.quantity) {
      issues.push({
        field: `products.${index}.quantity`,
        message: "Enter the quantity for this product.",
      });
    }
    if (!line.unit) {
      issues.push({
        field: `products.${index}.unit`,
        message: "Enter the quantity unit for this product.",
      });
    }
  });

  return issues;
}

export function catalogueEnquiryIsValid(draft: CatalogueEnquiryDraft): boolean {
  return validateCatalogueEnquiry(draft).length === 0;
}

export function formatEnquiryProductLine(line: EnquiryProductLine): string {
  const qty = [line.quantity, line.unit].filter(Boolean).join(" ");
  return qty ? `${line.name} — ${qty}` : line.name;
}

export function formatEnquiryProductsList(products: EnquiryProductLine[]): string {
  return products.map((line, index) => `${index + 1}. ${formatEnquiryProductLine(line)}`).join("\n");
}

export function enquiryKindEmailSubject(kind?: string): string {
  if (kind === ENQUIRY_KINDS.COMMERCIAL_ORDER) return "Commercial Order";
  if (kind === ENQUIRY_KINDS.SAMPLE_REQUEST) return "Sample Request";
  if (kind === ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY) return "Simple Product Enquiry";
  return "Catalogue enquiry";
}

export function catalogueEnquiryEmailSubject(input: {
  kind?: string;
  products: EnquiryProductLine[];
  fallbackProduct?: string;
}): string {
  const first = input.products[0]?.name?.trim() || input.fallbackProduct?.trim() || "Indian spices";
  const extra = input.products.length > 1 ? ` + ${input.products.length - 1} more` : "";
  return `[SpicyCenter] ${enquiryKindEmailSubject(input.kind)} — ${first}${extra}`;
}

export type ParseEnquiryProductsResult =
  | { status: "absent" }
  | { status: "ok"; products: EnquiryProductLine[] }
  | { status: "invalid"; error: string };

export function parseEnquiryProductsJson(raw?: string): ParseEnquiryProductsResult {
  if (raw == null || !String(raw).trim()) return { status: "absent" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { status: "invalid", error: "Invalid products payload." };
    }
    const products = normalizeEnquiryProductLines(
      parsed.map((item) => {
        if (!item || typeof item !== "object") return {};
        const row = item as Record<string, unknown>;
        return {
          name: typeof row.name === "string" ? row.name : undefined,
          quantity: typeof row.quantity === "string" ? row.quantity : undefined,
          unit: typeof row.unit === "string" ? row.unit : undefined,
        };
      })
    );
    return { status: "ok", products };
  } catch {
    return { status: "invalid", error: "Invalid products payload." };
  }
}

export function serializeEnquiryProductsJson(products: EnquiryProductLine[]): string {
  return JSON.stringify(
    products.map((line) => ({
      name: line.name,
      ...(line.quantity ? { quantity: line.quantity } : {}),
      ...(line.unit ? { unit: line.unit } : {}),
    }))
  );
}

export type PrepareCatalogueEnquiryMetadataResult =
  | { ok: true; metadata: Record<string, string>; products: EnquiryProductLine[]; structured: boolean }
  | { ok: false; error: string };

/** Normalize catalogue metadata when `productsJson` is present. Legacy leads without it pass through. */
export function prepareCatalogueEnquiryMetadata(
  metadata: Record<string, string> | undefined
): PrepareCatalogueEnquiryMetadataResult {
  const current = { ...(metadata ?? {}) };
  const parsed = parseEnquiryProductsJson(current.productsJson);
  if (parsed.status === "absent") {
    return { ok: true, metadata: current, products: [], structured: false };
  }
  if (parsed.status === "invalid") {
    return { ok: false, error: parsed.error };
  }

  const draft: CatalogueEnquiryDraft = {
    market: current.market,
    kind: current.kind,
    state: current.state,
    city: current.city,
    country: current.country,
    products: parsed.products,
  };
  const issues = validateCatalogueEnquiry(draft);
  if (issues.length > 0) {
    return { ok: false, error: issues[0]?.message ?? "Invalid enquiry." };
  }

  const first = parsed.products[0];
  const quantitySummary = [first?.quantity, first?.unit].filter(Boolean).join(" ");
  const kindLabel = formatEnquiryKind(current.kind);

  return {
    ok: true,
    structured: true,
    products: parsed.products,
    metadata: {
      ...current,
      productsJson: serializeEnquiryProductsJson(parsed.products),
      product: current.product?.trim() || first?.name || "",
      quantity: current.quantity?.trim() || quantitySummary,
      ...(kindLabel ? { enquiryType: current.enquiryType?.trim() || kindLabel } : {}),
    },
  };
}

export function enquiryProductsFromMetadata(metadata?: Record<string, string>): EnquiryProductLine[] {
  const parsed = parseEnquiryProductsJson(metadata?.productsJson);
  if (parsed.status === "ok") return parsed.products;
  return [];
}
