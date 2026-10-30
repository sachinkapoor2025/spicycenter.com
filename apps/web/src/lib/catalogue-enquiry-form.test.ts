import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
  ENQUIRY_KINDS,
  ENQUIRY_MARKETS,
  catalogueEnquiryLocationFields,
  enquiryRequiresCommercialQuantity,
  shouldShowOverseasContainerDisclaimer,
  shouldShowSampleNotice,
  parseEnquiryProductsJson,
} from "@spicycorner/shared";
import { ApiError } from "./api";
import {
  OVERSEAS_COMMERCIAL_MOQ_LABEL,
  PREFERRED_CONTACT_CHANNELS,
  WHATSAPP_HANDOFF_RECORDED_MESSAGE,
  WHATSAPP_UNCERTAIN_MESSAGE,
  buildCatalogueEnquiryRequest,
  buildCatalogueEnquiryWhatsAppMessage,
  catalogueEnquiryWhatsAppHref,
  enquiryLeadWasPersisted,
  enquiryLocationFromCountryQuery,
  enquiryProductsFromQuery,
  enquirySubmitButtonLabel,
  enquiryWhatsAppButtonLabel,
  interpretCatalogueEnquiryFailure,
  interpretCatalogueEnquirySuccess,
  enquiryReferenceLabel,
  isEnquiryResubmitLocked,
  planWhatsAppEnquiryHandoff,
  splitPrefillQuantity,
  validateEnquiryForm,
} from "./catalogue-enquiry-form";

const contact = {
  firstName: "Priya",
  lastName: "Shah",
  email: "buyer@example.com",
  phone: "+447700900123",
  company: "Spice Import Ltd",
  buyerType: "Restaurant",
  message: "Need cumin.",
  website: "",
};

describe("enquiryProductsFromQuery", () => {
  it("prefills the first product line from product and quantity query params", () => {
    const rows = enquiryProductsFromQuery("Cumin whole", "25 kg");
    assert.deepEqual(rows, [{ name: "Cumin whole", quantity: "25", unit: "kg" }]);
    assert.equal(splitPrefillQuantity("1 metric ton").unit, "metric ton");
  });

  it("starts a general enquiry with an empty product row", () => {
    assert.deepEqual(enquiryProductsFromQuery("", ""), [{ name: "", quantity: "", unit: "" }]);
  });
});

describe("enquiryLocationFromCountryQuery", () => {
  it("maps an overseas country code onto the overseas market", () => {
    assert.deepEqual(enquiryLocationFromCountryQuery("GB"), {
      market: ENQUIRY_MARKETS.OVERSEAS,
      country: "United Kingdom",
    });
    assert.deepEqual(enquiryLocationFromCountryQuery("IN"), {
      market: ENQUIRY_MARKETS.INDIA,
      country: "",
    });
    assert.equal(enquiryLocationFromCountryQuery("").market, "");
  });
});

describe("validateEnquiryForm", () => {
  it("requires market, enquiry type, and contact fields", () => {
    const issues = validateEnquiryForm({
      market: "",
      kind: "",
      state: "",
      city: "",
      country: "",
      products: [{ name: "Cumin whole", quantity: "25", unit: "kg" }],
      ...contact,
      firstName: "",
    });
    assert.equal(issues.some((issue) => issue.field === "market"), true);
    assert.equal(issues.some((issue) => issue.field === "kind"), true);
    assert.equal(issues.some((issue) => issue.field === "firstName"), true);
    assert.equal(issues.some((issue) => issue.field === "buyerType"), false);
  });

  it("requires quantity and unit only on commercial product lines", () => {
    assert.equal(enquiryRequiresCommercialQuantity(ENQUIRY_KINDS.COMMERCIAL_ORDER), true);
    const commercial = validateEnquiryForm({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
      state: "Punjab",
      city: "Ferozepur",
      country: "",
      products: [
        { name: "Cumin whole", quantity: "25", unit: "kg" },
        { name: "Turmeric powder", quantity: "", unit: "" },
      ],
      ...contact,
    });
    assert.equal(commercial.some((issue) => issue.field === "products.1.quantity"), true);

    const simple = validateEnquiryForm({
      market: ENQUIRY_MARKETS.OVERSEAS,
      kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
      state: "",
      city: "Singapore",
      country: "Singapore",
      products: [{ name: "Black pepper", quantity: "", unit: "" }],
      ...contact,
    });
    assert.equal(simple.length, 0);

    const indiaCommercial = validateEnquiryForm({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
      state: "Kerala",
      city: "Kochi",
      country: "",
      products: [{ name: "Black pepper", quantity: "1", unit: "kg" }],
      ...contact,
    });
    assert.equal(indiaCommercial.length, 0);
  });

  it("does not require a buyer type on the compact enquiry", () => {
    const issues = validateEnquiryForm({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
      state: "Kerala",
      city: "Kochi",
      country: "",
      products: [{ name: "Cumin whole", quantity: "", unit: "" }],
      ...contact,
      buyerType: "",
    });
    assert.equal(issues.length, 0);
  });

  it("shows market-specific location fields and disclaimers", () => {
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
    const indiaMissingState = validateEnquiryForm({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
      state: "",
      city: "Amritsar",
      country: "",
      products: [{ name: "Cumin whole", quantity: "", unit: "" }],
      ...contact,
    });
    assert.equal(indiaMissingState.some((issue) => issue.field === "state"), true);
    assert.equal(
      shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.OVERSEAS, ENQUIRY_KINDS.COMMERCIAL_ORDER),
      true
    );
    assert.equal(shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.INDIA, ENQUIRY_KINDS.COMMERCIAL_ORDER), false);
    assert.equal(shouldShowOverseasContainerDisclaimer(ENQUIRY_MARKETS.OVERSEAS, ENQUIRY_KINDS.SAMPLE_REQUEST), false);
    assert.equal(shouldShowSampleNotice(ENQUIRY_KINDS.SAMPLE_REQUEST), true);
    assert.equal(shouldShowSampleNotice(ENQUIRY_KINDS.COMMERCIAL_ORDER), false);
    assert.equal(
      OVERSEAS_COMMERCIAL_MOQ_LABEL,
      "Minimum order quantity: 1 × 20-foot Full Container Load (FCL)."
    );
    assert.equal(
      CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
      "Sample requests are considered based on your enquiry. The buyer is responsible for the sample cost and shipping charges. Our team will confirm the applicable costs before proceeding."
    );
  });
});

describe("buildCatalogueEnquiryRequest", () => {
  it("sends catalogue-enquiry with productsJson, market, kind and location", () => {
    const built = buildCatalogueEnquiryRequest(
      {
        market: ENQUIRY_MARKETS.OVERSEAS,
        kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
        state: "",
        city: "Dubai",
        country: "United Arab Emirates",
        products: [
          { name: "Cumin whole", quantity: "1", unit: "container" },
          { name: "Turmeric powder", quantity: "10", unit: "kg" },
        ],
        ...contact,
      },
      "sess-1",
      "/enquiry"
    );
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const body = built.body as {
      source: string;
      metadata: Record<string, string>;
    };
    assert.equal(body.source, "catalogue-enquiry");
    assert.equal(body.metadata.market, "overseas");
    assert.equal(body.metadata.kind, "commercial-order");
    assert.equal(body.metadata.country, "United Arab Emirates");
    assert.equal(body.metadata.city, "Dubai");
    const parsed = parseEnquiryProductsJson(body.metadata.productsJson);
    assert.equal(parsed.status, "ok");
    if (parsed.status !== "ok") return;
    assert.equal(parsed.products.length, 2);
    assert.equal(parsed.products[1]?.name, "Turmeric powder");
    assert.equal(body.metadata.product, "Cumin whole");
  });

  it("sends Indian state and city without a destination country", () => {
    const built = buildCatalogueEnquiryRequest(
      {
        market: ENQUIRY_MARKETS.INDIA,
        kind: ENQUIRY_KINDS.SAMPLE_REQUEST,
        state: "Gujarat",
        city: "Rajkot",
        country: "should-not-send",
        products: [{ name: "Coriander whole", quantity: "", unit: "" }],
        ...contact,
      },
      "sess-2",
      "/enquiry?product=Coriander%20whole"
    );
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const metadata = (built.body as { metadata: Record<string, string> }).metadata;
    assert.equal(metadata.state, "Gujarat");
    assert.equal(metadata.city, "Rajkot");
    assert.equal(metadata.country, undefined);
    assert.equal(metadata.kind, "sample-request");
    assert.equal(metadata.preferredContactChannel, undefined);
  });

  it("records WhatsApp as the preferred contact channel without changing source", () => {
    const built = buildCatalogueEnquiryRequest(
      {
        market: ENQUIRY_MARKETS.OVERSEAS,
        kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
        state: "",
        city: "Singapore",
        country: "Singapore",
        products: [{ name: "Black pepper", quantity: "", unit: "" }],
        ...contact,
      },
      "sess-wa",
      "/enquiry",
      { preferredContactChannel: PREFERRED_CONTACT_CHANNELS.WHATSAPP }
    );
    assert.equal(built.ok, true);
    if (!built.ok) return;
    const body = built.body as { source: string; metadata: Record<string, string> };
    assert.equal(body.source, "catalogue-enquiry");
    assert.equal(body.metadata.preferredContactChannel, "whatsapp");
  });
});

describe("enquiry submit outcomes", () => {
  it("treats 201 with emailSent as success", () => {
    const outcome = interpretCatalogueEnquirySuccess({
      ok: true,
      emailSent: true,
      leadId: "lead-1",
      sessionId: "sess-1",
      createdAt: "2026-10-12T08:00:00.000Z",
    });
    assert.equal(outcome.status, "sent");
    if (outcome.status === "sent") assert.equal(outcome.leadId, "lead-1");
  });

  it("keeps the lead reference when notify failed and blocks treating it as validation", () => {
    const outcome = interpretCatalogueEnquiryFailure(
      new ApiError("Your enquiry was saved but email could not be sent. Please WhatsApp us or email enquiry@spicycenter.com.", 400, {
        ok: false,
        emailSent: false,
        error: "Your enquiry was saved but email could not be sent. Please WhatsApp us or email enquiry@spicycenter.com.",
        leadId: "lead-9",
        sessionId: "sess-9",
        createdAt: "2026-10-12T08:00:00.000Z",
      })
    );
    assert.equal(outcome.status, "saved_unnotified");
    if (outcome.status !== "saved_unnotified") return;
    assert.equal(outcome.leadId, "lead-9");
    assert.equal(outcome.sessionId, "sess-9");
    assert.equal(outcome.createdAt, "2026-10-12T08:00:00.000Z");
    assert.match(outcome.message, /saved/);
    assert.equal(enquiryReferenceLabel(outcome), "lead-9");
    assert.equal(isEnquiryResubmitLocked(outcome), true);
  });

  it("maps ordinary validation errors without a lead reference", () => {
    const outcome = interpretCatalogueEnquiryFailure(new ApiError("Choose Within India or Overseas & Abroad.", 400, { error: "Choose Within India or Overseas & Abroad." }));
    assert.equal(outcome.status, "error");
    if (outcome.status === "error") {
      assert.match(outcome.message, /Within India/);
    }
    assert.equal(isEnquiryResubmitLocked(outcome), false);
    assert.equal(enquiryReferenceLabel(outcome), "");
  });

  it("hides internal server errors and does not treat them as success", () => {
    const outcome = interpretCatalogueEnquiryFailure(
      new ApiError("SMTP_PASS leaked", 500, { error: "SMTP_PASS leaked" })
    );
    assert.equal(outcome.status, "error");
    if (outcome.status === "error") {
      assert.equal(outcome.message, "Could not send your enquiry.");
    }
    assert.equal(interpretCatalogueEnquirySuccess({ ok: false }).status, "error");
  });

  it("uses Submit Enquiry as the idle submit label", () => {
    assert.equal(enquirySubmitButtonLabel(false), "Submit Enquiry");
    assert.equal(enquirySubmitButtonLabel(true), "Submitting...");
    assert.equal(enquiryWhatsAppButtonLabel(false), "WhatsApp this enquiry");
    assert.equal(enquiryWhatsAppButtonLabel(true), "Saving...");
  });
});

const overseasCommercialForm = {
  market: ENQUIRY_MARKETS.OVERSEAS,
  kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
  state: "",
  city: "Dubai",
  country: "United Arab Emirates",
  products: [
    { name: "Cumin whole", quantity: "1", unit: "container" },
    { name: "Turmeric powder", quantity: "10", unit: "kg" },
  ],
  ...contact,
};

describe("WhatsApp enquiry message", () => {
  it("includes every product line, market, enquiry type, destination, buyer details and the FCL notice", () => {
    const message = buildCatalogueEnquiryWhatsAppMessage(overseasCommercialForm);
    assert.match(message, /Market: Overseas & Abroad/);
    assert.match(message, /Enquiry type: Commercial order/);
    assert.match(message, /Cumin whole — 1 container/);
    assert.match(message, /Turmeric powder — 10 kg/);
    assert.match(message, /Country: United Arab Emirates/);
    assert.match(message, /City: Dubai/);
    assert.match(message, /Name: Priya Shah/);
    assert.match(message, /Email: buyer@example.com/);
    assert.match(message, /Phone: \+447700900123/);
    assert.match(message, /Company: Spice Import Ltd/);
    assert.match(message, /Buyer type: Restaurant/);
    assert.match(message, /Need cumin/);
    assert.ok(message.includes(OVERSEAS_COMMERCIAL_MOQ_LABEL));
    assert.doesNotMatch(message, /sessionId|leadId|SMTP|website/i);
    const href = catalogueEnquiryWhatsAppHref(overseasCommercialForm);
    assert.match(href, /^https:\/\/wa\.me\/919266467887\?text=/);
    assert.ok(href.includes(encodeURIComponent("Turmeric powder — 10 kg")));
  });

  it("omits empty optional fields and unused notices", () => {
    const message = buildCatalogueEnquiryWhatsAppMessage({
      market: ENQUIRY_MARKETS.INDIA,
      kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
      state: "Kerala",
      city: "Kochi",
      country: "",
      firstName: "Priya",
      lastName: "",
      email: "buyer@example.com",
      phone: "+919800000000",
      company: "Spice Import Ltd",
      buyerType: "Retailer",
      message: "   ",
      website: "",
      products: [{ name: "Black pepper", quantity: "", unit: "" }],
    });
    assert.match(message, /Market: Within India/);
    assert.match(message, /Enquiry type: Simple product enquiry/);
    assert.match(message, /State: Kerala/);
    assert.match(message, /City: Kochi/);
    assert.match(message, /Name: Priya/);
    assert.match(message, /Black pepper/);
    assert.doesNotMatch(message, /Country:/);
    assert.doesNotMatch(message, /Message:/);
    assert.doesNotMatch(message, /Last name/);
    assert.doesNotMatch(message, /FCL|Sample requests are considered/);
    assert.ok(message.includes(CATALOGUE_ENQUIRY_SAMPLE_NOTICE) === false);
  });

  it("includes the sample-request notice when that enquiry type is selected", () => {
    const message = buildCatalogueEnquiryWhatsAppMessage({
      ...overseasCommercialForm,
      kind: ENQUIRY_KINDS.SAMPLE_REQUEST,
      products: [{ name: "Cumin whole", quantity: "", unit: "" }],
    });
    assert.ok(message.includes(CATALOGUE_ENQUIRY_SAMPLE_NOTICE));
    assert.equal(message.includes(OVERSEAS_COMMERCIAL_MOQ_LABEL), false);
  });
});

describe("WhatsApp enquiry handoff", () => {
  it("opens WhatsApp only after the lead is confirmed saved", () => {
    const plan = planWhatsAppEnquiryHandoff(
      interpretCatalogueEnquirySuccess({
        ok: true,
        emailSent: true,
        leadId: "lead-wa-1",
        sessionId: "sess-wa-1",
        createdAt: "2026-10-12T08:00:00.000Z",
      })
    );
    assert.equal(enquiryLeadWasPersisted({ status: "sent", leadId: "lead-wa-1" }), true);
    assert.equal(plan.persistConfirmed, true);
    assert.equal(plan.openWhatsApp, true);
    assert.equal(plan.lockResubmit, true);
    assert.equal(plan.buyerMessage, WHATSAPP_HANDOFF_RECORDED_MESSAGE);
    assert.doesNotMatch(plan.buyerMessage, /email could not be sent/i);
    assert.doesNotMatch(plan.buyerMessage, /WhatsApp (was )?sent/i);
  });

  it("still allows the WhatsApp handoff when the lead is saved but email failed or was skipped", () => {
    const plan = planWhatsAppEnquiryHandoff(
      interpretCatalogueEnquiryFailure(
        new ApiError("Your enquiry was saved but email could not be sent. Please WhatsApp us or email enquiry@spicycenter.com.", 400, {
          ok: false,
          emailSent: false,
          error: "Your enquiry was saved but email could not be sent. Please WhatsApp us or email enquiry@spicycenter.com.",
          leadId: "lead-wa-2",
          sessionId: "sess-wa-2",
          createdAt: "2026-10-12T08:00:00.000Z",
        })
      )
    );
    assert.equal(plan.persistConfirmed, true);
    assert.equal(plan.openWhatsApp, true);
    assert.equal(plan.lockResubmit, true);
    assert.equal(plan.buyerMessage, WHATSAPP_HANDOFF_RECORDED_MESSAGE);
    assert.doesNotMatch(plan.buyerMessage, /email could not be sent/i);
  });

  it("does not open WhatsApp when the lead was not saved", () => {
    const plan = planWhatsAppEnquiryHandoff(
      interpretCatalogueEnquiryFailure(new ApiError("Choose Within India or Overseas & Abroad.", 400, {
        error: "Choose Within India or Overseas & Abroad.",
      }))
    );
    assert.equal(enquiryLeadWasPersisted({ status: "error", message: "Choose Within India or Overseas & Abroad." }), false);
    assert.equal(plan.persistConfirmed, false);
    assert.equal(plan.openWhatsApp, false);
    assert.equal(plan.lockResubmit, false);
    assert.match(plan.buyerMessage, /Within India/);
  });

  it("does not open WhatsApp or auto-retry when the API result is uncertain", () => {
    const plan = planWhatsAppEnquiryHandoff(
      interpretCatalogueEnquiryFailure(new ApiError("network down", 502, { error: "network down" }))
    );
    assert.equal(plan.persistConfirmed, false);
    assert.equal(plan.openWhatsApp, false);
    assert.equal(plan.lockResubmit, true);
    assert.equal(plan.buyerMessage, WHATSAPP_UNCERTAIN_MESSAGE);
    assert.equal(enquiryLeadWasPersisted({ status: "sent" }), false);
    assert.equal(enquiryLeadWasPersisted(interpretCatalogueEnquirySuccess({ ok: true, ignored: true, emailSent: true })), false);
  });

  it("keeps the normal form-submit email-failure copy for Send Enquiry", () => {
    const outcome = interpretCatalogueEnquiryFailure(
      new ApiError("Your enquiry was saved but email could not be sent. Please WhatsApp us or email enquiry@spicycenter.com.", 400, {
        ok: false,
        emailSent: false,
        leadId: "lead-form-9",
        sessionId: "sess-form-9",
      })
    );
    assert.equal(outcome.status, "saved_unnotified");
    if (outcome.status !== "saved_unnotified") return;
    assert.match(outcome.message, /email could not be sent/);
    assert.equal(isEnquiryResubmitLocked(outcome), true);
  });
});
