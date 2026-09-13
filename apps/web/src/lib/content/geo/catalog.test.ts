import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GEO_LOCATIONS,
  allGeoPaths,
  findGeoLocation,
  geoCountries,
  getGeoByPath,
  getGeoChildren,
  spiceCityParams,
  spiceCountryParams,
  spiceRegionParams,
  indexableGeoPaths,
} from "./catalog";

describe("spice geo catalog", () => {
  it("has unique ids and paths", () => {
    const ids = GEO_LOCATIONS.map((l) => l.id);
    const paths = allGeoPaths();
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(new Set(paths).size, paths.length);
  });

  it("covers the requested country counts", () => {
    const countries = geoCountries();
    assert.equal(countries.length, 54);
    assert.equal(countries.filter((c) => c.marketGroup === "core").length, 8);
    assert.equal(countries.filter((c) => c.marketGroup === "eu").length, 27);
    assert.equal(countries.filter((c) => c.marketGroup === "europe_other").length, 19);
  });

  it("classifies India, USA, UK, Japan, UAE, and HK correctly", () => {
    assert.equal(getGeoByPath("/spices/india/uttar-pradesh")?.adminKind, "state");
    assert.equal(getGeoByPath("/spices/india/delhi")?.adminKind, "union_territory");
    assert.equal(getGeoByPath("/spices/usa/california")?.adminKind, "state");
    assert.equal(getGeoByPath("/spices/usa/puerto-rico")?.adminKind, "territory");
    assert.equal(getGeoByPath("/spices/usa/district-of-columbia")?.adminKind, "federal_district");
    assert.equal(getGeoByPath("/spices/uk/england")?.adminKind, "constituent_country");
    assert.equal(getGeoByPath("/spices/uk/scotland")?.adminKind, "constituent_country");
    assert.equal(getGeoByPath("/spices/japan/tokyo")?.adminKind, "prefecture");
    assert.equal(getGeoByPath("/spices/uae/dubai")?.adminKind, "emirate");
    assert.equal(getGeoByPath("/spices/hong-kong/wan-chai")?.adminKind, "district");
    assert.equal(getGeoByPath("/spices/germany/bavaria")?.adminKind, "land");
    assert.equal(getGeoByPath("/spices/canada/ontario")?.adminKind, "province");
  });

  it("creates the example city/area pages from the brief", () => {
    const required = [
      "/spices/india/uttar-pradesh/noida",
      "/spices/usa/new-york/new-york-city",
      "/spices/uk/england/london",
      "/spices/uk/england/manchester",
      "/spices/uk/england/birmingham",
      "/spices/uk/england/liverpool",
      "/spices/uk/scotland/glasgow",
      "/spices/uk/scotland/edinburgh",
      "/spices/uk/wales/cardiff",
      "/spices/uk/northern-ireland/belfast",
      "/spices/canada/alberta/calgary",
      "/spices/canada/ontario/toronto",
      "/spices/canada/british-columbia/vancouver",
      "/spices/canada/quebec/montreal",
      "/spices/australia/new-south-wales/sydney",
      "/spices/australia/victoria/melbourne",
      "/spices/australia/queensland/brisbane",
      "/spices/australia/western-australia/perth",
      "/spices/australia/south-australia/adelaide",
      "/spices/australia/australian-capital-territory/canberra",
      "/spices/australia/queensland/gold-coast",
      "/spices/australia/new-south-wales/newcastle",
      "/spices/australia/tasmania/hobart",
      "/spices/australia/northern-territory/darwin",
      "/spices/japan/tokyo/shibuya",
      "/spices/hong-kong/kowloon",
      "/spices/hong-kong/wan-chai",
      "/spices/hong-kong/central-and-western/central",
      "/spices/hong-kong/sha-tin",
      "/spices/hong-kong/yau-tsim-mong/tsim-sha-tsui",
      "/spices/uae/dubai/dubai-marina",
      "/spices/uae/dubai/downtown-dubai",
      "/spices/uae/dubai/jumeirah",
      "/spices/uae/abu-dhabi",
      "/spices/uae/sharjah",
    ];
    for (const path of required) {
      assert.ok(getGeoByPath(path), `missing ${path}`);
    }
  });

  it("does not treat Dubai or London as countries", () => {
    assert.equal(geoCountries().some((c) => c.slug === "dubai"), false);
    assert.equal(geoCountries().some((c) => c.slug === "london"), false);
    assert.equal(getGeoByPath("/spices/uae/dubai")?.kind, "admin_region");
  });

  it("keeps US territories separate from the 50 states", () => {
    const usaId = "usa";
    const children = getGeoChildren(usaId);
    assert.equal(children.filter((c) => c.adminKind === "state").length, 50);
    assert.equal(children.filter((c) => c.adminKind === "territory").length, 5);
    assert.equal(children.filter((c) => c.adminKind === "federal_district").length, 1);
  });

  it("counts India 28 states + 8 UTs and Japan 47 prefectures", () => {
    const india = getGeoChildren("india");
    assert.equal(india.filter((c) => c.adminKind === "state").length, 28);
    assert.equal(india.filter((c) => c.adminKind === "union_territory").length, 8);
    assert.equal(getGeoChildren("japan").filter((c) => c.adminKind === "prefecture").length, 47);
    assert.equal(getGeoChildren("germany").filter((c) => c.adminKind === "land").length, 16);
  });

  it("noindexes Australia other territories only", () => {
    const hidden = GEO_LOCATIONS.filter((l) => !l.indexable);
    assert.ok(hidden.length >= 8);
    assert.ok(hidden.every((l) => l.adminKind === "other_territory"));
    assert.ok(indexableGeoPaths().includes("/spices/australia"));
    assert.equal(indexableGeoPaths().includes("/spices/australia/christmas-island"), false);
  });

  it("keeps every location within /spices/{country}/{region}/{city}", () => {
    for (const loc of GEO_LOCATIONS) {
      const parts = loc.path.split("/").filter(Boolean);
      assert.ok(parts.length >= 2 && parts.length <= 4, loc.path);
      assert.equal(parts[0], "spice");
    }
  });

  it("static params cover every generated location", () => {
    const countryN = spiceCountryParams().length;
    const regionN = spiceRegionParams().length;
    const cityN = spiceCityParams().length;
    assert.equal(countryN + regionN + cityN, GEO_LOCATIONS.length);
    assert.ok(findGeoLocation("usa", "new-york", "new-york-city"));
    assert.equal(findGeoLocation("usa", "not-a-place"), undefined);
  });
});
