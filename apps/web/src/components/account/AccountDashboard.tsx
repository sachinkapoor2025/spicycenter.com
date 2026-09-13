"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { fetchAccount } from "@/lib/account";
import { loadUserAddresses } from "@/lib/user-addresses";
import { useSessionId } from "@/lib/session";
import type { AccountAddress, AccountProfile, Order } from "@spicycorner/shared";
import type { AuthUser } from "@/lib/cognito";
import { AccountNav, type AccountTab } from "./AccountNav";
import { AccountOrdersPanel } from "./AccountOrdersPanel";
import { AccountAddressesPanel } from "./AccountAddressesPanel";
import { AccountPaymentsPanel } from "./AccountPaymentsPanel";
import { AccountDetailsPanel } from "./AccountDetailsPanel";

const VALID_TABS: AccountTab[] = ["orders", "addresses", "payments", "details"];

function parseTab(value: string | null): AccountTab {
  if (value && VALID_TABS.includes(value as AccountTab)) return value as AccountTab;
  return "orders";
}

export function AccountDashboard({
  user,
  token,
  isAdmin,
  onLogout,
}: {
  user: AuthUser;
  token: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = useSessionId();
  const [tab, setTab] = useState<AccountTab>(() => parseTab(searchParams.get("tab")));

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accountLoading, setAccountLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [accountError, setAccountError] = useState("");

  const fallbackProfile = useCallback((): AccountProfile => {
    const ts = new Date().toISOString();
    return {
      userId: user.email,
      email: user.email,
      name: user.name,
      createdAt: ts,
      updatedAt: ts,
    };
  }, [user.email, user.name]);

  const loadAccount = useCallback(async () => {
    if (!sessionId) return;
    setAccountLoading(true);
    setAccountError("");
    try {
      const data = await fetchAccount(token, sessionId);
      setProfile(data.profile);
      setAddresses(data.addresses);
    } catch (err) {
      setProfile(fallbackProfile());
      setAddresses(loadUserAddresses(user.email));
      setAccountError(err instanceof Error ? err.message : "Could not load account data");
    } finally {
      setAccountLoading(false);
    }
  }, [token, sessionId, fallbackProfile, user.email]);

  const loadOrders = useCallback(async () => {
    if (!sessionId) return;
    setOrdersLoading(true);
    try {
      const data = await api<{ orders: Order[] }>("/orders", { sessionId, token });
      setOrders(
        [...data.orders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [token, sessionId]);

  useEffect(() => {
    void loadAccount();
    void loadOrders();
  }, [loadAccount, loadOrders]);

  useEffect(() => {
    setTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const changeTab = (next: AccountTab) => {
    setTab(next);
    router.replace(`/account?tab=${next}`, { scroll: false });
  };

  const profileData = profile ?? fallbackProfile();

  return (
    <div className="bg-slate-50 min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-violet-800 text-white px-6 py-8 sm:px-10 sm:py-10 mb-6 shadow-md text-center sm:text-left">
          <p className="text-lg sm:text-xl font-medium leading-relaxed max-w-3xl mx-auto sm:mx-0">
            Welcome back to your account. Manage orders, addresses and profile details easily.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">My Account</h1>
              <p className="text-sm text-slate-500 mt-1">Signed in as {user.email}</p>
            </div>
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="text-sm font-medium text-nav hover:underline"
              >
                Admin portal
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:text-red-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
              </svg>
              Logout
            </button>
          </div>
          </div>

        <AccountNav active={tab} onChange={changeTab} />

        {accountError && (
          <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {accountError}. Some account features may be limited until the API is available.
          </p>
        )}

        <div className="mt-6">
          {tab === "orders" && <AccountOrdersPanel orders={orders} loading={ordersLoading} />}

          {tab === "addresses" &&
            (accountLoading ? (
              <p className="text-slate-500 text-sm py-6">Loading addresses...</p>
            ) : (
              <AccountAddressesPanel
                addresses={addresses}
                token={token}
                sessionId={sessionId!}
                userEmail={user.email}
                offlineMode={!!accountError}
                onRefresh={loadAccount}
                onAddressesChange={setAddresses}
              />
            ))}

          {tab === "payments" &&
            (accountLoading ? (
              <p className="text-slate-500 text-sm py-6">Loading payment settings...</p>
            ) : (
              <AccountPaymentsPanel
                profile={profileData}
                orders={orders}
                token={token}
                sessionId={sessionId!}
                onRefresh={loadAccount}
              />
            ))}

          {tab === "details" &&
            (accountLoading ? (
              <p className="text-slate-500 text-sm py-6">Loading account details...</p>
            ) : (
              <AccountDetailsPanel
                profile={profileData}
                email={user.email}
                token={token}
                sessionId={sessionId!}
                onRefresh={loadAccount}
              />
            ))}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
            </svg>
            Log out of your account
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
