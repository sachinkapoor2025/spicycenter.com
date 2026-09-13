import type { ShippingAddress } from "@spicycorner/shared";

const STORAGE_KEY = "hr_ecom_saved_addresses";

export interface SavedShippingAddress extends ShippingAddress {
  id: string;
  label: string;
  savedAt: string;
}

export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export function emptyShippingAddress(): ShippingAddress {
  return {
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
    email: "",
  };
}

export function loadSavedAddresses(): SavedShippingAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedShippingAddress[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedAddresses(addresses: SavedShippingAddress[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses.slice(0, 5)));
}

export function saveShippingAddress(address: ShippingAddress, label?: string): SavedShippingAddress {
  const existing = loadSavedAddresses();
  const duplicate = existing.find(
    (a) =>
      a.line1 === address.line1 &&
      a.city === address.city &&
      a.state === address.state &&
      a.postalCode === address.postalCode &&
      a.name === address.name
  );

  if (duplicate) {
    const updated: SavedShippingAddress = {
      ...duplicate,
      ...address,
      label: label || duplicate.label,
      savedAt: new Date().toISOString(),
    };
    const next = [updated, ...existing.filter((a) => a.id !== duplicate.id)];
    persistSavedAddresses(next);
    return updated;
  }

  const saved: SavedShippingAddress = {
    ...address,
    id: crypto.randomUUID(),
    label: label || address.name || "Saved address",
    savedAt: new Date().toISOString(),
  };
  persistSavedAddresses([saved, ...existing]);
  return saved;
}

export function deleteSavedAddress(id: string) {
  persistSavedAddresses(loadSavedAddresses().filter((a) => a.id !== id));
}

export function formatAddressLine(address: ShippingAddress): string {
  const parts = [address.line1, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean);
  return parts.join(", ");
}
