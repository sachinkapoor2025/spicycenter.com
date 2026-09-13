"use client";

import type { ShippingAddress } from "@spicycorner/shared";
import { LeadCaptureInput } from "@/components/LeadCaptureInput";
import {
  CountrySelectField,
  StateRegionField,
  postalCodeLabel,
  withCountry,
} from "@/components/CountryStateFields";

export function AddressFormFields({
  value,
  onChange,
}: {
  value: ShippingAddress;
  onChange: (value: ShippingAddress) => void;
}) {
  const update = (field: keyof ShippingAddress, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <LeadCaptureInput
        label="Your name"
        value={value.name}
        onChange={(e) => update("name", e.target.value)}
        required
        autoComplete="name"
      />
      <LeadCaptureInput
        label="Email"
        type="email"
        value={value.email}
        onChange={(e) => update("email", e.target.value)}
        required
        autoComplete="email"
      />
      <LeadCaptureInput
        label="Phone (optional)"
        type="tel"
        value={value.phone ?? ""}
        onChange={(e) => update("phone", e.target.value)}
        autoComplete="tel"
      />
      <LeadCaptureInput
        label="Street address"
        value={value.line1}
        onChange={(e) => update("line1", e.target.value)}
        required
        autoComplete="address-line1"
      />
      <LeadCaptureInput
        label="Apartment, suite, etc. (optional)"
        value={value.line2 ?? ""}
        onChange={(e) => update("line2", e.target.value)}
        autoComplete="address-line2"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <LeadCaptureInput
          label="City"
          value={value.city}
          onChange={(e) => update("city", e.target.value)}
          required
          autoComplete="address-level2"
        />
        <StateRegionField
          country={value.country}
          value={value.state}
          onChange={(state) => update("state", state)}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <LeadCaptureInput
          label={postalCodeLabel(value.country)}
          value={value.postalCode}
          onChange={(e) => update("postalCode", e.target.value)}
          required
          autoComplete="postal-code"
        />
        <CountrySelectField
          value={value.country}
          onChange={(iso) => onChange(withCountry(value, iso))}
        />
      </div>
    </div>
  );
}
