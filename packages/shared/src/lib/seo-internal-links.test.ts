import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  flattenInternalLinks,
  getInternalLinkGroups,
  PAGE_MAX_INTERNAL_LINKS,
  pickStable,
  PRIORITY_CITY_LINKS,
} from "./seo-internal-links";

function hrefs(groups: ReturnType<typeof getInternalLinkGroups>): string[] {
  return groups.flatMap((g) => g.links.map((l) => l.href));
}

function allLinks(groups: ReturnType<typeof getInternalLinkGroups>) {
  return groups.flatMap((g) => g.links);
}

describe("internal link graph", () => {
  it("caps a page at three unique hrefs and unique anchors", () => {
    const groups = getInternalLinkGroups({ type: "category", categorySlug: "whole-spices" });
    const links = allLinks(groups);
    assert.ok(links.length <= PAGE_MAX_INTERNAL_LINKS);
    assert.equal(new Set(links.map((l) => l.href)).size, links.length);
    assert.equal(new Set(links.map((l) => l.label.toLowerCase())).size, links.length);
    assert.equal(links.some((l) => l.href === "/spices/whole-spices"), false);
  });

  it("never links a product page to itself", () => {
    const open = hrefs(
      getInternalLinkGroups({ type: "product", categorySlug: "whole-spices", productSlug: "cumin-seed" })
    );
    assert.equal(open.includes("/products/cumin-seed"), false);
    assert.ok(open.length <= PAGE_MAX_INTERNAL_LINKS);
  });

  it("picks stable city subsets", () => {
    const a = pickStable(PRIORITY_CITY_LINKS, "alpha", 4);
    const b = pickStable(PRIORITY_CITY_LINKS, "alpha", 4);
    assert.deepEqual(a, b);
    assert.equal(a.length, 4);
  });

  it("includes the spice catalogue on listing pages", () => {
    const groups = getInternalLinkGroups({ type: "listing" });
    assert.ok(hrefs(groups).includes("/spice-guide") || hrefs(groups).includes("/wholesale"));
    assert.ok(allLinks(groups).length <= PAGE_MAX_INTERNAL_LINKS);
  });

  it("connects city pages back to the UK hub", () => {
    const groups = getInternalLinkGroups({ type: "city", citySlug: "new-york" });
    assert.ok(hrefs(groups).includes("/uk"));
    assert.equal(hrefs(groups).includes("/cities/new-york"), false);
  });

  it("flattenInternalLinks drops duplicate labels and hrefs", () => {
    const flat = flattenInternalLinks([
      {
        heading: "A",
        links: [
          { href: "/spices", label: "Catalogue" },
          { href: "/spice-guide", label: "Catalogue" },
          { href: "/spices", label: "Shop" },
          { href: "/wholesale", label: "Wholesale" },
          { href: "/uk", label: "UK" },
        ],
      },
    ]);
    assert.equal(flat.length, 3);
    assert.deepEqual(
      flat.map((l) => l.href),
      ["/spices", "/wholesale", "/uk"]
    );
  });
});
