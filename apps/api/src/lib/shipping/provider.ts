import type { ShippingSettings } from "@spicycorner/shared";
import { createUSPSProvider } from "./usps";
import type { ShippingProvider } from "./types";
import { loadShippingSettings } from "./settings";

/** Factory — Shippo provider can be added here when needed. */
export async function getShippingProvider(
  settings?: ShippingSettings
): Promise<ShippingProvider> {
  const resolved = settings ?? (await loadShippingSettings());

  if (resolved.provider === "shippo") {
    throw new Error("Shippo provider is not implemented yet. Set provider to usps.");
  }

  return createUSPSProvider(resolved);
}
