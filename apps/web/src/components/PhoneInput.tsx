"use client";

import {
  formatE164,
  orderedCountryDialCodes,
} from "@/lib/country-codes";

const COUNTRIES = orderedCountryDialCodes();

interface PhoneInputProps {
  label?: string;
  countryIso: string;
  localNumber: string;
  onCountryChange: (iso: string) => void;
  onLocalNumberChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Show only dial codes (e.g. +91); ISO added when dial is shared (+1 US / +1 CA). */
  compact?: boolean;
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
}

function optionLabel(c: (typeof COUNTRIES)[number], compact: boolean): string {
  // Compact = dial codes only (no country names). Disambiguate shared dials with ISO.
  if (compact) {
    const shared = COUNTRIES.some((other) => other.iso !== c.iso && other.dial === c.dial);
    return shared ? `${c.dial} ${c.iso}` : c.dial;
  }
  return `${c.dial} ${c.name}`;
}

export function PhoneInput({
  label = "Phone",
  countryIso,
  localNumber,
  onCountryChange,
  onLocalNumberChange,
  required = false,
  disabled = false,
  compact = false,
  placeholder = "Phone number",
  className = "",
  selectClassName = "",
  inputClassName = "",
}: PhoneInputProps) {
  const selected = COUNTRIES.find((c) => c.iso === countryIso) ?? COUNTRIES[0];

  return (
    <div className={className}>
      {label ? <label className="block text-sm font-medium mb-1">{label}</label> : null}
      <div className="flex gap-2">
        <select
          value={selected.iso}
          onChange={(e) => onCountryChange(e.target.value)}
          aria-label="Country code"
          disabled={disabled}
          title={selected ? `${selected.dial} ${selected.name}` : "Country code"}
          className={`${
            compact ? "w-[4.75rem]" : "w-[min(100%,11rem)]"
          } shrink-0 border border-slate-300 rounded-lg px-1.5 py-2 text-sm bg-white disabled:opacity-60 ${selectClassName}`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso} title={`${c.dial} ${c.name}`}>
              {optionLabel(c, compact)}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={localNumber}
          onChange={(e) => onLocalNumberChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 disabled:opacity-60 ${inputClassName}`}
        />
      </div>
    </div>
  );
}

export function buildPhoneValue(countryIso: string, localNumber: string): string {
  const country = COUNTRIES.find((c) => c.iso === countryIso);
  if (!country) return formatE164("+91", localNumber);
  return formatE164(country.dial, localNumber);
}
