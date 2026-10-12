import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLeadRetryToList,
  interpretLeadRetryResponse,
  leadRetryButtonState,
  leadRetryRequestBody,
  leadRetryThrownMessage,
} from "./lead-retry-ui";

const failedLead: {
  leadId: string;
  sessionId: string;
  createdAt: string;
  notifyEmailStatus: "sent" | "failed" | "skipped";
  notifyEmailAt?: string;
  notifyEmailError?: string;
} = {
  leadId: "lead-1",
  sessionId: "sess-1",
  createdAt: "2026-10-12T08:00:00.000Z",
  notifyEmailStatus: "failed",
  notifyEmailAt: "2026-10-12T08:00:01.000Z",
  notifyEmailError: "SMTP not configured",
};

describe("leadRetryRequestBody", () => {
  it("sends only the stored Dynamo key fields", () => {
    assert.deepEqual(leadRetryRequestBody(failedLead), {
      sessionId: "sess-1",
      createdAt: "2026-10-12T08:00:00.000Z",
    });
  });
});

describe("leadRetryButtonState", () => {
  it("disables the button and shows a loading label while retrying", () => {
    assert.deepEqual(leadRetryButtonState(false), {
      label: "Retry Email",
      disabled: false,
      busy: false,
    });
    assert.deepEqual(leadRetryButtonState(true), {
      label: "Retrying…",
      disabled: true,
      busy: true,
    });
  });
});

describe("interpretLeadRetryResponse", () => {
  it("updates notify fields only after a successful send", () => {
    const outcome = interpretLeadRetryResponse({
      ok: true,
      result: "sent",
      leadId: "lead-1",
      notifyEmailStatus: "sent",
      notifyEmailAt: "2026-10-12T08:10:00.000Z",
    });
    assert.equal(outcome.kind, "updated");
    if (outcome.kind !== "updated") return;
    assert.equal(outcome.tone, "success");
    assert.equal(outcome.patch.notifyEmailStatus, "sent");
    assert.equal(outcome.patch.notifyEmailAt, "2026-10-12T08:10:00.000Z");
    assert.equal(outcome.patch.notifyEmailError, undefined);

    const next = applyLeadRetryToList([failedLead], "lead-1", outcome.patch);
    assert.equal(next[0]?.notifyEmailStatus, "sent");
    assert.equal(next[0]?.notifyEmailError, undefined);
  });

  it("records an SMTP failure without marking the lead sent", () => {
    const outcome = interpretLeadRetryResponse({
      ok: false,
      result: "failed",
      leadId: "lead-1",
      notifyEmailStatus: "failed",
      notifyEmailAt: "2026-10-12T08:10:00.000Z",
      error: "Daily send limit",
    });
    assert.equal(outcome.kind, "updated");
    if (outcome.kind !== "updated") return;
    assert.equal(outcome.tone, "error");
    assert.equal(outcome.patch.notifyEmailStatus, "failed");
    assert.equal(outcome.patch.notifyEmailError, "Daily send limit");
    assert.match(outcome.message, /Daily send limit/);
  });

  it("does not treat an incomplete 200 body as a successful send", () => {
    const outcome = interpretLeadRetryResponse({ ok: true });
    assert.equal(outcome.kind, "unchanged");
    assert.equal(outcome.tone, "error");
  });

  it("keeps existing lead data on conflict responses", () => {
    const alreadySent = interpretLeadRetryResponse({
      ok: false,
      result: "already_sent",
      leadId: "lead-1",
      error: "Notification was already sent for this lead.",
    });
    assert.equal(alreadySent.kind, "unchanged");
    assert.match(alreadySent.message, /already sent/);

    const notApplicable = interpretLeadRetryResponse({
      ok: false,
      result: "not_applicable",
      error: "This lead has no notification payload to retry.",
    });
    assert.equal(notApplicable.kind, "unchanged");

    const inProgress = interpretLeadRetryResponse({
      ok: false,
      result: "retry_in_progress",
      error: "A notification retry is already in progress.",
    });
    assert.equal(inProgress.kind, "unchanged");

    const list = applyLeadRetryToList([failedLead], "lead-1", {});
    assert.deepEqual(list[0], failedLead);
  });
});

describe("leadRetryThrownMessage", () => {
  it("maps 403 and 404 to safe admin copy", () => {
    assert.equal(leadRetryThrownMessage(new Error("Forbidden")), "You do not have permission to retry this notification.");
    assert.equal(leadRetryThrownMessage(new Error("Lead not found")), "This lead could not be found.");
  });

  it("keeps 409 server messages", () => {
    assert.equal(
      leadRetryThrownMessage(new Error("A notification retry is already in progress.")),
      "A notification retry is already in progress."
    );
    assert.equal(
      leadRetryThrownMessage(new Error("Notification was already sent for this lead.")),
      "Notification was already sent for this lead."
    );
  });
});
