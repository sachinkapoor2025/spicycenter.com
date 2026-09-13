"use client";

import type { ShippingAddress } from "@spicycorner/shared";
import { LeadCaptureInput } from "@/components/LeadCaptureInput";
import { orderedCountryDialCodes } from "@/lib/country-codes";
import { US_STATES } from "@/lib/shipping-address";

const COUNTRIES = orderedCountryDialCodes();

export function withCountry(address: ShippingAddress, country: string): ShippingAddress {
  const iso = country.trim().toUpperCase().slice(0, 2);
  const next: ShippingAddress = { ...address, country: iso || address.country };
  if (iso !== "US" && US_STATES.some((s) => s.code === address.state)) {
    next.state = "";
  }
  return next;
}

export function CountrySelectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete="country"
        aria-label="Country"
        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent bg-white"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StateRegionField({
  country,
  value,
  onChange,
  compact = false,
}: {
  country: string;
  value: string;
  onChange: (state: string) => void;
  compact?: boolean;
}) {
  if (country === "US") {
    return (
      <div>
        <label className={`block font-medium text-slate-700 mb-1 ${compact ? "text-xs" : "text-sm"}`}>
          State
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="address-level1"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent bg-white text-sm"
        >
          <option value="">Select state</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <LeadCaptureInput
      label="State / region"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      autoComplete="address-level1"
      placeholder="State, province, or region"
    />
  );
}

export function postalCodeLabel(country: string): string {
  if (country === "US") return "ZIP code";
  if (country === "IN") return "PIN code";
  return "Postal code";
}
