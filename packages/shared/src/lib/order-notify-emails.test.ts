import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ORDER_NOTIFY_EMAILS,
  enquiryCcEmails,
  parseNotifyEmails,
  parseOptionalEmailList,
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

const CONFIGURED_CC =
  "dgv@mydgv.com,meenu.talwar@mydgv.com,priya.yadav@mydgv.com,naman.talwar@spicycenter.com";

describe("enquiry CC emails", () => {
  it("parses the four configured addresses", () => {
    assert.deepEqual(parseOptionalEmailList(CONFIGURED_CC), [
      "dgv@mydgv.com",
      "meenu.talwar@mydgv.com",
      "priya.yadav@mydgv.com",
      "naman.talwar@spicycenter.com",
    ]);
  });

  it("trims whitespace and lowercases mixed-case addresses", () => {
    assert.deepEqual(parseOptionalEmailList("  DGV@MyDGV.com ; Meenu.Talwar@mydgv.com  "), [
      "dgv@mydgv.com",
      "meenu.talwar@mydgv.com",
    ]);
  });

  it("accepts commas and semicolons", () => {
    assert.deepEqual(parseOptionalEmailList("a@example.com, b@example.com; c@example.com"), [
      "a@example.com",
      "b@example.com",
      "c@example.com",
    ]);
  });

  it("removes duplicate addresses", () => {
    assert.deepEqual(parseOptionalEmailList("a@example.com, A@example.com; a@example.com"), ["a@example.com"]);
  });

  it("excludes addresses already present in To", () => {
    assert.deepEqual(
      enquiryCcEmails("enquiry@spicycenter.com, priya.yadav@mydgv.com", ["Enquiry@spicycenter.com"]),
      ["priya.yadav@mydgv.com"]
    );
  });

  it("returns no recipients when unset, empty, or all invalid", () => {
    assert.deepEqual(enquiryCcEmails(undefined, ["enquiry@spicycenter.com"]), []);
    assert.deepEqual(enquiryCcEmails("   ", ["enquiry@spicycenter.com"]), []);
    assert.deepEqual(enquiryCcEmails("not-an-email, @@, ,", ["enquiry@spicycenter.com"]), []);
  });
});
