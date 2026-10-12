import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLeadAdminNotifyRequired,
  isLeadCaptureBodyTooLarge,
  LEAD_CAPTURE_MAX_BODY_BYTES,
  leadCaptureSchema,
  leadHasRetryableNotifyPayload,
  retryLeadEmailSchema,
} from "./lead";

const base = {
  sessionId: "sess-1",
  name: "Priya Shah",
  email: "buyer@example.com",
  phone: "+447700900123",
  page: "/enquiry",
  metadata: {
    company: "Spice Import Ltd",
    product: "Cumin whole",
    quantity: "25 kg",
    country: "GB",
    enquiryType: "Quote",
    message: "Need whole cumin for a restaurant group.",
  },
};

describe("leadCaptureSchema", () => {
  it("accepts catalogue-enquiry with product metadata", () => {
    const parsed = leadCaptureSchema.safeParse({ ...base, source: "catalogue-enquiry" });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.source, "catalogue-enquiry");
      assert.equal(parsed.data.metadata?.product, "Cumin whole");
    }
  });

  it("still accepts existing wholesale and contact sources", () => {
    assert.equal(leadCaptureSchema.safeParse({ ...base, source: "wholesale" }).success, true);
    assert.equal(leadCaptureSchema.safeParse({ ...base, source: "contact" }).success, true);
  });

  it("rejects unknown sources", () => {
    const parsed = leadCaptureSchema.safeParse({ ...base, source: "not-a-source" });
    assert.equal(parsed.success, false);
  });
});

describe("isLeadAdminNotifyRequired", () => {
  it("requires admin mail for catalogue enquiries", () => {
    assert.equal(isLeadAdminNotifyRequired("catalogue-enquiry", true), true);
    assert.equal(isLeadAdminNotifyRequired("catalogue-enquiry", false), true);
  });

  it("keeps existing contact, wholesale, review and newsletter rules", () => {
    assert.equal(isLeadAdminNotifyRequired("contact", true), true);
    assert.equal(isLeadAdminNotifyRequired("wholesale", true), true);
    assert.equal(isLeadAdminNotifyRequired("review", true), true);
    assert.equal(isLeadAdminNotifyRequired("newsletter", true), true);
    assert.equal(isLeadAdminNotifyRequired("newsletter", false), false);
    assert.equal(isLeadAdminNotifyRequired("product", true), false);
  });
});

describe("leadHasRetryableNotifyPayload", () => {
  it("allows catalogue-enquiry retries", () => {
    assert.equal(leadHasRetryableNotifyPayload({ source: "catalogue-enquiry" }), true);
  });

  it("rejects silent product captures without a message", () => {
    assert.equal(leadHasRetryableNotifyPayload({ source: "product", name: "A" }), false);
  });
});

describe("isLeadCaptureBodyTooLarge", () => {
  it("rejects bodies over 16 KiB", () => {
    assert.equal(isLeadCaptureBodyTooLarge(LEAD_CAPTURE_MAX_BODY_BYTES), false);
    assert.equal(isLeadCaptureBodyTooLarge(LEAD_CAPTURE_MAX_BODY_BYTES + 1), true);
  });
});

describe("retryLeadEmailSchema", () => {
  it("requires sessionId and createdAt", () => {
    const parsed = retryLeadEmailSchema.safeParse({
      sessionId: "sess-1",
      createdAt: "2026-10-12T08:00:00.000Z",
    });
    assert.equal(parsed.success, true);
    assert.equal(retryLeadEmailSchema.safeParse({ sessionId: "sess-1" }).success, false);
    assert.equal(retryLeadEmailSchema.safeParse({ createdAt: "2026-10-12T08:00:00.000Z" }).success, false);
  });
});
