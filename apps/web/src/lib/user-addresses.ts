import type { AccountAddress } from "@spicycorner/shared";

function storageKey(userKey: string) {
  return `hr_ecom_account_addresses_${userKey}`;
}

export function loadUserAddresses(userKey: string): AccountAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AccountAddress[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistUserAddresses(userKey: string, addresses: AccountAddress[]) {
  localStorage.setItem(storageKey(userKey), JSON.stringify(addresses.slice(0, 10)));
}

export function upsertUserAddress(userKey: string, address: AccountAddress): AccountAddress[] {
  const existing = loadUserAddresses(userKey);
  const idx = existing.findIndex((a) => a.id === address.id);
  let next: AccountAddress[];

  if (address.isDefault) {
    next = existing.map((a) => ({ ...a, isDefault: false }));
  } else {
    next = [...existing];
  }

  if (idx >= 0) {
    next[idx] = address;
  } else {
    next = [address, ...next];
  }

  if (next.length === 1) next[0] = { ...next[0], isDefault: true };

  persistUserAddresses(userKey, next);
  return next.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export function removeUserAddress(userKey: string, id: string): AccountAddress[] {
  const existing = loadUserAddresses(userKey);
  const removed = existing.find((a) => a.id === id);
  let next = existing.filter((a) => a.id !== id);
  if (removed?.isDefault && next.length > 0) {
    next = next.map((a, i) => (i === 0 ? { ...a, isDefault: true } : a));
  }
  persistUserAddresses(userKey, next);
  return next;
}

export function setDefaultUserAddress(userKey: string, id: string): AccountAddress[] {
  const next = loadUserAddresses(userKey).map((a) => ({
    ...a,
    isDefault: a.id === id,
  }));
  persistUserAddresses(userKey, next);
  return next.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}
