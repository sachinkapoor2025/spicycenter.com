import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyContactFields,
  backfillContactsByIdentity,
  contactsMatch,
  isKnownContact,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "./identity";

describe("normalizeName", () => {
  it("trims and collapses whitespace", () => {
    assert.equal(normalizeName("hiral "), "hiral");
    assert.equal(normalizeName("Kashvi  Singh"), "Kashvi Singh");
    assert.equal(normalizeName("  "), undefined);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and validates", () => {
    assert.equal(normalizeEmail("  Foo@Bar.COM "), "foo@bar.com");
    assert.equal(normalizeEmail("not-an-email"), undefined);
  });
});

describe("normalizePhone", () => {
  it("matches across formats via last 10 digits", () => {
    assert.equal(normalizePhone("+919087654322"), "9087654322");
    assert.equal(normalizePhone("7678560783"), "7678560783");
    assert.equal(normalizePhone("+1-418-543-8090"), "4185438090");
    assert.equal(normalizePhone("123"), undefined);
  });
});

describe("contactsMatch", () => {
  it("matches by email or phone", () => {
    assert.equal(
      contactsMatch({ email: "a@b.com" }, { email: "A@B.com", phone: "111" }),
      true
    );
    assert.equal(
      contactsMatch({ phone: "+91 9087654322" }, { phone: "9087654322" }),
      true
    );
    assert.equal(contactsMatch({ email: "a@b.com" }, { email: "c@d.com" }), false);
  });
});

describe("backfillContactsByIdentity", () => {
  it("fills anonymous session from another session with same email", () => {
    const rows = backfillContactsByIdentity([
      { email: "sam@example.com", name: "Sam", phone: "+1-418-543-8090" },
      { email: "sam@example.com" },
      { phone: "4185438090" },
    ]);
    assert.equal(rows[1].name, "Sam");
    assert.equal(normalizePhone(rows[1].phone), "4185438090");
    assert.equal(rows[2].email, "sam@example.com");
    assert.equal(rows[2].name, "Sam");
  });

  it("does not invent identity for fully anonymous rows", () => {
    const rows = backfillContactsByIdentity([
      { email: "sam@example.com", name: "Sam" },
      {},
    ]);
    assert.equal(isKnownContact(rows[1]), false);
  });
});

describe("applyContactFields", () => {
  it("only fills missing fields", () => {
    const target = { name: "A", email: "a@b.com" };
    applyContactFields(target, { name: "B", email: "c@d.com", phone: "5551234567" });
    assert.equal(target.name, "A");
    assert.equal(target.email, "a@b.com");
    assert.equal(target.phone, "5551234567");
  });
});
