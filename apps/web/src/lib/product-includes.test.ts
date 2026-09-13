import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getProductIncludes, parseChocolateInclude } from "./product-includes";

describe("parseChocolateInclude", () => {
  it("reads Ferrero count from Includes sentence", () => {
    assert.equal(
      parseChocolateInclude("Gift set. Includes 3 Ferrero Rocher chocolates."),
      "3 Ferrero Rocher Chocolates"
    );
  });

  it("reads Hershey count from name", () => {
    assert.equal(
      parseChocolateInclude("Elegant Designer Rakhi with 2 HERSHEY'S Chocolates"),
      "2 small Hershey's chocolates"
    );
  });

  it("omits count for assorted chocolates", () => {
    assert.equal(
      parseChocolateInclude("Gift set. Includes 5 assorted chocolates."),
      "Assorted Chocolates"
    );
  });

  it("defaults Ferrero to 3 when brand only", () => {
    assert.equal(parseChocolateInclude("Rakhi with Ferrero Rocher"), "3 Ferrero Rocher Chocolates");
  });

  it("returns null when no chocolate", () => {
    assert.equal(parseChocolateInclude("Single Rakhi with Roli Chawal"), null);
  });
});

describe("getProductIncludes", () => {
  it("lists rakhi, roli, chawal for single rakhi", () => {
    assert.deepEqual(
      getProductIncludes({
        name: "Om Rakhi with Roli Chawal for Brother",
        description: "Elegant single rakhi for brother.",
        categorySlug: "single-rakhi",
        tags: [],
      }),
      [
        "1 Designer Rakhi",
        "Small packet of Roli",
        "Small packet of Chawal (Rice)",
        "Delivering in 5–7 days",
        "Best quality at competitive rates",
      ]
    );
  });

  it("adds chocolate pieces for combo", () => {
    assert.deepEqual(
      getProductIncludes({
        name: "Rakhi with Ferrero Rocher Chocolates & Roli Chawal",
        description: "Premium combo. Includes 3 Ferrero Rocher chocolates.",
        categorySlug: "rakhi-combo",
        tags: [],
      }),
      [
        "1 Designer Rakhi",
        "Small packet of Roli",
        "Small packet of Chawal (Rice)",
        "3 Ferrero Rocher Chocolates",
        "Delivering in 5–7 days",
        "Best quality at competitive rates",
      ]
    );
  });

  it("lists bhaiya + lumba for set", () => {
    const items = getProductIncludes({
      name: "Rakhi Combo for Bhai Bhabhi with Premium Chocolates Gift Set",
      description: "Includes 5 assorted chocolates.",
      categorySlug: "bhaiya-bhabhi-rakhi",
      tags: [],
    });
    assert.ok(items.includes("1 Bhaiya Rakhi"));
    assert.ok(items.includes("1 Lumba Rakhi for Bhabhi"));
    assert.ok(items.includes("Assorted Chocolates"));
  });

  it("adds 2 small Hershey's for Bhai & Bhabhi Lumba Rakhi Set", () => {
    const items = getProductIncludes({
      slug: "bhai-bhabhi-lumba-rakhi-set",
      name: "Bhai & Bhabhi Lumba Rakhi Set",
      description: "Celebrate with roli and chawal.",
      categorySlug: "bhaiya-bhabhi-rakhi",
      tags: [],
    });
    assert.ok(items.includes("1 Bhaiya Rakhi"));
    assert.ok(items.includes("1 Lumba Rakhi for Bhabhi"));
    assert.ok(items.includes("2 small Hershey's chocolates"));
  });

  it("uses hamper what's-included list, splits roli/chawal, skips marketing", () => {
    const items = getProductIncludes({
      name: "Divine Rakhi Gift Set",
      description: `<p><strong>What's included in this hamper:</strong></p>
<ul><li>Set of 3 Rakhi</li><li>Besan Laddoo 200 g</li><li>100 g almonds</li><li>Roli Chawal Dibbi</li></ul>
<p><strong>Why sisters choose this hamper for USA delivery:</strong></p>
<ul><li>Clear what's-included list with quantities</li><li>Domestic USA shipping — no international customs delay for your brother</li><li>Festive packaging ready for Raksha Bandhan 2026</li><li>Secure checkout in USD (Stripe) or INR (Razorpay)</li></ul>`,
      categorySlug: "rakhi-hampers",
      tags: ["rakhi-hamper"],
    });
    assert.deepEqual(items, [
      "Set of 3 Rakhi",
      "Besan Laddoo 200 g",
      "100 g almonds",
      "Small Roli box",
      "Small Chawal box",
      "Delivering in 5–7 days",
      "Best quality at competitive rates",
    ]);
  });

  it("splits roli/chawal tikka set into three lines", () => {
    const items = getProductIncludes({
      name: "Divine Ritual Rakhi Pack",
      description: `<p><strong>What's included in this hamper:</strong></p>
<ul><li>Set of 2 designer Rakhis</li><li>Besan Laddoo 200 g</li><li>100 g almonds</li><li>Roli Chawal Designer Tikka Set</li></ul>`,
      categorySlug: "rakhi-hampers",
      tags: [],
    });
    assert.deepEqual(items, [
      "Set of 2 designer Rakhis",
      "Besan Laddoo 200 g",
      "100 g almonds",
      "Roli",
      "Chawal",
      "Designer tikka set",
      "Delivering in 5–7 days",
      "Best quality at competitive rates",
    ]);
  });

  it("expands kk and splits complimentary roli chawal", () => {
    const items = getProductIncludes({
      name: "Love to Treat Rakhi Hamper",
      description: `<p><strong>What's included in this hamper:</strong></p>
<ul><li>1 designer Single Rakhi</li><li>100 g almonds</li><li>200 g kk</li><li>3pc Ferrero chocolates</li><li>Complimentary Roli Chawal.</li></ul>`,
      categorySlug: "rakhi-hampers",
      tags: [],
    });
    assert.deepEqual(items, [
      "1 designer Single Rakhi",
      "100 g almonds",
      "200 g Kaju Katli",
      "3pc Ferrero chocolates",
      "Complimentary Roli",
      "Complimentary Chawal (Rice)",
      "Delivering in 5–7 days",
      "Best quality at competitive rates",
    ]);
  });

  it("lists hamperContents for spice gift sets", () => {
    const items = getProductIncludes({
      name: "Kitchen spice tin",
      description: "Gift kit",
      categorySlug: "gift-sets",
      tags: ["spice-gift"],
      hamperContents: [
        { slug: "cumin", name: "Cumin seeds 200g" },
        { slug: "turmeric", name: "Turmeric powder 200g" },
      ],
    });
    assert.deepEqual(items, [
      "Cumin seeds 200g",
      "Turmeric powder 200g",
      "Delivering in 5–7 days",
      "Best quality at competitive rates",
    ]);
  });
});
