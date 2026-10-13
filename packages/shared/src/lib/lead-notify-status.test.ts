import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leadNotifyStamp, safeLeadNotifyError } from "./lead-notify-status";

describe("leadNotifyStamp", () => {
  it("records sent when mail succeeded", () => {
    const stamp = leadNotifyStamp({ ok: true }, "2026-10-12T08:00:00.000Z");
    assert.equal(stamp.notifyEmailStatus, "sent");
    assert.equal(stamp.notifyEmailAt, "2026-10-12T08:00:00.000Z");
    assert.equal(stamp.notifyEmailError, undefined);
  });

  it("records skipped when SMTP is not configured", () => {
    const stamp = leadNotifyStamp(
      { ok: false, skipped: true, error: "SMTP not configured on server" },
      "2026-10-12T08:00:00.000Z"
    );
    assert.equal(stamp.notifyEmailStatus, "skipped");
    assert.match(stamp.notifyEmailError ?? "", /SMTP not configured/);
  });

  it("records failed with a safe error", () => {
    const stamp = leadNotifyStamp(
      { ok: false, error: "Daily send limit / smtp_pass=super-secret" },
      "2026-10-12T08:00:00.000Z"
    );
    assert.equal(stamp.notifyEmailStatus, "failed");
    assert.match(stamp.notifyEmailError ?? "", /Daily send limit/);
    assert.doesNotMatch(stamp.notifyEmailError ?? "", /super-secret/);
  });
});

describe("safeLeadNotifyError", () => {
  it("returns undefined for empty errors", () => {
    assert.equal(safeLeadNotifyError("  "), undefined);
  });
});
