import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENQUIRY_KINDS } from "@spicycorner/shared";
import {
  ENQUIRY_PRODUCT_SEARCH_LIMIT,
  addPickerProduct,
  enquiryProductBrowsePath,
  enquiryProductSearchPath,
  exactCatalogueSuggestion,
  pickerQuantityFieldsVisible,
  selectionFromCatalogue,
  selectionFromUnlisted,
  suggestionsFromCatalogueProducts,
  productsForSubmission,
  toEnquiryFormProducts,
  unlistedProductOffer,
  visiblePickerSuggestions,
} from "./enquiry-product-picker";

const catalogue = [
  {
    slug: "cumin-seeds-1kg",
    name: "Cumin seeds — 1 kg bulk",
    tags: ["spice:cumin", "form:seeds"],
  },
  {
    slug: "cumin-seeds-25kg",
    name: "Cumin seeds — 25 kg bulk",
    tags: ["spice:cumin", "form:seeds"],
  },
  {
    slug: "cumin-powder-1kg",
    name: "Cumin powder — 1 kg bulk",
    tags: ["spice:cumin", "form:powder"],
  },
  {
    slug: "black-cumin-1kg",
    name: "Black cumin — 1 kg bulk",
    tags: ["spice:black-cumin", "form:seeds"],
  },
];

describe("enquiry product search", () => {
  it("requests at most eight catalogue rows and does not attach a slug", () => {
    assert.equal(ENQUIRY_PRODUCT_SEARCH_LIMIT, 8);
    assert.equal(enquiryProductSearchPath("  black pepper "), "/cj/products?search=black+pepper&limit=8");
    assert.equal(enquiryProductBrowsePath(), "/cj/products?limit=48");
    assert.equal(enquiryProductSearchPath("cumin").includes("slug"), false);
  });

  it("collapses pack sizes to one display name", () => {
    const suggestions = suggestionsFromCatalogueProducts(catalogue);
    assert.deepEqual(
      suggestions.map((row) => row.name),
      ["Cumin seeds", "Cumin powder", "Black cumin"]
    );
    assert.equal(suggestions.filter((row) => row.name === "Cumin seeds").length, 1);
  });
});

describe("exact catalogue match", () => {
  const suggestions = suggestionsFromCatalogueProducts(catalogue);

  it("selects a product only when the query matches one collapsed name", () => {
    const match = exactCatalogueSuggestion("Cumin seeds — 25 kg bulk", suggestions);
    assert.equal(match?.name, "Cumin seeds");
    assert.equal(exactCatalogueSuggestion("Cumin powder", suggestions)?.name, "Cumin powder");
  });

  it("does not treat a fragment such as cumin as a different product", () => {
    assert.equal(exactCatalogueSuggestion("cumin", suggestions), null);
    assert.equal(exactCatalogueSuggestion("black", suggestions), null);
  });

  it("does not choose when two collapsed products share the same name", () => {
    assert.equal(
      exactCatalogueSuggestion("Cumin", [
        { key: "a", name: "Cumin" },
        { key: "b", name: "Cumin" },
      ]),
      null
    );
  });
});

describe("picker selection", () => {
  const suggestions = suggestionsFromCatalogueProducts(catalogue);
  const cumin = suggestions.find((row) => row.name === "Cumin seeds");
  if (!cumin) throw new Error("expected a collapsed Cumin seeds suggestion");

  it("blocks the same collapsed product and keeps quantity off the submitted shape", () => {
    const first = selectionFromCatalogue(cumin, { quantity: "25", unit: "kg" });
    const selected = addPickerProduct([], first);
    assert.ok(selected);
    assert.equal(addPickerProduct(selected, selectionFromCatalogue(cumin)), null);
    assert.equal(addPickerProduct(selected, selectionFromUnlisted("cumin seeds")), null);
    assert.deepEqual(toEnquiryFormProducts(selected), [{ name: "Cumin seeds", quantity: "25", unit: "kg" }]);
    assert.equal(JSON.stringify(toEnquiryFormProducts(selected)).includes("slug"), false);
    assert.equal(JSON.stringify(toEnquiryFormProducts(selected)).includes("unlisted"), false);
    assert.deepEqual(visiblePickerSuggestions(suggestions, selected).map((row) => row.name), [
      "Cumin powder",
      "Black cumin",
    ]);
  });

  it("offers a clearly labelled unlisted product only when nothing matches exactly", () => {
    const fragment = unlistedProductOffer("cumin", suggestions, []);
    assert.equal(fragment?.label, "Other");
    assert.equal(fragment?.name, "cumin");
    assert.equal(unlistedProductOffer("Cumin seeds", suggestions, []), null);
    assert.equal(unlistedProductOffer("Cumin seeds", [], [selectionFromCatalogue(cumin)]), null);
  });

  it("shows quantity fields for commercial orders and hides them for other enquiry types", () => {
    assert.equal(pickerQuantityFieldsVisible(ENQUIRY_KINDS.COMMERCIAL_ORDER), true);
    assert.equal(pickerQuantityFieldsVisible(ENQUIRY_KINDS.SAMPLE_REQUEST), false);
    assert.equal(pickerQuantityFieldsVisible(ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY), false);
    assert.equal(pickerQuantityFieldsVisible(""), false);
    const kept = selectionFromCatalogue(cumin, { quantity: "25", unit: "kg" });
    assert.equal(kept.quantity, "25");
    assert.equal(kept.unit, "kg");
    assert.deepEqual(productsForSubmission([kept], ENQUIRY_KINDS.COMMERCIAL_ORDER), [
      { name: "Cumin seeds", quantity: "25", unit: "kg" },
    ]);
    assert.deepEqual(productsForSubmission([kept], ENQUIRY_KINDS.SAMPLE_REQUEST), [
      { name: "Cumin seeds", quantity: "", unit: "" },
    ]);
    assert.deepEqual(productsForSubmission([kept], ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY), [
      { name: "Cumin seeds", quantity: "", unit: "" },
    ]);
  });
});
