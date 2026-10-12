import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCatalogueEnquiryAdminEmail } from "./catalogue-enquiry-email";
import {
  CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
  ENQUIRY_KINDS,
  ENQUIRY_MARKETS,
  OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER,
  serializeEnquiryProductsJson,
} from "./catalogue-enquiry-model";

describe("buildCatalogueEnquiryAdminEmail", () => {
  it("includes product, quantity, company, contact, destination, enquiry type and message", () => {
    const mail = buildCatalogueEnquiryAdminEmail({
      name: "Priya Shah",
      email: "buyer@example.com",
      phone: "+447700900123",
      page: "/enquiry",
      leadId: "lead-1",
      createdAt: "2026-10-12T08:00:00.000Z",
      metadata: {
        product: "Cumin whole",
        quantity: "25 kg",
        company: "Spice Import Ltd",
        contactName: "Priya Shah",
        firstName: "Priya",
        lastName: "Shah",
        address: "1 Spice Lane",
        buyerType: "Restaurant",
        country: "GB",
        enquiryType: "Quote",
        message: "Need whole cumin for a restaurant group.",
        website: "http://spam.example",
      },
    });

    assert.equal(mail.subject, "[SpicyCenter] Catalogue enquiry — Cumin whole");
    assert.match(mail.text, /Source: Catalogue enquiry/);
    assert.match(mail.text, /Product: Cumin whole/);
    assert.match(mail.text, /Quantity: 25 kg/);
    assert.match(mail.text, /Company: Spice Import Ltd/);
    assert.match(mail.text, /Name: Priya Shah/);
    assert.match(mail.text, /Email: buyer@example.com/);
    assert.match(mail.text, /Phone: \+447700900123/);
    assert.match(mail.text, /Destination: GB/);
    assert.match(mail.text, /Enquiry type: Quote/);
    assert.doesNotMatch(mail.text, /Preferred contact:/);
    assert.match(mail.text, /Need whole cumin for a restaurant group/);
    assert.match(mail.text, /Lead ID: lead-1/);
    assert.doesNotMatch(mail.text, /website/i);
  });

  it("keeps buyer HTML as literal characters in the plain-text body", () => {
    const mail = buildCatalogueEnquiryAdminEmail({
      name: "Priya <script>",
      metadata: {
        message: `Need <img onerror="alert(1)"> & "quotes"`,
        product: "Cumin <whole>",
      },
    });
    assert.match(mail.text, /Priya <script>/);
    assert.match(mail.text, /Need <img onerror="alert\(1\)"> & "quotes"/);
    assert.match(mail.text, /Cumin <whole>/);
    assert.doesNotMatch(mail.text, /&lt;script&gt;/);
  });

  it("prefers destination over country and omits empty fields", () => {
    const mail = buildCatalogueEnquiryAdminEmail({
      metadata: {
        product: "Turmeric whole",
        destination: "AE",
        country: "GB",
        company: "   ",
      },
    });
    assert.match(mail.subject, /Turmeric whole/);
    assert.match(mail.text, /Destination: AE/);
    assert.doesNotMatch(mail.text, /Company:/);
  });

  it("uses Commercial Order subject and lists every product line", () => {
    const mail = buildCatalogueEnquiryAdminEmail({
      name: "Priya Shah",
      email: "buyer@example.com",
      phone: "+447700900123",
      leadId: "lead-2",
      metadata: {
        market: ENQUIRY_MARKETS.OVERSEAS,
        kind: ENQUIRY_KINDS.COMMERCIAL_ORDER,
        country: "United Arab Emirates",
        city: "Dubai",
        productsJson: serializeEnquiryProductsJson([
          { name: "Cumin whole", quantity: "1", unit: "container" },
          { name: "Turmeric powder", quantity: "10", unit: "kg" },
        ]),
        message: "Need both spices.",
      },
    });
    assert.equal(mail.subject, "[SpicyCenter] Commercial Order — Cumin whole + 1 more");
    assert.match(mail.text, /Market: Overseas & Abroad/);
    assert.match(mail.text, /Enquiry type: Commercial order/);
    assert.match(mail.text, /Country: United Arab Emirates/);
    assert.match(mail.text, /City: Dubai/);
    assert.match(mail.text, /1\. Cumin whole — 1 container/);
    assert.match(mail.text, /2\. Turmeric powder — 10 kg/);
    assert.match(mail.text, /Need both spices/);
    assert.ok(mail.text.includes(OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER));
    assert.equal(mail.text.includes(CATALOGUE_ENQUIRY_SAMPLE_NOTICE), false);
  });

  it("uses Sample Request subject and sample notice without the container disclaimer", () => {
    const mail = buildCatalogueEnquiryAdminEmail({
      metadata: {
        market: ENQUIRY_MARKETS.INDIA,
        kind: ENQUIRY_KINDS.SAMPLE_REQUEST,
        state: "Gujarat",
        city: "Unjha",
        productsJson: serializeEnquiryProductsJson([{ name: "Cumin whole" }]),
      },
    });
    assert.equal(mail.subject, "[SpicyCenter] Sample Request — Cumin whole");
    assert.match(mail.text, /Market: Within India/);
    assert.match(mail.text, /State: Gujarat/);
    assert.ok(mail.text.includes(CATALOGUE_ENQUIRY_SAMPLE_NOTICE));
    assert.doesNotMatch(mail.text, /one container|FCL|20-foot/i);
  });

  it("uses Simple Product Enquiry subject without commercial quantity or disclaimers", () => {
    const mail = buildCatalogueEnquiryAdminEmail({
      metadata: {
        market: ENQUIRY_MARKETS.OVERSEAS,
        kind: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY,
        country: "Singapore",
        city: "Singapore",
        productsJson: serializeEnquiryProductsJson([{ name: "Black pepper" }, { name: "Cardamom" }]),
      },
    });
    assert.equal(mail.subject, "[SpicyCenter] Simple Product Enquiry — Black pepper + 1 more");
    assert.equal(mail.text.includes(OVERSEAS_COMMERCIAL_CONTAINER_DISCLAIMER), false);
    assert.equal(mail.text.includes(CATALOGUE_ENQUIRY_SAMPLE_NOTICE), false);
  });

  it("includes WhatsApp preferred contact when present and does not claim the message was sent", () => {
    const mail = buildCatalogueEnquiryAdminEmail({
      metadata: {
        product: "Cumin whole",
        preferredContactChannel: "whatsapp",
      },
    });
    assert.match(mail.text, /Preferred contact: WhatsApp preferred/);
    assert.doesNotMatch(mail.text, /WhatsApp sent/);
  });
});
