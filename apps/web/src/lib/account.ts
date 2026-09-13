import { api } from "./api";
import type { AccountAddress, AccountProfile } from "@spicycorner/shared";

export interface AccountData {
  profile: AccountProfile;
  addresses: AccountAddress[];
}

export async function fetchAccount(token: string, sessionId: string): Promise<AccountData> {
  return api<AccountData>("/account", { token, sessionId });
}

export async function updateAccountProfile(
  token: string,
  sessionId: string,
  data: { name?: string; phone?: string; preferredPaymentMethod?: "stripe" | "razorpay" }
): Promise<{ profile: AccountProfile }> {
  return api("/account/profile", {
    method: "PUT",
    token,
    sessionId,
    body: JSON.stringify(data),
  });
}

export async function createAccountAddress(
  token: string,
  sessionId: string,
  data: Omit<AccountAddress, "id">
): Promise<{ address: AccountAddress }> {
  return api("/account/addresses", {
    method: "POST",
    token,
    sessionId,
    body: JSON.stringify(data),
  });
}

export async function updateAccountAddress(
  token: string,
  sessionId: string,
  addressId: string,
  data: Partial<Omit<AccountAddress, "id">>
): Promise<{ address: AccountAddress }> {
  return api(`/account/addresses/${addressId}`, {
    method: "PUT",
    token,
    sessionId,
    body: JSON.stringify(data),
  });
}

export async function deleteAccountAddress(
  token: string,
  sessionId: string,
  addressId: string
): Promise<void> {
  await api(`/account/addresses/${addressId}`, {
    method: "DELETE",
    token,
    sessionId,
  });
}
