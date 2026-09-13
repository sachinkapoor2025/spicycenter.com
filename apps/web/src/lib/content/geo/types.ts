/** Geographic SEO nodes. Regions are never forced into a “state” label. */

export type GeoKind = "country" | "admin_region" | "city";

export type GeoAdminKind =
  | "country"
  | "state"
  | "union_territory"
  | "territory"
  | "federal_district"
  | "province"
  | "prefecture"
  | "emirate"
  | "constituent_country"
  | "region"
  | "district"
  | "land"
  | "other_territory"
  | "city"
  | "area";

export type GeoMarketGroup = "core" | "eu" | "europe_other";

export type GeoHemisphere = "north" | "south";

export type GeoLocation = {
  id: string;
  kind: GeoKind;
  adminKind: GeoAdminKind;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
  countryId: string;
  countrySlug: string;
  isoCountry: string;
  indexable: boolean;
  marketGroup?: GeoMarketGroup;
  hemisphere: GeoHemisphere;
  /** Existing storefront country landing, if any. */
  legacyCountryPath?: string;
  /** Existing /cities/{slug} pages that overlap this node. */
  legacyCityPaths: string[];
};

export const ADMIN_KIND_LABEL: Record<GeoAdminKind, string> = {
  country: "country",
  state: "state",
  union_territory: "union territory",
  territory: "territory",
  federal_district: "federal district",
  province: "province",
  prefecture: "prefecture",
  emirate: "emirate",
  constituent_country: "constituent country",
  region: "region",
  district: "district",
  land: "federal state (Land)",
  other_territory: "external territory",
  city: "city",
  area: "area",
};
