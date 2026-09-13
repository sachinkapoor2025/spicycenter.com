import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_HOMEPAGE_RANKING_CONFIG } from "../schemas/homepage-ranking";
import {
  EMPTY_FUNNEL,
  buildHomepageSnapshot,
  classifyQuadrant,
  inferProductTheme,
  scoreProducts,
  trendFromWindows,
  type ProductPerformanceInput,
} from "./homepage-ranking";

function item(partial: Partial<ProductPerformanceInput> & { slug: string }): ProductPerformanceInput {
  return {
    categorySlug: "whole-spices",
    name: "Whole Cumin Seeds",
    price: 24,
    inventory: 20,
    published: true,
    unitsSold: 0,
    tags: ["cumin"],
    current: { ...EMPTY_FUNNEL },
    previous: { ...EMPTY_FUNNEL },
    recent7: { ...EMPTY_FUNNEL },
    ...partial,
  };
}

describe("homepage ranking", () => {
  it("does not rank a high-click zero-order product above a hidden converter", () => {
    const clicky = item({
      slug: "clicky",
      name: "Kashmiri Chilli",
      categorySlug: "indian-chillies",
      current: { ...EMPTY_FUNNEL, impressions: 10000, clicks: 1200, views: 1100, adds: 20, orders: 3, revenueUsd: 150 },
    });
    const converter = item({
      slug: "converter",
      current: { ...EMPTY_FUNNEL, impressions: 2000, clicks: 800, views: 700, adds: 100, orders: 40, revenueUsd: 1500 },
    });
    const mid = item({
      slug: "mid",
      current: { ...EMPTY_FUNNEL, impressions: 4000, clicks: 500, views: 450, adds: 40, orders: 12, revenueUsd: 400 },
    });
    const ranked = scoreProducts([clicky, converter, mid], DEFAULT_HOMEPAGE_RANKING_CONFIG);
    const bySlug = Object.fromEntries(ranked.map((p) => [p.slug, p]));
    assert.equal(ranked[0]?.slug, "converter");
    assert.ok(bySlug.converter.score > bySlug.clicky.score);
    assert.equal(bySlug.clicky.quadrant, "high_click_low_order");
    assert.ok(bySlug.converter.quadrant === "high_click_high_order" || bySlug.converter.quadrant === "low_click_high_order");
  });

  it("does not treat 1/10 conversion as better than a large sample 5% rate", () => {
    const tiny = item({
      slug: "tiny",
      current: { ...EMPTY_FUNNEL, impressions: 20, clicks: 10, views: 10, orders: 1, revenueUsd: 20 },
    });
    const large = item({
      slug: "large",
      current: { ...EMPTY_FUNNEL, impressions: 8000, clicks: 5000, views: 4800, orders: 250, revenueUsd: 8000 },
    });
    const ranked = scoreProducts([tiny, large], DEFAULT_HOMEPAGE_RANKING_CONFIG);
    const bySlug = Object.fromEntries(ranked.map((p) => [p.slug, p]));
    assert.equal(bySlug.tiny.sampleQuality, "low");
    assert.ok(bySlug.large.score >= bySlug.tiny.score);
  });

  it("marks rising vs falling trends", () => {
    assert.equal(trendFromWindows(100, 40).label, "rising");
    assert.equal(trendFromWindows(500, 1000).label, "falling");
    assert.equal(trendFromWindows(50, 48).label, "stable");
  });

  it("keeps category diversity in the homepage pool", () => {
    const inputs = Array.from({ length: 40 }, (_, i) =>
      item({
        slug: `chilli-${i}`,
        name: `Kashmiri Chilli ${i}`,
        categorySlug: "indian-chillies",
        current: { ...EMPTY_FUNNEL, clicks: 100 - i, orders: 20, revenueUsd: 400, impressions: 1000 },
      })
    ).concat(
      Array.from({ length: 12 }, (_, i) =>
        item({
          slug: `cumin-${i}`,
          name: `Cumin Seed ${i}`,
          categorySlug: "whole-spices",
          current: { ...EMPTY_FUNNEL, clicks: 40, orders: 8, revenueUsd: 120, impressions: 400 },
        })
      )
    );
    const ranked = scoreProducts(inputs);
    const snap = buildHomepageSnapshot(ranked, inputs, {
      ...DEFAULT_HOMEPAGE_RANKING_CONFIG,
      homepageProductCount: 30,
      slotTopPerformers: 20,
      maxShareSameCategory: 0.5,
    });
    const top = snap.groups.find((g) => g.id === "top")?.slugs ?? [];
    const cumin = top.filter((s) => s.startsWith("cumin-")).length;
    assert.ok(cumin > 0, "diversity must keep some whole spices in the top slots");
    assert.ok(snap.ranked.length <= 30);
  });

  it("infers cumin theme and classifies quadrants", () => {
    assert.equal(inferProductTheme("Whole cumin seeds jeera"), "cumin");
    assert.equal(classifyQuadrant(100, 10, 50, 5), "high_click_high_order");
    assert.equal(classifyQuadrant(100, 1, 50, 5), "high_click_low_order");
  });
});
