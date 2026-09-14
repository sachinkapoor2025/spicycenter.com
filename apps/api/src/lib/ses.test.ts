import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSesError, formatSesFromAddress, SesSendError } from "./ses";

describe("formatSesFromAddress", () => {
  it("formats a simple display name", () => {
    assert.equal(formatSesFromAddress("SpicyCenter", "order@spicycorner.com"), "SpicyCenter <order@spicycorner.com>");
  });

  it("returns bare email when name is empty", () => {
    assert.equal(formatSesFromAddress("  ", "order@spicycorner.com"), "order@spicycorner.com");
  });

  it("quotes names with special characters", () => {
    assert.equal(
      formatSesFromAddress('Usa "Rakhi"', "order@spicycorner.com"),
      `"Usa \\"Rakhi\\"" <order@spicycorner.com>`
    );
  });

  it("rejects invalid from email", () => {
    assert.throws(() => formatSesFromAddress("SpicyCenter", ""), /Invalid From email/);
  });
});

describe("formatSesError", () => {
  it("maps MessageRejected to actionable guidance", () => {
    const err = formatSesError({
      name: "MessageRejected",
      message: "Email address is not verified.",
      $metadata: { httpStatusCode: 400 },
    });
    assert.equal(err.name, "SesSendError");
    assert.match(err.message, /SES rejected the email/);
    assert.match(err.message, /sandbox|verified/i);
    assert.equal(err.code, "MessageRejected");
  });

  it("maps AccessDenied", () => {
    const err = formatSesError({
      name: "AccessDeniedException",
      message: "User is not authorized to perform sesv2:SendEmail",
    });
    assert.match(err.message, /AccessDenied/);
    assert.match(err.message, /sesv2:SendEmail/);
  });

  it("passes through SesSendError", () => {
    const original = new SesSendError("already formatted", { code: "X" });
    assert.equal(formatSesError(original), original);
  });
});
