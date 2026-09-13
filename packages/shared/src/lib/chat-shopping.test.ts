import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSearchQuery,
  classifyChatIntent,
  mergeShoppingState,
  missingShoppingSlots,
  scoreProductForState,
} from "./chat-shopping";
import type { Product } from "../schemas/product";

describe("chat shopping parser", () => {
  it("extracts a cumin wholesale request", () => {
    const state = mergeShoppingState({}, "I want whole cumin jeera under $40");
    assert.equal(state.theme, "cumin");
    assert.equal(state.categorySlug, "whole-spices");
    assert.equal(state.budgetMax, 40);
    const missing = missingShoppingSlots(state, "product_search");
    assert.ok(Array.isArray(missing));
  });

  it("maps London to GB and classifies shipping intent", () => {
    const intent = classifyChatIntent("Can this reach London?");
    assert.equal(intent, "shipping_query");
    const state = mergeShoppingState({}, "I need something that ships to London");
    assert.equal(state.country, "GB");
    assert.equal(state.city, "London");
  });

  it("scores cumin products above unrelated ones", () => {
    const state = mergeShoppingState({}, "whole cumin jeera");
    const cumin = {
      slug: "cumin-1",
      name: "Whole Cumin Seeds Jeera",
      description: "cumin",
      price: 12,
      categorySlug: "whole-spices",
      images: [],
      tags: ["cumin", "jeera"],
      inventory: 10,
      published: true,
    } as Product;
    const turmeric = {
      slug: "turmeric-1",
      name: "Turmeric Powder Haldi",
      description: "ground",
      price: 9,
      categorySlug: "ground-spices",
      images: [],
      tags: ["turmeric"],
      inventory: 10,
      published: true,
    } as Product;
    assert.ok(scoreProductForState(cumin, state) > scoreProductForState(turmeric, state));
    assert.ok(buildSearchQuery(state).includes("cumin"));
  });
});
