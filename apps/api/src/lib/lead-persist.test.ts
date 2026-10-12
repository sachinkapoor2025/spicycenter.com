import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { persistLeadThenNotify, type LeadPersistItem } from "./lead-persist";
import type { LeadCaptureInput } from "@spicycorner/shared";
import type { EmailSendResult } from "./email";

const lead: LeadCaptureInput = {
  sessionId: "sess-1",
  name: "Priya Shah",
  email: "buyer@example.com",
  phone: "+447700900123",
  page: "/enquiry",
  source: "catalogue-enquiry",
  metadata: {
    product: "Cumin whole",
    quantity: "25 kg",
    company: "Spice Import Ltd",
    country: "GB",
    enquiryType: "Quote",
    message: "Need whole cumin.",
    market: "overseas",
    kind: "commercial-order",
    city: "Dubai",
    productsJson: JSON.stringify([
      { name: "Cumin whole", quantity: "1", unit: "container" },
      { name: "Turmeric powder", quantity: "10", unit: "kg" },
    ]),
  },
};

describe("persistLeadThenNotify", () => {
  it("saves the lead once before notifying and stamps the same key", async () => {
    const puts: LeadPersistItem[] = [];
    const updates: Array<{ PK: string; SK: string; status: string }> = [];
    const notifyOrder: string[] = [];

    const { item, stamp } = await persistLeadThenNotify(
      {
        leadPayload: lead,
        email: "buyer@example.com",
        timestamp: "2026-10-12T08:00:00.000Z",
        leadId: "lead-1",
        notifiedAt: "2026-10-12T08:00:01.000Z",
      },
      {
        async putItem(next) {
          notifyOrder.push("put");
          puts.push(next);
        },
        async notify() {
          notifyOrder.push("notify");
          return { ok: true };
        },
        async updateNotification(key, nextStamp) {
          notifyOrder.push("update");
          updates.push({ ...key, status: nextStamp.notifyEmailStatus });
        },
      }
    );

    assert.deepEqual(notifyOrder, ["put", "notify", "update"]);
    assert.equal(puts.length, 1);
    assert.equal(puts[0]?.leadId, "lead-1");
    assert.equal(puts[0]?.SK, "LEAD#2026-10-12T08:00:00.000Z");
    assert.match(String(puts[0]?.metadata?.productsJson), /Turmeric powder/);
    assert.equal(item.PK, "SESSION#sess-1");
    assert.equal(stamp.notifyEmailStatus, "sent");
    assert.equal(updates[0]?.PK, item.PK);
    assert.equal(updates[0]?.SK, item.SK);
  });

  it("does not create a second lead when notification fails", async () => {
    const puts: LeadPersistItem[] = [];
    const { stamp, emailResult } = await persistLeadThenNotify(
      {
        leadPayload: lead,
        timestamp: "2026-10-12T08:00:00.000Z",
        leadId: "lead-2",
        notifiedAt: "2026-10-12T08:00:02.000Z",
      },
      {
        async putItem(next) {
          puts.push(next);
        },
        async notify(): Promise<EmailSendResult> {
          return { ok: false, error: "SMTP connection failed" };
        },
        async updateNotification() {},
      }
    );

    assert.equal(puts.length, 1);
    assert.equal(stamp.notifyEmailStatus, "failed");
    assert.equal(emailResult.ok, false);
    assert.equal(puts[0]?.SK, "LEAD#2026-10-12T08:00:00.000Z");
  });

  it("stamps skipped when SMTP is not configured and still uses one lead key", async () => {
    const keys: string[] = [];
    const { stamp } = await persistLeadThenNotify(
      {
        leadPayload: lead,
        timestamp: "2026-10-12T08:00:00.000Z",
        leadId: "lead-3",
      },
      {
        async putItem(item) {
          keys.push(item.SK);
        },
        async notify() {
          return { ok: false, skipped: true, error: "SMTP not configured on server" };
        },
        async updateNotification(key) {
          keys.push(key.SK);
        },
      }
    );

    assert.equal(stamp.notifyEmailStatus, "skipped");
    assert.deepEqual(keys, ["LEAD#2026-10-12T08:00:00.000Z", "LEAD#2026-10-12T08:00:00.000Z"]);
  });
});
