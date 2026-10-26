import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SITEMAP_EXCLUDED_PATH_PREFIXES,
  SITEMAP_ORIGIN,
  SITEMAP_STATIC_PATHS,
  SITEMAP_XML_NAMESPACE,
  isExcludedSitemapPath,
  sitemapEntriesToXml,
  sitemapUrl,
} from "./sitemap-config";

describe("sitemap configuration", () => {
  it("uses the production SpicyCenter origin", () => {
    assert.equal(SITEMAP_ORIGIN, "https://www.spicycenter.com");
    assert.equal(sitemapUrl("/"), SITEMAP_ORIGIN);
    assert.equal(sitemapUrl("/spices"), "https://www.spicycenter.com/spices");
  });

  it("hardcodes unique hub paths that are not excluded", () => {
    const paths = SITEMAP_STATIC_PATHS.map((item) => item.path);
    assert.equal(new Set(paths).size, paths.length);
    assert.ok(paths.includes("/"));
    assert.ok(paths.includes("/spice-guide"));
    for (const path of paths) {
      assert.equal(isExcludedSitemapPath(path), false);
    }
  });

  it("excludes private, redirected, and non-indexable prefixes", () => {
    assert.ok(SITEMAP_EXCLUDED_PATH_PREFIXES.includes("/admin"));
    assert.ok(SITEMAP_EXCLUDED_PATH_PREFIXES.includes("/cart"));
    assert.ok(SITEMAP_EXCLUDED_PATH_PREFIXES.includes("/checkout"));
    assert.ok(SITEMAP_EXCLUDED_PATH_PREFIXES.includes("/wishlist"));
    assert.ok(SITEMAP_EXCLUDED_PATH_PREFIXES.includes("/bulk-spices"));
    assert.ok(isExcludedSitemapPath("/admin/orders"));
    assert.ok(isExcludedSitemapPath("/uk/indian-spices"));
    assert.ok(isExcludedSitemapPath("/keyword-map"));
  });

  it("serializes valid sitemap protocol XML", () => {
    const xml = sitemapEntriesToXml([
      {
        url: sitemapUrl("/"),
        lastModified: new Date("2026-10-01T00:00:00.000Z"),
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: sitemapUrl("/spices"),
        lastModified: new Date("2026-10-01T00:00:00.000Z"),
        changeFrequency: "daily",
        priority: 0.9,
      },
    ]);
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(xml, new RegExp(`<urlset xmlns="${SITEMAP_XML_NAMESPACE}">`));
    assert.match(xml, /<loc>https:\/\/www\.spicycenter\.com<\/loc>/);
    assert.match(xml, /<loc>https:\/\/www\.spicycenter\.com\/spices<\/loc>/);
    assert.equal(xml.includes("http://"), false);
  });
});
