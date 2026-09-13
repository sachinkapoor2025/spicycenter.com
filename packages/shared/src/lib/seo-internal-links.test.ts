import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getInternalLinkGroups, pickStable, PRIORITY_CITY_LINKS } from "./seo-internal-links";

function hrefs(groups: ReturnType<typeof getInternalLinkGroups>): string[] {
  return groups.flatMap((g) => g.links.map((l) => l.href));
}

describe("internal link graph", () => {
  it("never links a page to itself and keeps unique hrefs per group", () => {
    const groups = getInternalLinkGroups({ type: "category", categorySlug: "whole-spices" });
    assert.ok(groups.length >= 3);
    for (const group of groups) {
      const set = new Set(group.links.map((l) => l.href));
      assert.equal(set.size, group.links.length);
      assert.equal(group.links.some((l) => l.href === "/spices/whole-spices"), false);
      assert.ok(group.links.length <= 8);
    }
  });

  it("only lists quoteable countries on product pages", () => {
    const open = hrefs(getInternalLinkGroups({ type: "product", categorySlug: "whole-spices", productSlug: "cumin-seed" }));
    assert.ok(open.includes("/countries/us"));
    assert.equal(open.includes("/countries/fr"), false);

    const usOnly = hrefs(
      getInternalLinkGroups({
        type: "product",
        categorySlug: "whole-spices",
        productSlug: "cumin-seed",
        availableCountryCodes: ["US"],
      })
    );
    assert.ok(usOnly.includes("/countries/us"));
    assert.equal(usOnly.includes("/countries/uk"), false);
  });

  it("picks stable city subsets so product pages do not dump every city", () => {
    const a = pickStable(PRIORITY_CITY_LINKS, "alpha", 4);
    const b = pickStable(PRIORITY_CITY_LINKS, "alpha", 4);
    assert.deepEqual(a, b);
    assert.equal(a.length, 4);
  });

  it("includes the spice location hub in planning links", () => {
    const groups = getInternalLinkGroups({ type: "home" });
    assert.ok(hrefs(groups).includes("/spices"));
  });

  it("connects city pages back to the USA country page", () => {
    const groups = getInternalLinkGroups({ type: "city", citySlug: "new-york" });
    assert.ok(hrefs(groups).includes("/countries/us"));
    assert.equal(hrefs(groups).includes("/cities/new-york"), false);
  });
});
