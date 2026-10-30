process.env.USE_MEMORY_DB = "true";
process.env.LOAD_TEST_MODE = "false";
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "enquiry@spicycenter.com";
process.env.SMTP_FROM = "enquiry@spicycenter.com";
process.env.SMTP_PASS = "test-mailbox-password";
process.env.NOTIFY_EMAIL = "enquiry@spicycenter.com";
delete process.env.SMTP_HOSTS;
delete process.env.ENQUIRY_CC_EMAILS;
delete process.env.WHATSAPP_TOKEN;
delete process.env.META_WHATSAPP_TOKEN;
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.TWILIO_AUTH_TOKEN;
delete process.env.TWILIO_WHATSAPP_FROM;

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { APIGatewayProxyResultV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { LeadCaptureInput, Order } from "@spicycorner/shared";
import { setOutboundTransportForTests } from "./email";

const CONFIGURED_CC = [
  "dgv@mydgv.com",
  "meenu.talwar@mydgv.com",
  "priya.yadav@mydgv.com",
  "naman.talwar@spicycenter.com",
] as const;

const sent: Array<Record<string, unknown>> = [];

const catalogueLead: LeadCaptureInput = {
  sessionId: "sess-cc",
  source: "catalogue-enquiry",
  name: "A Buyer",
  email: "buyer@example.com",
  phone: "+919876543210",
  page: "/enquiry",
  metadata: {
    market: "india",
    kind: "commercial-order",
    state: "Punjab",
    city: "Ferozepur",
    productsJson: JSON.stringify([{ name: "Cumin", quantity: "25", unit: "kg" }]),
    message: "Need cumin for a shop.",
  },
};

const order = {
  orderId: "ord-12345678",
  currency: "USD",
  total: 12.5,
  createdAt: "2026-10-26T00:00:00.000Z",
  items: [],
  shippingAddress: {
    name: "Buyer",
    line1: "1 Road",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    country: "US",
    email: "buyer@example.com",
  },
} as unknown as Order;

function httpResult(res: APIGatewayProxyResultV2): APIGatewayProxyStructuredResultV2 {
  if (!res || typeof res === "string" || !("statusCode" in res)) {
    throw new Error("expected structured API Gateway result");
  }
  return res;
}

function assertNoCc(mail: Record<string, unknown>) {
  assert.equal(Object.prototype.hasOwnProperty.call(mail, "cc"), false);
}

function assertDoesNotMentionCc(value: unknown) {
  const blob = JSON.stringify(value);
  for (const address of CONFIGURED_CC) {
    assert.equal(blob.includes(address), false);
  }
}

describe("catalogue enquiry CC routing", () => {
  let email: typeof import("./email");

  before(async () => {
    setOutboundTransportForTests(() => ({
      sendMail: async (mail: unknown) => {
        sent.push(mail as Record<string, unknown>);
        return { messageId: "mocked" };
      },
    }));
    email = await import("./email");
  });

  after(() => {
    setOutboundTransportForTests(undefined);
  });

  it("includes CC on catalogue enquiry mail and keeps To, reply-to, and body unchanged", async () => {
    process.env.ENQUIRY_CC_EMAILS = CONFIGURED_CC.join(",");
    sent.length = 0;
    const logs: unknown[][] = [];
    const originalInfo = console.info;
    console.info = (...args: unknown[]) => {
      logs.push(args);
    };
    try {
      const result = await email.sendCatalogueEnquiryEmails(catalogueLead, {
        leadId: "lead-1",
        createdAt: "2026-10-26T00:00:00.000Z",
      });
      assert.deepEqual(result, { ok: true });
    } finally {
      console.info = originalInfo;
    }

    assert.equal(sent.length, 1);
    const mail = sent[0]!;
    assert.equal(mail.to, "enquiry@spicycenter.com");
    assert.deepEqual(mail.cc, [...CONFIGURED_CC]);
    assert.equal(mail.replyTo, "buyer@example.com");
    assert.match(String(mail.from), /enquiry@spicycenter.com/);
    assert.match(String(mail.subject), /SpicyCenter/);
    assert.match(String(mail.text), /Need cumin for a shop/);
    assertDoesNotMentionCc(mail.text);
    assertDoesNotMentionCc(mail.html);
    assertDoesNotMentionCc(mail.subject);
    assertDoesNotMentionCc(logs);
  });

  it("uses the same CC list when the catalogue retry path sends the lead", async () => {
    process.env.ENQUIRY_CC_EMAILS = CONFIGURED_CC.join(";");
    sent.length = 0;
    const result = await email.notifyAdminLead(catalogueLead, {
      leadId: "lead-retry",
      createdAt: "2026-10-26T00:00:00.000Z",
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0]?.cc, [...CONFIGURED_CC]);
    assert.equal(sent[0]?.to, "enquiry@spicycenter.com");
  });

  it("omits the CC header when the variable is unset, empty, or invalid", async () => {
    for (const value of [undefined, "", "   ", "not-an-email, @@"]) {
      if (value === undefined) delete process.env.ENQUIRY_CC_EMAILS;
      else process.env.ENQUIRY_CC_EMAILS = value;
      sent.length = 0;
      const result = await email.sendCatalogueEnquiryEmails(catalogueLead);
      assert.equal(result.ok, true);
      assert.equal(sent.length, 1);
      assertNoCc(sent[0]!);
    }
  });

  it("does not CC an address that is already the To recipient", async () => {
    process.env.ENQUIRY_CC_EMAILS = `enquiry@spicycenter.com, ${CONFIGURED_CC[2]}`;
    sent.length = 0;
    await email.sendCatalogueEnquiryEmails(catalogueLead);
    assert.deepEqual(sent[0]?.cc, [CONFIGURED_CC[2]]);
  });

  it("leaves contact, newsletter, wholesale, order, and payment mail without CC", async () => {
    process.env.ENQUIRY_CC_EMAILS = CONFIGURED_CC.join(",");
    sent.length = 0;

    await email.sendContactEmails({
      name: "A Buyer",
      email: "buyer@example.com",
      message: "Hello",
      page: "/contact",
    });
    await email.sendListSignupEmails({ email: "buyer@example.com", page: "/newsletter" });
    await email.sendWholesaleQuoteEmails({
      name: "A Buyer",
      email: "buyer@example.com",
      page: "/wholesale",
      metadata: { company: "Example Co" },
    });
    await email.notifyAdminOrderPlaced(order);
    await email.notifyAdminOrderPaymentFailed(order);
    await email.sendEmail({
      to: "enquiry@spicycenter.com",
      subject: "Direct staff notice",
      text: "No CC should be attached.",
    });

    assert.ok(sent.length >= 6);
    for (const mail of sent) assertNoCc(mail);
  });

  it("does not return CC addresses from the enquiry API response", async () => {
    process.env.ENQUIRY_CC_EMAILS = CONFIGURED_CC.join(",");
    sent.length = 0;
    const { captureLead } = await import("../handlers/orders");
    const res = httpResult(
      await captureLead({
        body: JSON.stringify({
          sessionId: catalogueLead.sessionId,
          source: catalogueLead.source,
          name: catalogueLead.name,
          email: catalogueLead.email,
          phone: catalogueLead.phone,
          page: catalogueLead.page,
          metadata: catalogueLead.metadata,
        }),
      } as never)
    );
    assert.equal(res.statusCode, 201);
    const payload = JSON.parse(String(res.body)) as Record<string, unknown>;
    assert.equal(payload.ok, true);
    assert.equal(payload.emailSent, true);
    assert.equal(typeof payload.leadId, "string");
    assertDoesNotMentionCc(payload);
    assertDoesNotMentionCc(res.body);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0]?.cc, [...CONFIGURED_CC]);
    assertDoesNotMentionCc(sent[0]?.text);
  });
});
