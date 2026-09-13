import {
  VENDOR_SPICYCORNER,
  VENDOR_ORANGE_COUNTY,
} from "../constants";
import type {
  FulfillmentSplit,
  InventoryListing,
  Market,
  MarketContact,
  OrderFulfillmentAssignment,
  VendorRecord,
  Warehouse,
} from "../schemas/markets";

/** European country codes we may serve from the UK warehouse (never a fake "EU" country). */
export const EUROPEAN_COUNTRY_CODES = [
  "GB",
  "IE",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "BE",
  "AT",
  "PT",
  "SE",
  "DK",
  "FI",
  "PL",
  "CZ",
] as const;

export const DEFAULT_MARKET_COUNTRY = "US";

export const WAREHOUSE_US_ID = "us-warehouse";
export const WAREHOUSE_UK_ID = "uk-warehouse";
export const WAREHOUSE_IN_ID = "in-warehouse";

export function normalizePhoneDigits(phone: string | undefined | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

export const DEFAULT_WAREHOUSES: Warehouse[] = [
  {
    warehouseId: WAREHOUSE_US_ID,
    warehouseCode: "US-SJ",
    name: "US Warehouse",
    vendorId: VENDOR_SPICYCORNER,
    addressLine1: "936 Bellhurst Ave",
    city: "San Jose",
    stateOrRegion: "California",
    postalCode: "95122",
    countryCode: "US",
    phone: "+1 (669) 236-1526",
    phoneNormalized: "16692361526",
    email: "support@spicycorner.com",
    timezone: "America/Los_Angeles",
    active: true,
    fulfillmentEnabled: true,
    pickupEnabled: false,
    priority: 10,
    serviceArea: {
      countryCodes: ["US"],
      stateOrRegionCodes: [],
      postalPrefixes: [],
      internationalShipping: true,
    },
  },
  {
    warehouseId: WAREHOUSE_UK_ID,
    warehouseCode: "UK-SOU",
    name: "UK Warehouse",
    vendorId: VENDOR_SPICYCORNER,
    addressLine1: "5 Exeter Road",
    city: "Southampton",
    stateOrRegion: "Hampshire",
    postalCode: "SO18 2ED",
    countryCode: "GB",
    phone: "7710647388",
    phoneNormalized: "7710647388",
    email: "",
    timezone: "Europe/London",
    active: true,
    fulfillmentEnabled: true,
    pickupEnabled: false,
    priority: 20,
    serviceArea: {
      countryCodes: [...EUROPEAN_COUNTRY_CODES],
      stateOrRegionCodes: [],
      postalPrefixes: [],
      internationalShipping: false,
    },
  },
  {
    warehouseId: WAREHOUSE_IN_ID,
    warehouseCode: "IN-FZR",
    name: "India Warehouse",
    vendorId: VENDOR_SPICYCORNER,
    addressLine1: "House No. 392",
    addressLine2: "Mohalla Sodian Wala",
    city: "Ferozepur City",
    stateOrRegion: "Punjab",
    postalCode: "152002",
    countryCode: "IN",
    phone: "+91 9266467887",
    phoneNormalized: "919266467887",
    email: "support@spicycorner.com",
    timezone: "Asia/Kolkata",
    active: true,
    fulfillmentEnabled: true,
    pickupEnabled: false,
    priority: 30,
    serviceArea: {
      countryCodes: ["IN"],
      stateOrRegionCodes: [],
      postalPrefixes: [],
      internationalShipping: false,
    },
  },
];

export const DEFAULT_VENDORS: VendorRecord[] = [
  {
    vendorId: VENDOR_SPICYCORNER,
    slug: VENDOR_SPICYCORNER,
    name: "SpicyCorner",
    countryCode: "US",
    companyOwned: true,
    active: true,
    warehouseIds: [WAREHOUSE_US_ID, WAREHOUSE_UK_ID, WAREHOUSE_IN_ID],
    userEmails: [],
    users: [],
    contactEmail: "support@spicycorner.com",
    contactPhone: "+1 (669) 236-1526",
    priority: 10,
  },
  {
    vendorId: VENDOR_ORANGE_COUNTY,
    slug: VENDOR_ORANGE_COUNTY,
    name: "Orange County",
    countryCode: "US",
    companyOwned: false,
    active: true,
    warehouseIds: [WAREHOUSE_US_ID],
    userEmails: [],
    users: [],
    contactEmail: "",
    contactPhone: "",
    notes: "Existing US hamper fulfillment partner. Isolated via vendorSlug on orders.",
    priority: 20,
  },
];

function contactFromWarehouse(wh: Warehouse, extras: Partial<MarketContact> = {}): MarketContact {
  return {
    phone: wh.phone,
    phoneNormalized: wh.phoneNormalized ?? normalizePhoneDigits(wh.phone),
    email: wh.email ?? "",
    addressLine1: wh.addressLine1,
    addressLine2: wh.addressLine2 ?? "",
    city: wh.city,
    stateOrRegion: wh.stateOrRegion,
    postalCode: wh.postalCode,
    countryCode: wh.countryCode,
    ...extras,
  };
}

const usWh = DEFAULT_WAREHOUSES[0]!;
const ukWh = DEFAULT_WAREHOUSES[1]!;
const inWh = DEFAULT_WAREHOUSES[2]!;

export const DEFAULT_MARKETS: Market[] = [
  {
    countryCode: "US",
    name: "United States",
    slug: "us",
    active: true,
    locale: "en-US",
    currency: "USD",
    checkoutCurrency: "USD",
    flagEmoji: "🇺🇸",
    postalLabel: "ZIP code",
    defaultWarehouseId: WAREHOUSE_US_ID,
    allowInternationalFallback: false,
    contact: {
      ...contactFromWarehouse(usWh),
      whatsapp: "16692603819",
    },
    hreflang: "en-US",
  },
  {
    countryCode: "GB",
    name: "United Kingdom",
    slug: "uk",
    active: true,
    locale: "en-GB",
    currency: "GBP",
    checkoutCurrency: "USD",
    flagEmoji: "🇬🇧",
    postalLabel: "Postcode",
    defaultWarehouseId: WAREHOUSE_UK_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(ukWh),
    hreflang: "en-GB",
  },
  {
    countryCode: "CA",
    name: "Canada",
    slug: "ca",
    active: true,
    locale: "en-CA",
    currency: "CAD",
    checkoutCurrency: "USD",
    flagEmoji: "🇨🇦",
    postalLabel: "Postal code",
    defaultWarehouseId: WAREHOUSE_US_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(usWh, { countryCode: "CA" }),
    hreflang: "en-CA",
  },
  {
    countryCode: "AU",
    name: "Australia",
    slug: "au",
    active: true,
    locale: "en-AU",
    currency: "AUD",
    checkoutCurrency: "USD",
    flagEmoji: "🇦🇺",
    postalLabel: "Postcode",
    defaultWarehouseId: WAREHOUSE_US_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(usWh, { countryCode: "AU" }),
    hreflang: "en-AU",
  },
  {
    countryCode: "IN",
    name: "India",
    slug: "in",
    active: true,
    locale: "en-IN",
    currency: "INR",
    checkoutCurrency: "INR",
    flagEmoji: "🇮🇳",
    postalLabel: "PIN code",
    defaultWarehouseId: WAREHOUSE_IN_ID,
    allowInternationalFallback: false,
    contact: {
      ...contactFromWarehouse(inWh),
      whatsapp: "919266467887",
    },
    hreflang: "en-IN",
  },
  {
    countryCode: "AE",
    name: "United Arab Emirates",
    slug: "ae",
    active: true,
    locale: "en-AE",
    currency: "AED",
    checkoutCurrency: "USD",
    flagEmoji: "🇦🇪",
    postalLabel: "Postal code",
    defaultWarehouseId: WAREHOUSE_US_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(usWh, { countryCode: "AE" }),
    hreflang: "en-AE",
  },
  {
    countryCode: "DE",
    name: "Germany",
    slug: "de",
    active: true,
    locale: "en-DE",
    currency: "EUR",
    checkoutCurrency: "USD",
    flagEmoji: "🇩🇪",
    postalLabel: "Postcode",
    defaultWarehouseId: WAREHOUSE_UK_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(ukWh, { countryCode: "DE" }),
    hreflang: "de-DE",
  },
  {
    countryCode: "FR",
    name: "France",
    slug: "fr",
    active: true,
    locale: "en-FR",
    currency: "EUR",
    checkoutCurrency: "USD",
    flagEmoji: "🇫🇷",
    postalLabel: "Code postal",
    defaultWarehouseId: WAREHOUSE_UK_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(ukWh, { countryCode: "FR" }),
    hreflang: "fr-FR",
  },
  {
    countryCode: "ES",
    name: "Spain",
    slug: "es",
    active: true,
    locale: "en-ES",
    currency: "EUR",
    checkoutCurrency: "USD",
    flagEmoji: "🇪🇸",
    postalLabel: "Código postal",
    defaultWarehouseId: WAREHOUSE_UK_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(ukWh, { countryCode: "ES" }),
    hreflang: "es-ES",
  },
  {
    countryCode: "IT",
    name: "Italy",
    slug: "it",
    active: true,
    locale: "en-IT",
    currency: "EUR",
    checkoutCurrency: "USD",
    flagEmoji: "🇮🇹",
    postalLabel: "CAP",
    defaultWarehouseId: WAREHOUSE_UK_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(ukWh, { countryCode: "IT" }),
    hreflang: "it-IT",
  },
  {
    countryCode: "NL",
    name: "Netherlands",
    slug: "nl",
    active: true,
    locale: "en-NL",
    currency: "EUR",
    checkoutCurrency: "USD",
    flagEmoji: "🇳🇱",
    postalLabel: "Postcode",
    defaultWarehouseId: WAREHOUSE_UK_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(ukWh, { countryCode: "NL" }),
    hreflang: "nl-NL",
  },
  {
    countryCode: "IE",
    name: "Ireland",
    slug: "ie",
    active: true,
    locale: "en-IE",
    currency: "EUR",
    checkoutCurrency: "USD",
    flagEmoji: "🇮🇪",
    postalLabel: "Eircode",
    defaultWarehouseId: WAREHOUSE_UK_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(ukWh, { countryCode: "IE" }),
    hreflang: "en-IE",
  },
  {
    countryCode: "BE",
    name: "Belgium",
    slug: "be",
    active: true,
    locale: "en-BE",
    currency: "EUR",
    checkoutCurrency: "USD",
    flagEmoji: "🇧🇪",
    postalLabel: "Postcode",
    defaultWarehouseId: WAREHOUSE_UK_ID,
    allowInternationalFallback: true,
    contact: contactFromWarehouse(ukWh, { countryCode: "BE" }),
    hreflang: "nl-BE",
  },
];

const UK_POSTCODE =
  /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const CA_POSTCODE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

export function validatePostalCode(
  countryCode: string,
  postalCode: string | undefined | null
): { valid: boolean; normalized: string; message?: string } {
  const country = countryCode.trim().toUpperCase();
  const raw = (postalCode ?? "").trim();
  if (!raw) {
    return { valid: false, normalized: "", message: "Enter a postal / ZIP code to confirm delivery." };
  }

  if (country === "US") {
    const ok = /^\d{5}(?:-\d{4})?$/.test(raw);
    return {
      valid: ok,
      normalized: raw,
      message: ok ? undefined : "Enter a 5-digit US ZIP code (optional +4).",
    };
  }
  if (country === "GB") {
    const normalized = raw.toUpperCase().replace(/\s+/g, " ");
    const ok = UK_POSTCODE.test(normalized);
    return {
      valid: ok,
      normalized,
      message: ok ? undefined : "Enter a valid UK postcode (e.g. SO18 2ED).",
    };
  }
  if (country === "CA") {
    const normalized = raw.toUpperCase().replace(/\s+/g, " ");
    const ok = CA_POSTCODE.test(normalized);
    return {
      valid: ok,
      normalized,
      message: ok ? undefined : "Enter a valid Canadian postal code (e.g. M5V 2T6).",
    };
  }
  if (country === "IN") {
    const ok = /^\d{6}$/.test(raw);
    return {
      valid: ok,
      normalized: raw,
      message: ok ? undefined : "Enter a 6-digit Indian PIN code.",
    };
  }
  if (country === "AU") {
    const ok = /^\d{4}$/.test(raw);
    return {
      valid: ok,
      normalized: raw,
      message: ok ? undefined : "Enter a 4-digit Australian postcode.",
    };
  }
  if (country === "AE") {
    return { valid: true, normalized: raw };
  }
  if (EUROPEAN_COUNTRY_CODES.includes(country as (typeof EUROPEAN_COUNTRY_CODES)[number])) {
    const ok = /^[A-Z0-9][A-Z0-9\s-]{2,10}$/i.test(raw);
    return {
      valid: ok,
      normalized: raw.toUpperCase(),
      message: ok ? undefined : "Enter a valid postal code for this country.",
    };
  }
  return { valid: raw.length >= 3, normalized: raw };
}

export function warehouseServesCountry(warehouse: Warehouse, countryCode: string): boolean {
  if (!warehouse.active || !warehouse.fulfillmentEnabled) return false;
  const country = countryCode.trim().toUpperCase();
  const area = warehouse.serviceArea;
  if (area.countryCodes.includes(country)) return true;
  if (area.internationalShipping && warehouse.countryCode !== country) return true;
  return false;
}

export function warehouseServesPostal(
  warehouse: Warehouse,
  countryCode: string,
  postalCode?: string
): boolean {
  if (!warehouseServesCountry(warehouse, countryCode)) return false;
  const prefixes = warehouse.serviceArea.postalPrefixes;
  if (!prefixes.length) return true;
  const postal = (postalCode ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!postal) return true;
  return prefixes.some((p) => postal.startsWith(p.trim().toUpperCase().replace(/\s+/g, "")));
}

export function eligibleWarehouses(opts: {
  warehouses: Warehouse[];
  countryCode: string;
  postalCode?: string;
  vendorId?: string | null;
}): Warehouse[] {
  const { warehouses, countryCode, postalCode, vendorId } = opts;
  return warehouses
    .filter((w) => {
      if (vendorId && w.vendorId && w.vendorId !== vendorId) return false;
      return warehouseServesPostal(w, countryCode, postalCode);
    })
    .sort((a, b) => {
      const aSame = a.countryCode === countryCode.trim().toUpperCase() ? 0 : 1;
      const bSame = b.countryCode === countryCode.trim().toUpperCase() ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      return a.priority - b.priority;
    });
}

function vendorForItem(
  vendors: VendorRecord[],
  vendorSlug?: string | null
): VendorRecord | undefined {
  const slug = (vendorSlug ?? "").trim() || VENDOR_SPICYCORNER;
  return vendors.find((v) => v.slug === slug || v.vendorId === slug);
}

export function estimateDeliveryDays(warehouse: Warehouse, countryCode: string): number {
  const country = countryCode.trim().toUpperCase();
  if (warehouse.countryCode === country) return warehouse.countryCode === "US" ? 4 : 3;
  if (EUROPEAN_COUNTRY_CODES.includes(country as (typeof EUROPEAN_COUNTRY_CODES)[number])) {
    return warehouse.countryCode === "GB" ? 5 : 8;
  }
  if (country === "CA") return 6;
  if (country === "AU" || country === "AE") return 10;
  return 12;
}

export function assignFulfillment(opts: {
  items: Array<{ productSlug: string; vendorSlug?: string | null }>;
  destinationCountry: string;
  postalCode?: string;
  warehouses: Warehouse[];
  vendors: VendorRecord[];
  listings?: InventoryListing[];
}): OrderFulfillmentAssignment {
  const country = opts.destinationCountry.trim().toUpperCase() || DEFAULT_MARKET_COUNTRY;
  const splitsByKey = new Map<string, FulfillmentSplit>();

  for (const item of opts.items) {
    const vendor = vendorForItem(opts.vendors, item.vendorSlug);
    const vendorId = vendor?.vendorId ?? VENDOR_SPICYCORNER;
    const listing = opts.listings?.find(
      (l) =>
        l.active &&
        l.productSlug === item.productSlug &&
        l.vendorId === vendorId &&
        l.countryCode === country &&
        l.quantityAvailable > l.quantityReserved
    );

    const vendorWarehouses = opts.warehouses.filter((w) => {
      if (listing && listing.warehouseId === w.warehouseId) return true;
      if (!vendor) return true;
      if (!vendor.warehouseIds.length) return !w.vendorId || w.vendorId === vendorId;
      return vendor.warehouseIds.includes(w.warehouseId);
    });

    const eligible = eligibleWarehouses({
      warehouses: listing
        ? opts.warehouses.filter((w) => w.warehouseId === listing.warehouseId)
        : vendorWarehouses,
      countryCode: country,
      postalCode: opts.postalCode,
    });

    const warehouse = eligible[0] ?? opts.warehouses.find((w) => w.warehouseId === WAREHOUSE_US_ID);

    if (!warehouse) continue;

    const sameCountry = warehouse.countryCode === country;
    const routingReason = listing
      ? "vendor_listing"
      : sameCountry
        ? "same_country_inventory"
        : warehouse.serviceArea.internationalShipping
          ? "international_fallback"
          : "nearest_eligible_warehouse";

    const key = `${vendorId}::${warehouse.warehouseId}`;
    const existing = splitsByKey.get(key);
    if (existing) {
      if (!existing.productSlugs.includes(item.productSlug)) {
        existing.productSlugs.push(item.productSlug);
      }
      continue;
    }
    splitsByKey.set(key, {
      vendorId,
      warehouseId: warehouse.warehouseId,
      productSlugs: [item.productSlug],
      fulfillmentCountry: warehouse.countryCode,
      routingReason,
      estimatedDeliveryDays: estimateDeliveryDays(warehouse, country),
    });
  }

  const splits = Array.from(splitsByKey.values());
  const primary = splits[0];
  return {
    assignedVendorId: primary?.vendorId,
    assignedWarehouseId: primary?.warehouseId,
    fulfillmentCountry: country,
    routingReason: splits.length > 1 ? "split_multi_vendor" : primary?.routingReason,
    splits,
  };
}

export function productAvailableInCountry(opts: {
  availableCountryCodes?: string[] | null;
  listings?: InventoryListing[];
  productSlug: string;
  countryCode: string;
}): boolean {
  const country = opts.countryCode.trim().toUpperCase();
  const listed = (opts.availableCountryCodes ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (listed.length) return listed.includes(country);
  const productListings = (opts.listings ?? []).filter((l) => l.productSlug === opts.productSlug && l.active);
  if (productListings.length) {
    return productListings.some((l) => l.countryCode === country && l.quantityAvailable > l.quantityReserved);
  }
  return true;
}

export function publicMarketContact(market: Market): MarketContact {
  return { ...market.contact, countryCode: market.contact.countryCode ?? market.countryCode };
}

export function marketByCountry(markets: Market[], countryCode: string): Market | undefined {
  const code = countryCode.trim().toUpperCase();
  return markets.find((m) => m.countryCode === code);
}

export function marketBySlug(markets: Market[], slug: string): Market | undefined {
  const s = slug.trim().toLowerCase();
  return markets.find((m) => m.slug === s);
}

export function checkoutCurrencyForMarket(market: Market | undefined): "USD" | "INR" {
  if (market?.checkoutCurrency === "INR") return "INR";
  return "USD";
}
