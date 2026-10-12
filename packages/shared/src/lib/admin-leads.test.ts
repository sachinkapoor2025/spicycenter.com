import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_LEAD_SOURCE_OPTIONS,
  formatLeadNotifyStatus,
  leadCanRetryNotifyEmail,
  leadCsvRow,
  leadEnquiryFields,
  leadMatchesFilters,
  LEAD_CSV_HEADERS,
  leadsCountCaption,
  type AdminLeadRecord,
} from "./admin-leads";

const catalogueLead: AdminLeadRecord = {
  leadId: "lead-1",
  sessionId: "sess-1",
  name: "Priya Shah",
  email: "buyer@example.com",
  phone: "+447700900123",
  page: "/enquiry",
  source: "catalogue-enquiry",
  createdAt: "2026-10-12T08:00:00.000Z",
  leadStatus: "new",
  assignedTo: "Naman",
  adminNotes: "Call back",
  notifyEmailStatus: "sent",
  notifyEmailAt: "2026-10-12T08:00:01.000Z",
  metadata: {
    company: "Spice Import Ltd",
    contactName: "Priya Shah",
    product: "Cumin whole",
    quantity: "25 kg",
    enquiryType: "Quote",
    country: "GB",
    address: "1 Spice Lane",
    buyerType: "Restaurant",
    message: "Need whole cumin.",
  },
};

const legacyLead: AdminLeadRecord = {
  leadId: "lead-old",
  sessionId: "sess-old",
  name: "Legacy Buyer",
  email: "old@example.com",
  source: "contact",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("admin lead details", () => {
  it("renders catalogue enquiry metadata and notify status", () => {
    const fields = Object.fromEntries(leadEnquiryFields(catalogueLead).map((row) => [row.label, row.value]));
    assert.equal(fields["Buyer name"], "Priya Shah");
    assert.equal(fields.Email, "buyer@example.com");
    assert.equal(fields.Phone, "+447700900123");
    assert.equal(fields.Company, "Spice Import Ltd");
    assert.equal(fields["Contact name"], "Priya Shah");
    assert.equal(fields.Product, "Cumin whole");
    assert.equal(fields.Quantity, "25 kg");
    assert.equal(fields["Enquiry type"], "Quote");
    assert.equal(fields.Destination, "GB");
    assert.equal(fields.Address, "1 Spice Lane");
    assert.equal(fields["Buyer type"], "Restaurant");
    assert.equal(fields.Message, "Need whole cumin.");
    assert.equal(fields.Source, "catalogue-enquiry");
    assert.equal(fields["Preferred contact"], "—");
    assert.equal(fields["Notify email"], "Sent");
    assert.equal(fields["Notify time"], "2026-10-12T08:00:01.000Z");
  });

  it("treats older leads without notify fields as not recorded", () => {
    const fields = Object.fromEntries(leadEnquiryFields(legacyLead).map((row) => [row.label, row.value]));
    assert.equal(formatLeadNotifyStatus(legacyLead.notifyEmailStatus), "Not recorded");
    assert.equal(fields["Notify email"], "Not recorded");
    assert.equal(fields["Notify time"], "—");
    assert.equal(fields["Notify error"], "—");
    assert.equal(fields.Product, "—");
    assert.equal(fields.Company, "—");
    assert.equal(fields["Preferred contact"], "—");
  });

  it("labels WhatsApp-preferred enquiries without claiming the message was sent", () => {
    const fields = Object.fromEntries(
      leadEnquiryFields({
        ...catalogueLead,
        metadata: { ...catalogueLead.metadata, preferredContactChannel: "whatsapp" },
        notifyEmailStatus: "failed",
      }).map((row) => [row.label, row.value])
    );
    assert.equal(fields["Preferred contact"], "WhatsApp preferred");
    assert.equal(fields["Notify email"], "Failed");
    assert.doesNotMatch(fields["Preferred contact"], /sent/i);
    assert.equal(leadCanRetryNotifyEmail({
      ...catalogueLead,
      metadata: { ...catalogueLead.metadata, preferredContactChannel: "whatsapp" },
      notifyEmailStatus: "failed",
    }), true);
  });

  it("includes catalogue-enquiry in the source filter", () => {
    assert.ok(ADMIN_LEAD_SOURCE_OPTIONS.includes("catalogue-enquiry"));
  });

  it("renders structured product lines, market and location", () => {
    const fields = Object.fromEntries(
      leadEnquiryFields({
        ...catalogueLead,
        metadata: {
          ...catalogueLead.metadata,
          market: "india",
          kind: "commercial-order",
          state: "Punjab",
          city: "Ferozepur",
          productsJson: JSON.stringify([
            { name: "Cumin whole", quantity: "25", unit: "kg" },
            { name: "Turmeric powder", quantity: "10", unit: "kg" },
          ]),
        },
      }).map((row) => [row.label, row.value])
    );
    assert.equal(fields.Market, "Within India");
    assert.equal(fields["Enquiry type"], "Commercial order");
    assert.equal(fields.State, "Punjab");
    assert.equal(fields.City, "Ferozepur");
    assert.match(fields.Products, /Cumin whole — 25 kg/);
    assert.match(fields.Products, /Turmeric powder — 10 kg/);
    assert.equal(fields.Product, "Cumin whole");
  });

  it("keeps legacy leads without productsJson readable", () => {
    const fields = Object.fromEntries(leadEnquiryFields(catalogueLead).map((row) => [row.label, row.value]));
    assert.equal(fields.Products, "—");
    assert.equal(fields.Market, "—");
    assert.equal(fields.Product, "Cumin whole");
    assert.equal(fields.Quantity, "25 kg");
  });
});

describe("lead CSV and counts", () => {
  it("exports enquiry metadata and notify status", () => {
    const row = leadCsvRow(catalogueLead);
    assert.equal(LEAD_CSV_HEADERS.length, row.length);
    assert.ok(row.includes("Cumin whole"));
    assert.ok(row.includes("25 kg"));
    assert.ok(row.includes("Spice Import Ltd"));
    assert.ok(row.includes("Sent"));
    assert.ok(row.includes("catalogue-enquiry"));
    assert.equal(row[LEAD_CSV_HEADERS.indexOf("Preferred contact")], "—");
    assert.equal(row[LEAD_CSV_HEADERS.indexOf("Products")], "—");
  });

  it("exports WhatsApp preferred contact in CSV", () => {
    const row = leadCsvRow({
      ...catalogueLead,
      metadata: { ...catalogueLead.metadata, preferredContactChannel: "whatsapp" },
    });
    assert.equal(row[LEAD_CSV_HEADERS.indexOf("Preferred contact")], "WhatsApp preferred");
    assert.ok(LEAD_CSV_HEADERS.includes("Preferred contact"));
  });

  it("exports structured product lines in CSV", () => {
    const row = leadCsvRow({
      ...catalogueLead,
      metadata: {
        ...catalogueLead.metadata,
        market: "india",
        kind: "sample-request",
        state: "Gujarat",
        city: "Unjha",
        productsJson: JSON.stringify([{ name: "Cumin whole" }, { name: "Chilli powder" }]),
      },
    });
    assert.match(row[LEAD_CSV_HEADERS.indexOf("Products")] ?? "", /Cumin whole/);
    assert.match(row[LEAD_CSV_HEADERS.indexOf("Products")] ?? "", /Chilli powder/);
    assert.equal(row[LEAD_CSV_HEADERS.indexOf("Market")], "Within India");
  });

  it("does not treat a page length as the stored total", () => {
    const caption = leadsCountCaption({
      total: 412,
      loaded: 25,
      filterApplied: false,
    });
    assert.match(caption, /412 stored leads/);
    assert.match(caption, /Showing 25 on this page/);
    assert.doesNotMatch(caption, /412 stored leads\. Showing 412 on this page/);
  });

  it("says filtered counts may be incomplete when the scan is not exact", () => {
    const caption = leadsCountCaption({
      total: 412,
      loaded: 25,
      filterApplied: true,
      filteredTotalExact: false,
    });
    assert.match(caption, /More matches may exist/);
  });
});

describe("leadCanRetryNotifyEmail", () => {
  it("shows retry for failed or skipped catalogue enquiries with key fields", () => {
    assert.equal(leadCanRetryNotifyEmail({ ...catalogueLead, notifyEmailStatus: "failed" }), true);
    assert.equal(leadCanRetryNotifyEmail({ ...catalogueLead, notifyEmailStatus: "skipped" }), true);
  });

  it("shows retry when notification status is missing if keys and payload are present", () => {
    const { notifyEmailStatus: _omit, ...unstamped } = catalogueLead;
    assert.equal(leadCanRetryNotifyEmail(unstamped), true);
    assert.equal(leadCanRetryNotifyEmail({ ...catalogueLead, notifyEmailStatus: undefined }), true);
    assert.equal(leadCanRetryNotifyEmail({ ...catalogueLead, notifyEmailStatus: "" }), true);
    assert.equal(formatLeadNotifyStatus(unstamped.notifyEmailStatus), "Not recorded");
  });

  it("hides retry when already sent, missing keys, or no payload", () => {
    assert.equal(leadCanRetryNotifyEmail(catalogueLead), false);
    assert.equal(leadCanRetryNotifyEmail({ ...catalogueLead, notifyEmailStatus: "failed", sessionId: "" }), false);
    assert.equal(leadCanRetryNotifyEmail({ ...catalogueLead, notifyEmailStatus: "failed", createdAt: "" }), false);
    assert.equal(
      leadCanRetryNotifyEmail({
        ...catalogueLead,
        notifyEmailStatus: undefined,
        sessionId: "",
      }),
      false
    );
    assert.equal(
      leadCanRetryNotifyEmail({
        ...catalogueLead,
        notifyEmailStatus: undefined,
        createdAt: "  ",
      }),
      false
    );
    assert.equal(
      leadCanRetryNotifyEmail({
        leadId: "silent",
        sessionId: "sess-2",
        createdAt: "2026-10-12T08:00:00.000Z",
        source: "product",
        notifyEmailStatus: "failed",
      }),
      false
    );
    assert.equal(
      leadCanRetryNotifyEmail({
        leadId: "silent-unstamped",
        sessionId: "sess-3",
        createdAt: "2026-10-12T08:00:00.000Z",
        source: "product",
      }),
      false
    );
  });
});

describe("leadMatchesFilters", () => {
  it("filters catalogue-enquiry independently of other sources", () => {
    assert.equal(leadMatchesFilters(catalogueLead, { source: "catalogue-enquiry" }), true);
    assert.equal(leadMatchesFilters(catalogueLead, { source: "contact" }), false);
    assert.equal(leadMatchesFilters(legacyLead, { source: "catalogue-enquiry" }), false);
  });

  it("matches secondary product names from productsJson", () => {
    const lead = {
      ...catalogueLead,
      metadata: {
        ...catalogueLead.metadata,
        productsJson: JSON.stringify([{ name: "Cumin whole" }, { name: "Fenugreek" }]),
      },
    };
    assert.equal(leadMatchesFilters(lead, { q: "fenugreek" }), true);
    assert.equal(leadMatchesFilters(catalogueLead, { q: "fenugreek" }), false);
  });
});
