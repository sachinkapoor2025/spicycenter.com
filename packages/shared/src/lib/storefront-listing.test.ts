import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STOREFRONT_LISTING_CHUNK_SIZE,
  STOREFRONT_LISTING_INITIAL_LIMIT,
  paginateStorefrontListing,
  parseStorefrontListingQuery,
  sortStorefrontListing,
} from "./storefront-listing";

describe("storefront listing", () => {
  it("omits limit when the caller wants the full catalog", () => {
    assert.deepEqual(parseStorefrontListingQuery(), { offset: 0, sort: "featured" });
    assert.equal(parseStorefrontListingQuery({ offset: "12" }).limit, undefined);
  });

  it("clamps oversized limits and accepts sort", () => {
    assert.deepEqual(parseStorefrontListingQuery({ limit: "24", offset: "48", sort: "price-asc" }), {
      offset: 48,
      limit: 24,
      sort: "price-asc",
    });
    assert.equal(parseStorefrontListingQuery({ limit: "999" }).limit, 48);
    assert.equal(parseStorefrontListingQuery({ sort: "nope" }).sort, "featured");
  });

  it("paginates after sorting so later chunks stay in order", () => {
    const items = [
      { name: "C", price: 3 },
      { name: "A", price: 1 },
      { name: "B", price: 2 },
    ];
    const sorted = sortStorefrontListing(items, "price-asc");
    const first = paginateStorefrontListing(sorted, 0, 2);
    assert.deepEqual(
      first.items.map((i) => i.name),
      ["A", "B"]
    );
    assert.equal(first.hasMore, true);
    const next = paginateStorefrontListing(sorted, first.items.length, STOREFRONT_LISTING_CHUNK_SIZE);
    assert.deepEqual(
      next.items.map((i) => i.name),
      ["C"]
    );
    assert.equal(next.hasMore, false);
  });

  it("uses the shop first-page size", () => {
    const items = Array.from({ length: 80 }, (_, i) => i);
    const first = paginateStorefrontListing(items, 0, STOREFRONT_LISTING_INITIAL_LIMIT);
    assert.equal(first.items.length, STOREFRONT_LISTING_INITIAL_LIMIT);
    assert.equal(first.total, 80);
    assert.equal(first.hasMore, true);
  });
});
