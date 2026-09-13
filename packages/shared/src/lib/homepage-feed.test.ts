import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOMEPAGE_FEED_CHUNK_SIZE,
  HOMEPAGE_FEED_INITIAL_LIMIT,
  HOMEPAGE_FIRST_PAINT_GROUPS,
  HOMEPAGE_HAMPERS_AFTER_FEATURED_GROUPS,
  buildHomepageFeedSlugs,
  homepageProductsPath,
  paginateHomepageFeed,
  parseHomepageFeedQuery,
} from "./homepage-feed";

describe("homepage feed", () => {
  it("puts first-paint group slugs ahead of the rest of the ranked pool", () => {
    const feed = buildHomepageFeedSlugs({
      groups: [
        { id: "top", title: "Top", slugs: ["a", "b", "c"] },
        { id: "trending", title: "Trending", slugs: ["t1", "a"] },
        { id: "best_sellers", title: "Best", slugs: ["s1", "s2"] },
        { id: "new", title: "New", slugs: ["n1"] },
      ],
      ranked: ["a", "b", "c", "t1", "s1", "s2", "n1", "x1", "x2"],
    });
    assert.deepEqual(feed.slice(0, 7), ["a", "b", "c", "t1", "s1", "s2", "n1"]);
    assert.deepEqual(feed.slice(7), ["x1", "x2"]);
  });

  it("caps each first-paint group so the opening page stays small", () => {
    const top = Array.from({ length: 80 }, (_, i) => `top-${i}`);
    const rest = Array.from({ length: 200 }, (_, i) => `rest-${i}`);
    const feed = buildHomepageFeedSlugs({
      groups: [{ id: "top", title: "Top", slugs: top }],
      ranked: [...top, ...rest],
    });
    const topLimit = HOMEPAGE_FIRST_PAINT_GROUPS.find((g) => g.id === "top")?.limit ?? 0;
    assert.equal(feed[0], "top-0");
    assert.equal(feed[topLimit], "top-10");
    assert.ok(feed.length > 40);
  });

  it("paginates the unified feed without returning the full catalog", () => {
    const items = Array.from({ length: 120 }, (_, i) => i);
    const first = paginateHomepageFeed(items, 0, HOMEPAGE_FEED_INITIAL_LIMIT);
    assert.equal(first.items.length, HOMEPAGE_FEED_INITIAL_LIMIT);
    assert.equal(first.total, 120);
    assert.equal(first.hasMore, true);

    const next = paginateHomepageFeed(items, first.items.length, HOMEPAGE_FEED_CHUNK_SIZE);
    assert.equal(next.items.length, HOMEPAGE_FEED_CHUNK_SIZE);
    assert.equal(next.items[0], HOMEPAGE_FEED_INITIAL_LIMIT);
    assert.equal(next.hasMore, true);
  });

  it("parses feed query defaults and clamps oversized limits", () => {
    assert.deepEqual(parseHomepageFeedQuery(), {
      offset: 0,
      limit: HOMEPAGE_FEED_INITIAL_LIMIT,
    });
    assert.deepEqual(parseHomepageFeedQuery({ offset: "36", limit: "24" }), {
      offset: 36,
      limit: 24,
    });
    assert.equal(parseHomepageFeedQuery({ limit: "999" }).limit, 48);
    assert.equal(homepageProductsPath({ offset: 40, limit: 24 }), "/homepage/products?limit=24&offset=40");
  });

  it("places hampers after two featured groups (4th homepage block after the banner)", () => {
    assert.equal(HOMEPAGE_HAMPERS_AFTER_FEATURED_GROUPS, 2);
  });
});
