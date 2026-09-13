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
      parseNotifyEmails("order@spicycorner.com, not-an-email, priya.yadav@mydgv.com"),
      ["order@spicycorner.com", "priya.yadav@mydgv.com"]
    );
  });

  it("falls back to the default staff list when empty", () => {
    assert.deepEqual(parseNotifyEmails("  "), [...DEFAULT_ORDER_NOTIFY_EMAILS]);
  });

  it("always includes usarakhi and priya even if Lambda env is stale", () => {
    const emails = staffOrderNotifyEmails("order@spicycorner.com");
    assert.ok(emails.includes("order@spicycorner.com"));
    assert.ok(emails.includes("order@usarakhi.com"));
    assert.ok(emails.includes("priya.yadav@mydgv.com"));
  });
});
