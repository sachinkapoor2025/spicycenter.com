import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ORDER_NOTIFY_EMAILS,
  parseNotifyEmails,
  staffOrderNotifyEmails,
} from "./order-notify-emails";

describe("order notify emails", () => {
  it("parses comma-separated addresses and drops junk", () => {
    assert.deepEqual(
      parseNotifyEmails("enquiry@spicycenter.com, not-an-email, priya.yadav@mydgv.com"),
      ["enquiry@spicycenter.com", "priya.yadav@mydgv.com"]
    );
  });

  it("falls back to the default staff list when empty", () => {
    assert.deepEqual(parseNotifyEmails("  "), [...DEFAULT_ORDER_NOTIFY_EMAILS]);
  });

  it("always includes the enquiry mailbox even if Lambda env is stale", () => {
    const emails = staffOrderNotifyEmails("someone@example.com");
    assert.ok(emails.includes("someone@example.com"));
    assert.ok(emails.includes("enquiry@spicycenter.com"));
  });
});
