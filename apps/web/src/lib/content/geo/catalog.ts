import type {
  GeoAdminKind,
  GeoHemisphere,
  GeoLocation,
  GeoMarketGroup,
} from "./types";
import { geoSlug } from "./slug";

const US_CITY_LEGACY = new Set([
  "california",
  "new-york",
  "texas",
  "florida",
  "new-jersey",
  "illinois",
  "pennsylvania",
  "ohio",
  "georgia",
  "arizona",
  "massachusetts",
  "michigan",
  "north-carolina",
  "virginia",
  "washington",
  "colorado",
]);

type CountrySeed = {
  name: string;
  slug: string;
  isoCountry: string;
  marketGroup: GeoMarketGroup;
  hemisphere?: GeoHemisphere;
  legacyCountryPath?: string;
  indexable?: boolean;
};

const nodes: GeoLocation[] = [];
const byId = new Map<string, GeoLocation>();
const byPath = new Map<string, GeoLocation>();

function push(loc: GeoLocation): GeoLocation {
  if (byId.has(loc.id)) throw new Error(`Duplicate geo id: ${loc.id}`);
  if (byPath.has(loc.path)) throw new Error(`Duplicate geo path: ${loc.path}`);
  nodes.push(loc);
  byId.set(loc.id, loc);
  byPath.set(loc.path, loc);
  return loc;
}

function addCountry(seed: CountrySeed): GeoLocation {
  return push({
    id: seed.slug,
    kind: "country",
    adminKind: "country",
    name: seed.name,
    slug: seed.slug,
    path: `/countries/${seed.slug}`,
    parentId: null,
    countryId: seed.slug,
    countrySlug: seed.slug,
    isoCountry: seed.isoCountry,
    indexable: seed.indexable ?? true,
    marketGroup: seed.marketGroup,
    hemisphere: seed.hemisphere ?? "north",
    legacyCountryPath: seed.legacyCountryPath,
    legacyCityPaths: [],
  });
}

function addChild(
  parent: GeoLocation,
  name: string,
  kind: GeoLocation["kind"],
  adminKind: GeoAdminKind,
  opts?: { slug?: string; indexable?: boolean }
): GeoLocation {
  const slug = geoSlug(name, opts?.slug);
  return push({
    id: `${parent.id}:${slug}`,
    kind,
    adminKind,
    name,
    slug,
    path: `${parent.path}/${slug}`,
    parentId: parent.id,
    countryId: parent.countryId,
    countrySlug: parent.countrySlug,
    isoCountry: parent.isoCountry,
    indexable: opts?.indexable ?? parent.indexable,
    marketGroup: parent.marketGroup,
    hemisphere: parent.hemisphere,
    legacyCityPaths:
      parent.countrySlug === "usa" && kind === "admin_region" && US_CITY_LEGACY.has(slug)
        ? [`/cities/${slug}`]
        : [],
  });
}

function admins(parent: GeoLocation, names: readonly string[], adminKind: GeoAdminKind): GeoLocation[] {
  return names.map((name) => addChild(parent, name, "admin_region", adminKind));
}

function city(
  parent: GeoLocation,
  name: string,
  opts?: { slug?: string; adminKind?: GeoAdminKind }
): GeoLocation {
  return addChild(parent, name, "city", opts?.adminKind ?? "city", { slug: opts?.slug });
}

/* ── India ── */
const india = addCountry({
  name: "India",
  slug: "india",
  isoCountry: "IN",
  marketGroup: "core",
  legacyCountryPath: "/countries/in",
});
const indiaStates = admins(india, [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
], "state");
admins(india, [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
], "union_territory");
const uttarPradesh = indiaStates.find((s) => s.slug === "uttar-pradesh")!;
city(uttarPradesh, "Noida");

/* ── United States ── */
const usa = addCountry({
  name: "United States",
  slug: "usa",
  isoCountry: "US",
  marketGroup: "core",
  legacyCountryPath: "/countries/us",
});
const usStates = admins(usa, [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
], "state");
addChild(usa, "District of Columbia", "admin_region", "federal_district");
admins(usa, [
  "Puerto Rico",
  "Guam",
  "American Samoa",
  "Northern Mariana Islands",
  "U.S. Virgin Islands",
], "territory");
const newYorkState = usStates.find((s) => s.slug === "new-york")!;
city(newYorkState, "New York City");

/* ── United Kingdom ── */
const uk = addCountry({
  name: "United Kingdom",
  slug: "uk",
  isoCountry: "GB",
  marketGroup: "core",
  legacyCountryPath: "/countries/uk",
});
const england = addChild(uk, "England", "admin_region", "constituent_country");
const scotland = addChild(uk, "Scotland", "admin_region", "constituent_country");
const wales = addChild(uk, "Wales", "admin_region", "constituent_country");
const ni = addChild(uk, "Northern Ireland", "admin_region", "constituent_country");
admins(england, [
  "North East",
  "North West",
  "Yorkshire and the Humber",
  "East Midlands",
  "West Midlands",
  "East of England",
  "London",
  "South East",
  "South West",
], "region");
city(england, "Manchester");
city(england, "Birmingham");
city(england, "Liverpool");
city(scotland, "Glasgow");
city(scotland, "Edinburgh");
city(wales, "Cardiff");
city(ni, "Belfast");

/* ── Canada ── */
const canada = addCountry({
  name: "Canada",
  slug: "canada",
  isoCountry: "CA",
  marketGroup: "core",
  legacyCountryPath: "/countries/ca",
});
const canadaProvinces = admins(canada, [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
], "province");
admins(canada, ["Northwest Territories", "Nunavut", "Yukon"], "territory");
city(canadaProvinces.find((p) => p.slug === "alberta")!, "Calgary");
city(canadaProvinces.find((p) => p.slug === "ontario")!, "Toronto");
city(canadaProvinces.find((p) => p.slug === "british-columbia")!, "Vancouver");
city(canadaProvinces.find((p) => p.slug === "quebec")!, "Montreal");

/* ── Australia ── */
const australia = addCountry({
  name: "Australia",
  slug: "australia",
  isoCountry: "AU",
  marketGroup: "core",
  hemisphere: "south",
  legacyCountryPath: "/countries/au",
});
const auStates = admins(australia, [
  "New South Wales",
  "Victoria",
  "Queensland",
  "South Australia",
  "Western Australia",
  "Tasmania",
], "state");
const auTerritories = admins(australia, ["Australian Capital Territory", "Northern Territory"], "territory");
for (const name of [
  "Christmas Island",
  "Cocos (Keeling) Islands",
  "Norfolk Island",
  "Jervis Bay Territory",
  "Ashmore and Cartier Islands",
  "Australian Antarctic Territory",
  "Coral Sea Islands Territory",
  "Heard Island and McDonald Islands Territory",
]) {
  addChild(australia, name, "admin_region", "other_territory", { indexable: false });
}
city(auStates.find((s) => s.slug === "new-south-wales")!, "Sydney");
city(auStates.find((s) => s.slug === "new-south-wales")!, "Newcastle");
city(auStates.find((s) => s.slug === "victoria")!, "Melbourne");
city(auStates.find((s) => s.slug === "queensland")!, "Brisbane");
city(auStates.find((s) => s.slug === "queensland")!, "Gold Coast");
city(auStates.find((s) => s.slug === "western-australia")!, "Perth");
city(auStates.find((s) => s.slug === "south-australia")!, "Adelaide");
city(auTerritories.find((s) => s.slug === "australian-capital-territory")!, "Canberra");
city(auStates.find((s) => s.slug === "tasmania")!, "Hobart");
city(auTerritories.find((s) => s.slug === "northern-territory")!, "Darwin");

/* ── Japan ── */
const japan = addCountry({
  name: "Japan",
  slug: "japan",
  isoCountry: "JP",
  marketGroup: "core",
});
const japanPrefs = admins(japan, [
  "Hokkaido",
  "Aomori",
  "Iwate",
  "Miyagi",
  "Akita",
  "Yamagata",
  "Fukushima",
  "Ibaraki",
  "Tochigi",
  "Gunma",
  "Saitama",
  "Chiba",
  "Tokyo",
  "Kanagawa",
  "Niigata",
  "Toyama",
  "Ishikawa",
  "Fukui",
  "Yamanashi",
  "Nagano",
  "Gifu",
  "Shizuoka",
  "Aichi",
  "Mie",
  "Shiga",
  "Kyoto",
  "Osaka",
  "Hyogo",
  "Nara",
  "Wakayama",
  "Tottori",
  "Shimane",
  "Okayama",
  "Hiroshima",
  "Yamaguchi",
  "Tokushima",
  "Kagawa",
  "Ehime",
  "Kochi",
  "Fukuoka",
  "Saga",
  "Nagasaki",
  "Kumamoto",
  "Oita",
  "Miyazaki",
  "Kagoshima",
  "Okinawa",
], "prefecture");
city(japanPrefs.find((p) => p.slug === "tokyo")!, "Shibuya", { adminKind: "area" });

/* ── Hong Kong ── */
const hongKong = addCountry({
  name: "Hong Kong",
  slug: "hong-kong",
  isoCountry: "HK",
  marketGroup: "core",
});
addChild(hongKong, "Hong Kong Island", "admin_region", "region");
addChild(hongKong, "Kowloon", "admin_region", "region");
addChild(hongKong, "New Territories", "admin_region", "region");
const centralWestern = addChild(hongKong, "Central and Western", "admin_region", "district");
addChild(hongKong, "Eastern", "admin_region", "district");
addChild(hongKong, "Southern", "admin_region", "district");
addChild(hongKong, "Wan Chai", "admin_region", "district");
addChild(hongKong, "Kowloon City", "admin_region", "district");
addChild(hongKong, "Kwun Tong", "admin_region", "district");
addChild(hongKong, "Sham Shui Po", "admin_region", "district");
addChild(hongKong, "Wong Tai Sin", "admin_region", "district");
const yauTsimMong = addChild(hongKong, "Yau Tsim Mong", "admin_region", "district");
addChild(hongKong, "Islands", "admin_region", "district");
addChild(hongKong, "Kwai Tsing", "admin_region", "district");
addChild(hongKong, "North", "admin_region", "district");
addChild(hongKong, "Sai Kung", "admin_region", "district");
addChild(hongKong, "Sha Tin", "admin_region", "district");
addChild(hongKong, "Tai Po", "admin_region", "district");
addChild(hongKong, "Tsuen Wan", "admin_region", "district");
addChild(hongKong, "Tuen Mun", "admin_region", "district");
addChild(hongKong, "Yuen Long", "admin_region", "district");
city(centralWestern, "Central", { adminKind: "area" });
city(yauTsimMong, "Tsim Sha Tsui", { adminKind: "area" });

/* ── UAE ── */
const uae = addCountry({
  name: "United Arab Emirates",
  slug: "uae",
  isoCountry: "AE",
  marketGroup: "core",
  legacyCountryPath: "/countries/ae",
});
const uaeEmirates = admins(uae, [
  "Abu Dhabi",
  "Ajman",
  "Dubai",
  "Fujairah",
  "Ras Al Khaimah",
  "Sharjah",
  "Umm Al Quwain",
], "emirate");
const dubai = uaeEmirates.find((e) => e.slug === "dubai")!;
city(dubai, "Dubai Marina", { adminKind: "area" });
city(dubai, "Downtown Dubai", { adminKind: "area" });
city(dubai, "Jumeirah", { adminKind: "area" });

/* ── EU countries ── */
const EU: CountrySeed[] = [
  { name: "Austria", slug: "austria", isoCountry: "AT", marketGroup: "eu" },
  { name: "Belgium", slug: "belgium", isoCountry: "BE", marketGroup: "eu", legacyCountryPath: "/countries/be" },
  { name: "Bulgaria", slug: "bulgaria", isoCountry: "BG", marketGroup: "eu" },
  { name: "Croatia", slug: "croatia", isoCountry: "HR", marketGroup: "eu" },
  { name: "Cyprus", slug: "cyprus", isoCountry: "CY", marketGroup: "eu" },
  { name: "Czechia", slug: "czechia", isoCountry: "CZ", marketGroup: "eu" },
  { name: "Denmark", slug: "denmark", isoCountry: "DK", marketGroup: "eu" },
  { name: "Estonia", slug: "estonia", isoCountry: "EE", marketGroup: "eu" },
  { name: "Finland", slug: "finland", isoCountry: "FI", marketGroup: "eu" },
  { name: "France", slug: "france", isoCountry: "FR", marketGroup: "eu", legacyCountryPath: "/countries/fr" },
  { name: "Germany", slug: "germany", isoCountry: "DE", marketGroup: "eu", legacyCountryPath: "/countries/de" },
  { name: "Greece", slug: "greece", isoCountry: "GR", marketGroup: "eu" },
  { name: "Hungary", slug: "hungary", isoCountry: "HU", marketGroup: "eu" },
  { name: "Ireland", slug: "ireland", isoCountry: "IE", marketGroup: "eu", legacyCountryPath: "/countries/ie" },
  { name: "Italy", slug: "italy", isoCountry: "IT", marketGroup: "eu", legacyCountryPath: "/countries/it" },
  { name: "Latvia", slug: "latvia", isoCountry: "LV", marketGroup: "eu" },
  { name: "Lithuania", slug: "lithuania", isoCountry: "LT", marketGroup: "eu" },
  { name: "Luxembourg", slug: "luxembourg", isoCountry: "LU", marketGroup: "eu" },
  { name: "Malta", slug: "malta", isoCountry: "MT", marketGroup: "eu" },
  { name: "Netherlands", slug: "netherlands", isoCountry: "NL", marketGroup: "eu", legacyCountryPath: "/countries/nl" },
  { name: "Poland", slug: "poland", isoCountry: "PL", marketGroup: "eu" },
  { name: "Portugal", slug: "portugal", isoCountry: "PT", marketGroup: "eu" },
  { name: "Romania", slug: "romania", isoCountry: "RO", marketGroup: "eu" },
  { name: "Slovakia", slug: "slovakia", isoCountry: "SK", marketGroup: "eu" },
  { name: "Slovenia", slug: "slovenia", isoCountry: "SI", marketGroup: "eu" },
  { name: "Spain", slug: "spain", isoCountry: "ES", marketGroup: "eu", legacyCountryPath: "/countries/es" },
  { name: "Sweden", slug: "sweden", isoCountry: "SE", marketGroup: "eu" },
];

const germany = EU.map(addCountry).find((c) => c.slug === "germany")!;
admins(germany, [
  "Baden-Württemberg",
  "Bavaria",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hesse",
  "Lower Saxony",
  "Mecklenburg-Vorpommern",
  "North Rhine-Westphalia",
  "Rhineland-Palatinate",
  "Saarland",
  "Saxony",
  "Saxony-Anhalt",
  "Schleswig-Holstein",
  "Thuringia",
], "land");

const EUROPE_OTHER: CountrySeed[] = [
  { name: "Switzerland", slug: "switzerland", isoCountry: "CH", marketGroup: "europe_other" },
  { name: "Norway", slug: "norway", isoCountry: "NO", marketGroup: "europe_other" },
  { name: "Iceland", slug: "iceland", isoCountry: "IS", marketGroup: "europe_other" },
  { name: "Liechtenstein", slug: "liechtenstein", isoCountry: "LI", marketGroup: "europe_other" },
  { name: "Serbia", slug: "serbia", isoCountry: "RS", marketGroup: "europe_other" },
  { name: "Montenegro", slug: "montenegro", isoCountry: "ME", marketGroup: "europe_other" },
  { name: "Albania", slug: "albania", isoCountry: "AL", marketGroup: "europe_other" },
  { name: "Bosnia and Herzegovina", slug: "bosnia-and-herzegovina", isoCountry: "BA", marketGroup: "europe_other" },
  { name: "North Macedonia", slug: "north-macedonia", isoCountry: "MK", marketGroup: "europe_other" },
  { name: "Kosovo", slug: "kosovo", isoCountry: "XK", marketGroup: "europe_other" },
  { name: "Moldova", slug: "moldova", isoCountry: "MD", marketGroup: "europe_other" },
  { name: "Ukraine", slug: "ukraine", isoCountry: "UA", marketGroup: "europe_other" },
  { name: "Belarus", slug: "belarus", isoCountry: "BY", marketGroup: "europe_other" },
  { name: "Russia", slug: "russia", isoCountry: "RU", marketGroup: "europe_other" },
  { name: "Turkey", slug: "turkey", isoCountry: "TR", marketGroup: "europe_other" },
  { name: "Andorra", slug: "andorra", isoCountry: "AD", marketGroup: "europe_other" },
  { name: "Monaco", slug: "monaco", isoCountry: "MC", marketGroup: "europe_other" },
  { name: "San Marino", slug: "san-marino", isoCountry: "SM", marketGroup: "europe_other" },
  { name: "Vatican City", slug: "vatican-city", isoCountry: "VA", marketGroup: "europe_other" },
];
EUROPE_OTHER.forEach(addCountry);

export const GEO_LOCATIONS: readonly GeoLocation[] = nodes;

export function getGeoById(id: string): GeoLocation | undefined {
  return byId.get(id);
}

export function getGeoByPath(path: string): GeoLocation | undefined {
  const normalized = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
  return byPath.get(normalized);
}

export function findGeoLocation(country: string, region?: string, city?: string): GeoLocation | undefined {
  if (!region) return byPath.get(`/spices/${country}`);
  if (!city) return byPath.get(`/spices/${country}/${region}`);
  return byPath.get(`/spices/${country}/${region}/${city}`);
}

export function getGeoChildren(id: string): GeoLocation[] {
  return nodes.filter((n) => n.parentId === id);
}

export function getGeoParent(loc: GeoLocation): GeoLocation | undefined {
  return loc.parentId ? byId.get(loc.parentId) : undefined;
}

export function getGeoSiblings(loc: GeoLocation): GeoLocation[] {
  if (!loc.parentId) {
    return nodes.filter((n) => n.kind === "country" && n.id !== loc.id);
  }
  return nodes.filter((n) => n.parentId === loc.parentId && n.id !== loc.id);
}

export function getGeoCountry(loc: GeoLocation): GeoLocation {
  return byId.get(loc.countryId) ?? loc;
}

export function geoCountries(): GeoLocation[] {
  return nodes.filter((n) => n.kind === "country");
}

export function spiceCountryParams(): { country: string }[] {
  return geoCountries().map((c) => ({ country: c.slug }));
}

export function spiceRegionParams(): { country: string; region: string }[] {
  return nodes
    .filter((n) => n.kind !== "country" && n.parentId === n.countryId)
    .map((n) => ({ country: n.countrySlug, region: n.slug }));
}

export function spiceCityParams(): { country: string; region: string; city: string }[] {
  return nodes
    .filter((n) => {
      const parent = n.parentId ? byId.get(n.parentId) : undefined;
      return Boolean(parent && parent.kind !== "country");
    })
    .map((n) => {
      const parent = byId.get(n.parentId!)!;
      return { country: n.countrySlug, region: parent.slug, city: n.slug };
    });
}

export function indexableGeoPaths(): string[] {
  return nodes.filter((n) => n.indexable).map((n) => n.path);
}

export function allGeoPaths(): string[] {
  return nodes.map((n) => n.path);
}

export function spicePathForLegacyCitySlug(slug: string): string | undefined {
  return byPath.get(`/spices/usa/${slug}`)?.path;
}

export function geoInventoryRows(): {
  location: string;
  kind: string;
  adminKind: string;
  country: string;
  path: string;
  indexable: boolean;
}[] {
  return nodes.map((n) => ({
    location: n.name,
    kind: n.kind,
    adminKind: n.adminKind,
    country: getGeoCountry(n).name,
    path: n.path,
    indexable: n.indexable,
  }));
}
