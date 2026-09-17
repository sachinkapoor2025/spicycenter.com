import { EUROPEAN_COUNTRY_CODES } from "./markets";
import {
  BULK_QUOTE_DISCLAIMER,
  BULK_QUOTE_DISCLAIMER_CA,
  BULK_QUOTE_DISCLAIMER_US,
} from "./agmarknet-commodities";
import {
  BULK_SHIPPING_ADVICE_CLOSER,
  type AddOnPricing,
  type BulkDestination,
  type BulkPricingSpice,
} from "../schemas/bulk-pricing";

export const BULK_DESTINATIONS: { id: BulkDestination; label: string; iso: string }[] = [
  { id: "UK", label: "United Kingdom", iso: "GB" },
  { id: "EU", label: "European Union", iso: "DE" },
  { id: "US", label: "United States", iso: "US" },
  { id: "CA", label: "Canada", iso: "CA" },
];

export type BulkDisplayCurrency = "GBP" | "EUR" | "USD" | "CAD";

export function bulkDestinationFromCountry(countryCode: string | undefined | null): BulkDestination | null {
  const code = (countryCode ?? "").trim().toUpperCase();
  if (code === "US") return "US";
  if (code === "CA") return "CA";
  if (code === "GB") return "UK";
  if ((EUROPEAN_COUNTRY_CODES as readonly string[]).includes(code)) return "EU";
  return null;
}

export function isoCountryForBulkDestination(destination: BulkDestination): string {
  return BULK_DESTINATIONS.find((d) => d.id === destination)?.iso ?? "GB";
}

export function bulkDisplayCurrency(destination: BulkDestination): BulkDisplayCurrency {
  if (destination === "UK") return "GBP";
  if (destination === "EU") return "EUR";
  if (destination === "CA") return "CAD";
  return "USD";
}

export function shippingRateInrPerKg(spice: BulkPricingSpice, destination: BulkDestination): number {
  if (destination === "UK") return spice.shipping_rate_inr_per_kg_uk;
  if (destination === "EU") return spice.shipping_rate_inr_per_kg_eu;
  if (destination === "CA") return spice.shipping_rate_inr_per_kg_ca ?? spice.shipping_rate_inr_per_kg_uk;
  return spice.shipping_rate_inr_per_kg_us ?? spice.shipping_rate_inr_per_kg_uk;
}

export function addOnFeesForDestination(addOns: AddOnPricing, destination: BulkDestination): {
  sample: number;
  documentation: number;
} {
  if (destination === "UK") {
    return { sample: addOns.sample_fee_gbp, documentation: addOns.documentation_handling_fee_gbp };
  }
  if (destination === "EU") {
    return { sample: addOns.sample_fee_eur, documentation: addOns.documentation_handling_fee_eur };
  }
  if (destination === "CA") {
    return {
      sample: addOns.sample_fee_cad ?? addOns.sample_fee_usd ?? addOns.sample_fee_gbp,
      documentation: addOns.documentation_handling_fee_cad ?? addOns.documentation_handling_fee_usd ?? addOns.documentation_handling_fee_gbp,
    };
  }
  return {
    sample: addOns.sample_fee_usd ?? addOns.sample_fee_gbp,
    documentation: addOns.documentation_handling_fee_usd ?? addOns.documentation_handling_fee_gbp,
  };
}

export function bulkQuoteDisclaimer(destination: BulkDestination): string {
  if (destination === "US") return BULK_QUOTE_DISCLAIMER_US;
  if (destination === "CA") return BULK_QUOTE_DISCLAIMER_CA;
  return BULK_QUOTE_DISCLAIMER;
}

export const BULK_SHIPPING_ADVICE_CLOSER_US =
  "All shipments include phytosanitary certification and fumigation as required for plant-derived exports under Indian regulations and US FDA / USDA-APHIS import rules. The importer remains responsible for FDA Prior Notice and US customs entry.";

export const BULK_SHIPPING_ADVICE_CLOSER_CA =
  "All shipments include phytosanitary certification and fumigation as required for plant-derived exports under Indian regulations and CFIA import rules. The importer remains responsible for Canadian customs entry.";

export function bulkShippingAdviceCloser(destination: BulkDestination): string {
  if (destination === "US") return BULK_SHIPPING_ADVICE_CLOSER_US;
  if (destination === "CA") return BULK_SHIPPING_ADVICE_CLOSER_CA;
  return BULK_SHIPPING_ADVICE_CLOSER;
}

export function isNorthAmericaBulk(destination: BulkDestination): boolean {
  return destination === "US" || destination === "CA";
}
