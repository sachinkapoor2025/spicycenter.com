import {
  CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
  OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER,
  catalogueEnquiryEmailSubject,
  enquiryProductsFromMetadata,
  formatEnquiryKind,
  formatEnquiryMarket,
  formatPreferredContactChannel,
  formatEnquiryProductsList,
  shouldShowOverseasContainerDisclaimer,
  shouldShowSampleNotice,
} from "./catalogue-enquiry-model";

const META_FIELDS: { key: string; label: string }[] = [
  { key: "product", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "company", label: "Company" },
  { key: "contactName", label: "Contact name" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "address", label: "Address" },
  { key: "buyerType", label: "Buyer type" },
  { key: "enquiryType", label: "Enquiry type" },
];

export type CatalogueEnquiryEmailInput = {
  name?: string;
  email?: string;
  phone?: string;
  page?: string;
  leadId?: string;
  createdAt?: string;
  metadata?: Record<string, string>;
};

function metaValue(metadata: Record<string, string> | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = metadata?.[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function buildCatalogueEnquiryAdminEmail(input: CatalogueEnquiryEmailInput): {
  subject: string;
  text: string;
} {
  const metadata = input.metadata ?? {};
  const products = enquiryProductsFromMetadata(metadata);
  const product = metaValue(metadata, "product") || "Indian spices";
  const destination = metaValue(metadata, "destination", "country");
  const message = metaValue(metadata, "message");
  const marketLabel = formatEnquiryMarket(metadata.market);
  const kindLabel = formatEnquiryKind(metadata.kind) || metaValue(metadata, "enquiryType");
  const skipLegacyProduct = products.length > 0;

  const lines = [
    "Source: Catalogue enquiry",
    input.name?.trim() ? `Name: ${input.name.trim()}` : null,
    input.email?.trim() ? `Email: ${input.email.trim()}` : null,
    input.phone?.trim() ? `Phone: ${input.phone.trim()}` : null,
    input.page?.trim() ? `Page: ${input.page.trim()}` : null,
    marketLabel ? `Market: ${marketLabel}` : null,
    kindLabel ? `Enquiry type: ${kindLabel}` : null,
    formatPreferredContactChannel(metadata.preferredContactChannel)
      ? `Preferred contact: ${formatPreferredContactChannel(metadata.preferredContactChannel)}`
      : null,
    metaValue(metadata, "state") ? `State: ${metaValue(metadata, "state")}` : null,
    metaValue(metadata, "city") ? `City: ${metaValue(metadata, "city")}` : null,
    metadata.market === "overseas" && metaValue(metadata, "country")
      ? `Country: ${metaValue(metadata, "country")}`
      : null,
    ...META_FIELDS.map(({ key, label }) => {
      if (key === "enquiryType" && kindLabel) return null;
      if (skipLegacyProduct && (key === "product" || key === "quantity")) return null;
      const value = metaValue(metadata, key);
      return value ? `${label}: ${value}` : null;
    }),
    !skipLegacyProduct && destination && metadata.market !== "overseas" ? `Destination: ${destination}` : null,
    products.length ? `Products:\n${formatEnquiryProductsList(products)}` : null,
    message ? `\nMessage:\n${message}` : null,
    shouldShowOverseasContainerDisclaimer(metadata.market, metadata.kind)
      ? `\n${OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER}`
      : null,
    shouldShowSampleNotice(metadata.kind) ? `\n${CATALOGUE_ENQUIRY_SAMPLE_NOTICE}` : null,
    input.leadId ? `Lead ID: ${input.leadId}` : null,
    input.createdAt ? `Created: ${input.createdAt}` : null,
  ].filter(Boolean);

  return {
    subject: catalogueEnquiryEmailSubject({
      kind: metadata.kind,
      products,
      fallbackProduct: product,
    }),
    text: lines.join("\n"),
  };
}
