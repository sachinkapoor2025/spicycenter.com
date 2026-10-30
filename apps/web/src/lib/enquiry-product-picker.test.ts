import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENQUIRY_KINDS } from "@spicycorner/shared";
import {
  ENQUIRY_PRODUCT_SEARCH_LIMIT,
  addPickerProduct,
  enquiryProductBrowsePath,
  enquiryProductSearchPath,
  enquiryUpstreamBrowsePath,
  enquiryUpstreamSearchPath,
  exactCatalogueSuggestion,
  pickerQuantityFieldsVisible,
  selectionFromCatalogue,
  selectionFromUnlisted,
  suggestionsFromCatalogueProducts,
  resolveEnquiryProductSuggestions,
  productsForSubmission,
  toEnquiryFormProducts,
  unlistedProductOffer,
  uniqueEnquirySpiceSuggestions,
  visiblePickerSuggestions,
} from "./enquiry-product-picker";
import { loadSpiceCatalogFile } from "./spice-data";

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
    assert.equal(enquiryUpstreamSearchPath("  black pepper "), "/cj/products?search=black+pepper&limit=8");
    assert.equal(enquiryUpstreamBrowsePath(), "/cj/products?limit=48");
    assert.equal(enquiryProductSearchPath("  black pepper "), "/api/enquiry-products?search=black+pepper");
    assert.equal(enquiryProductBrowsePath(), "/api/enquiry-products");
    assert.equal(enquiryProductSearchPath("cumin").includes("slug"), false);
  });

  it("collapses pack sizes and forms to one spice name", () => {
    const suggestions = suggestionsFromCatalogueProducts(catalogue);
    assert.deepEqual(
      suggestions.map((row) => row.name),
      ["Cumin", "Black cumin"]
    );
    assert.equal(suggestions.filter((row) => row.name === "Cumin").length, 1);
  });
});

describe("exact catalogue match", () => {
  const suggestions = suggestionsFromCatalogueProducts(catalogue);

  it("selects a spice when the query matches its base name or a catalogue variant", () => {
    const match = exactCatalogueSuggestion("Cumin seeds — 25 kg bulk", suggestions);
    assert.equal(match?.name, "Cumin");
    assert.equal(exactCatalogueSuggestion("Cumin powder", suggestions)?.name, "Cumin");
    assert.equal(exactCatalogueSuggestion("cumin", suggestions)?.name, "Cumin");
  });

  it("does not treat a shorter fragment as a different spice", () => {
    assert.equal(exactCatalogueSuggestion("cum", suggestions), null);
    assert.equal(exactCatalogueSuggestion("black", suggestions), null);
    assert.equal(exactCatalogueSuggestion("cumin", suggestions)?.name, "Cumin");
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
  const cumin = suggestions.find((row) => row.name === "Cumin");
  if (!cumin) throw new Error("expected a collapsed Cumin suggestion");

  it("blocks the same collapsed product and keeps quantity off the submitted shape", () => {
    const first = selectionFromCatalogue(cumin, { quantity: "25", unit: "kg" });
    const selected = addPickerProduct([], first);
    assert.ok(selected);
    assert.equal(addPickerProduct(selected, selectionFromCatalogue(cumin)), null);
    assert.equal(addPickerProduct(selected, selectionFromUnlisted("cumin seeds")), null);
    assert.deepEqual(toEnquiryFormProducts(selected), [{ name: "Cumin", quantity: "25", unit: "kg" }]);
    assert.equal(JSON.stringify(toEnquiryFormProducts(selected)).includes("slug"), false);
    assert.equal(JSON.stringify(toEnquiryFormProducts(selected)).includes("unlisted"), false);
    assert.deepEqual(visiblePickerSuggestions(suggestions, selected).map((row) => row.name), ["Black cumin"]);
  });

  it("offers a clearly labelled unlisted product only when nothing matches exactly", () => {
    const fragment = unlistedProductOffer("zzznospice", suggestions, []);
    assert.equal(fragment?.label, "Other");
    assert.equal(fragment?.name, "zzznospice");
    assert.equal(unlistedProductOffer("Cumin seeds", suggestions, []), null);
    assert.equal(unlistedProductOffer("Cumin", suggestions, []), null);
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
      { name: "Cumin", quantity: "25", unit: "kg" },
    ]);
    assert.deepEqual(productsForSubmission([kept], ENQUIRY_KINDS.SAMPLE_REQUEST), [
      { name: "Cumin", quantity: "", unit: "" },
    ]);
    assert.deepEqual(productsForSubmission([kept], ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY), [
      { name: "Cumin", quantity: "", unit: "" },
    ]);
  });
});

describe("empty catalogue API fallback", () => {
  const turmeric = {
    slug: "turmeric-whole-1kg",
    name: "Turmeric whole — 1 kg bulk",
    tags: ["spice:turmeric", "form:whole"],
  };

  it("uses live API rows when the bundled catalogue is empty", () => {
    const suggestions = resolveEnquiryProductSuggestions(catalogue, [], "cumin");
    assert.deepEqual(
      suggestions.map((row) => row.name),
      ["Cumin", "Black cumin"]
    );
  });

  it("searches the bundled catalogue by name and tag when the API returns no products", () => {
    const bundled = [
      ...catalogue,
      turmeric,
      { slug: "ajwain-1kg", name: "Ajwain seeds — 1 kg", tags: ["spice:ajwain", "form:seeds"] },
    ];
    const byName = resolveEnquiryProductSuggestions([], bundled, "cumin");
    assert.deepEqual(
      byName.map((row) => row.name),
      ["Cumin", "Black cumin"]
    );
    const byTag = resolveEnquiryProductSuggestions([], bundled, "spice:turmeric");
    assert.deepEqual(
      byTag.map((row) => row.name),
      ["Turmeric"]
    );
    const browse = resolveEnquiryProductSuggestions([], bundled, "");
    assert.deepEqual(
      browse.map((row) => row.name),
      ["Cumin", "Black cumin", "Turmeric", "Ajwain"]
    );
  });

  it("caps an empty-API browse at eight collapsed names", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      slug: `spice-${index}-1kg`,
      name: `Spice ${index} — 1 kg`,
      tags: [`spice:spice-${index}`, "form:whole"],
    }));
    assert.equal(resolveEnquiryProductSuggestions([], many, "").length, 8);
  });

  it("finds one Cumin in the real catalogue and keeps different spices separate", () => {
    const products = loadSpiceCatalogFile().products ?? [];
    assert.equal(products.length, 1410);
    const unique = uniqueEnquirySpiceSuggestions(products);
    assert.equal(unique.length, 88);
    assert.equal(unique.filter((row) => row.name === "Cumin").length, 1);
    assert.equal(unique.some((row) => row.name === "Black cumin"), true);
    assert.equal(unique.some((row) => row.name === "Black pepper"), true);
    const cuminRows = products.filter((product) => product.tags?.includes("spice:cumin"));
    assert.equal(cuminRows.length > 1, true);
    assert.deepEqual(
      uniqueEnquirySpiceSuggestions(cuminRows).map((row) => row.name),
      ["Cumin"]
    );
    assert.deepEqual(
      resolveEnquiryProductSuggestions([], products, "cumin").map((row) => row.name),
      ["Cumin", "Black cumin"]
    );
  });
});
