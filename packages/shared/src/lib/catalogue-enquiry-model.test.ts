import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
  ENQUIRY_KINDS,
  ENQUIRY_MARKETS,
  OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER,
  OVERSEAS_COMMERCIAL_MOQ_LABEL,
  catalogueEnquiryIsValid,
  catalogueEnquiryLocationFields,
  enquiryRequiresCommercialQuantity,
  formatEnquiryKind,
  formatEnquiryMarket,
  formatPreferredContactChannel,
  PREFERRED_CONTACT_CHANNELS,
  normalizeEnquiryProductLines,
  shouldShowOverseasContainerDisclaimer,
  shouldShowSampleNotice,
  parseEnquiryProductsJson,
  prepareCatalogueEnquiryMetadata,
  serializeEnquiryProductsJson,
  validateCatalogueEnquiry,
} from "./catalogue-enquiry-model";

const cumin = { name: "Cumin whole", quantity: "25", unit: "kg" };
const turmeric = { name: "Turmeric powder", quantity: "10", unit: "kg" };

function indiaCommercial(over: Record<string, unknown> = {}) {
  return {
    market: ENQUIRY_MARKETS.INDIA,
    kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
    state: "Punjab",
    city: "Ferozepur",
    products: [cumin, turmeric],
    ...over,
  };
}

function overseasCommercial(over: Record<string, unknown> = {}) {
  return {
    market: ENQUIRY_MARKETS.OVERSEAS,
    kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
    country: "United Arab Emirates",
    city: "Dubai",
    products: [cumin],
    ...over,
  };
}

describe("enquiry labels", () => {
  it("names both markets and all three enquiry types", () => {
    assert.equal(formatEnquiryMarket(ENQUIRY_MARKETS.INDIA), "Within India");
    assert.equal(formatEnquiryMarket(ENQUIRY_MARKETS.OVERSEAS), "Overseas & Abroad");
    assert.equal(formatEnquiryKind(ENQUIRY_KINDS.COMMERCIAL_ORDER), "Commercial order");
    assert.equal(formatEnquiryKind(ENQUIRY_KINDS.SAMPLE_REQUEST), "Sample request");
    assert.equal(formatEnquiryKind(ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY), "Simple product enquiry");
    assert.equal(formatPreferredContactChannel(PREFERRED_CONTACT_CHANNELS.WHATSAPP), "WhatsApp preferred");
    assert.equal(formatPreferredContactChannel(PREFERRED_CONTACT_CHANNELS.EMAIL), "Email");
    assert.equal(formatPreferredContactChannel(undefined), "");
    assert.equal(formatPreferredContactChannel(""), "");
    assert.doesNotMatch(formatPreferredContactChannel("whatsapp"), /sent/i);
  });
});

describe("location fields", () => {
  it("collects state in India and country overseas, and does not ask for a city or full address", () => {
    assert.deepEqual(catalogueEnquiryLocationFields(ENQUIRY_MARKETS.INDIA), {
      state: true,
      country: false,
      city: false,
      address: false,
    });
    assert.deepEqual(catalogueEnquiryLocationFields(ENQUIRY_MARKETS.OVERSEAS), {
      state: false,
      country: true,
      city: false,
      address: false,
    });
  });
});

describe("commercial and sample presentation rules", () => {
  it("shows the one-container disclaimer only for overseas commercial orders", () => {
    assert.equal(
      shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.OVERSEAS, ENQUIRY_KINDS.COMMERCIAL_ORDER),
      true
    );
    assert.equal(
      shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.INDIA, ENQUIRY_KINDS.COMMERCIAL_ORDER),
      false
    );
    assert.equal(
      shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.OVERSEAS, ENQUIRY_KINDS.SAMPLE_REQUEST),
      false
    );
    assert.equal(
      shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.OVERSEAS, ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY),
      false
    );
    assert.equal(
      OVERSEAS_COMMERCIAL_MOQ_LABEL,
      "Minimum order quantity: 1 × 20-foot Full Container Load (FCL)."
    );
    assert.match(OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER, /1 × 20-foot Full Container Load \(FCL\)/);
    assert.doesNotMatch(OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER, /TEU|40ft|\bkg\b|\bMT\b/i);
  });

  it("shows the sample cost notice only for sample requests", () => {
    assert.equal(shouldShowSampleNotice(ENQUIRY_KINDS.SAMPLE_REQUEST), true);
    assert.equal(shouldShowSampleNotice(ENQUIRY_KINDS.COMMERCIAL_ORDER), false);
    assert.equal(shouldShowSampleNotice(ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY), false);
    assert.equal(
      CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
      "Sample requests are considered based on your enquiry. The buyer is responsible for the sample cost and shipping charges. Our team will confirm the applicable costs before proceeding."
    );
  });

  it("requires buyer-specified quantity only on commercial orders", () => {
    assert.equal(enquiryRequiresCommercialQuantity(ENQUIRY_KINDS.COMMERCIAL_ORDER), true);
    assert.equal(enquiryRequiresCommercialQuantity(ENQUIRY_KINDS.SAMPLE_REQUEST), false);
    assert.equal(enquiryRequiresCommercialQuantity(ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY), false);
  });
});

describe("validateCatalogueEnquiry", () => {
  it("requires a market", () => {
    const issues = validateCatalogueEnquiry({
      kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
      city: "Dubai",
      country: "AE",
      products: [{ name: "Cumin whole" }],
    });
    assert.equal(issues.some((issue) => issue.field === "market"), true);
  });

  it("accepts an India commercial order with multiple product lines and no quantity minimum", () => {
    const issues = validateCatalogueEnquiry(indiaCommercial());
    assert.deepEqual(issues, []);
    assert.equal(catalogueEnquiryIsValid(indiaCommercial({ products: [{ name: "Cumin", quantity: "1", unit: "kg" }] })), true);
    assert.equal(
      shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.INDIA, ENQUIRY_KINDS.COMMERCIAL_ORDER),
      false
    );
  });

  it("accepts an overseas commercial order and does not invent a container size", () => {
    assert.equal(catalogueEnquiryIsValid(overseasCommercial()), true);
    assert.equal(catalogueEnquiryIsValid(overseasCommercial({ products: [{ name: "Cumin whole", quantity: "1", unit: "container" }] })), true);
    assert.equal(
      validateCatalogueEnquiry(overseasCommercial()).some((issue) => /20ft|40ft|weight/i.test(issue.message)),
      false
    );
  });

  it("does not require commercial quantity on sample requests in either market", () => {
    assert.equal(
      catalogueEnquiryIsValid({
        market: ENQUIRY_MARKETS.INDIA,
        kind: ENQUIRY_KINDS.SAMPLE_REQUEST,
        state: "Gujarat",
        city: "Unjha",
        products: [{ name: "Cumin whole" }],
      }),
      true
    );
    assert.equal(
      catalogueEnquiryIsValid({
        market: ENQUIRY_MARKETS.OVERSEAS,
        kind: ENQUIRY_KINDS.SAMPLE_REQUEST,
        country: "United Kingdom",
        city: "London",
        products: [{ name: "Turmeric powder", quantity: "500", unit: "gm" }],
      }),
      true
    );
    assert.equal(
      shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.OVERSEAS, ENQUIRY_KINDS.SAMPLE_REQUEST),
      false
    );
  });

  it("does not require a commercial-order quantity on simple product enquiries", () => {
    assert.equal(
      catalogueEnquiryIsValid({
        market: ENQUIRY_MARKETS.OVERSEAS,
        kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
        country: "Singapore",
        city: "Singapore",
        products: [{ name: "Black pepper" }, { name: "Cardamom" }],
      }),
      true
    );
  });

  it("requires quantity and unit on each commercial product line", () => {
    const issues = validateCatalogueEnquiry(
      indiaCommercial({
        products: [
          { name: "Cumin whole", quantity: "25", unit: "kg" },
          { name: "Chilli powder" },
        ],
      })
    );
    assert.equal(issues.some((issue) => issue.field === "products.1.quantity"), true);
    assert.equal(issues.some((issue) => issue.field === "products.1.unit"), true);
  });

  it("requires the India state and overseas country, and does not require a city", () => {
    const india = validateCatalogueEnquiry({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
      products: [{ name: "Cumin whole" }],
    });
    assert.equal(india.some((issue) => issue.field === "state"), true);
    assert.equal(india.some((issue) => issue.field === "city"), false);
    assert.equal(india.some((issue) => issue.field === "country"), false);

    const overseas = validateCatalogueEnquiry({
      market: ENQUIRY_MARKETS.OVERSEAS,
      kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
      products: [{ name: "Cumin whole" }],
    });
    assert.equal(overseas.some((issue) => issue.field === "country"), true);
    assert.equal(overseas.some((issue) => issue.field === "city"), false);
    assert.equal(overseas.some((issue) => issue.field === "state"), false);

    assert.equal(catalogueEnquiryIsValid(indiaCommercial({ address: undefined, city: "" })), true);
  });

  it("drops blank product rows and still requires one named product", () => {
    assert.deepEqual(normalizeEnquiryProductLines([{ name: "  " }, cumin, { name: "" }]), [
      { name: "Cumin whole", quantity: "25", unit: "kg" },
    ]);
    const issues = validateCatalogueEnquiry(
      indiaCommercial({ products: [{ name: "" }, { quantity: "10", unit: "kg" }] })
    );
    assert.equal(issues.some((issue) => issue.field === "products"), true);
  });
});

describe("productsJson", () => {
  it("round-trips valid product lines and fills legacy product/quantity", () => {
    const json = serializeEnquiryProductsJson([cumin, turmeric]);
    const parsed = parseEnquiryProductsJson(json);
    assert.equal(parsed.status, "ok");
    if (parsed.status !== "ok") return;
    assert.equal(parsed.products.length, 2);

    const prepared = prepareCatalogueEnquiryMetadata({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
      state: "Punjab",
      city: "Ferozepur",
      productsJson: json,
      company: "Spice Import Ltd",
      preferredContactChannel: "whatsapp",
    });
    assert.equal(prepared.ok, true);
    if (!prepared.ok) return;
    assert.equal(prepared.structured, true);
    assert.equal(prepared.metadata.product, "Cumin whole");
    assert.equal(prepared.metadata.quantity, "25 kg");
    assert.equal(prepared.metadata.enquiryType, "Commercial order");
    assert.equal(prepared.metadata.preferredContactChannel, "whatsapp");
    assert.equal(parseEnquiryProductsJson(prepared.metadata.productsJson).status, "ok");
  });

  it("rejects malformed JSON and non-array payloads", () => {
    assert.equal(parseEnquiryProductsJson("{not json").status, "invalid");
    assert.equal(parseEnquiryProductsJson("{\"name\":\"Cumin\"}").status, "invalid");
    const prepared = prepareCatalogueEnquiryMetadata({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
      state: "Punjab",
      city: "Ferozepur",
      productsJson: "not-json",
    });
    assert.equal(prepared.ok, false);
  });

  it("leaves legacy metadata unchanged when productsJson is absent", () => {
    const prepared = prepareCatalogueEnquiryMetadata({
      product: "Cumin whole",
      quantity: "25 kg",
      country: "GB",
      enquiryType: "Quote",
    });
    assert.equal(prepared.ok, true);
    if (!prepared.ok) return;
    assert.equal(prepared.structured, false);
    assert.equal(prepared.metadata.product, "Cumin whole");
    assert.equal(prepared.metadata.quantity, "25 kg");
    assert.equal(prepared.metadata.productsJson, undefined);
  });

  it("requires market and location when productsJson is present", () => {
    const json = serializeEnquiryProductsJson([cumin]);
    const missingMarket = prepareCatalogueEnquiryMetadata({
      kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
      productsJson: json,
    });
    assert.equal(missingMarket.ok, false);

    const india = prepareCatalogueEnquiryMetadata({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
      state: "Punjab",
      city: "Ferozepur",
      productsJson: json,
    });
    assert.equal(india.ok, true);

    const overseas = prepareCatalogueEnquiryMetadata({
      market: ENQUIRY_MARKETS.OVERSEAS,
      kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
      country: "Singapore",
      city: "Singapore",
      productsJson: serializeEnquiryProductsJson([{ name: "Black pepper" }]),
    });
    assert.equal(overseas.ok, true);
  });
});
