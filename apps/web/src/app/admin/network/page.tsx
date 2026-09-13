"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApiClient, useAuth } from "@/lib/auth-context";
import type { InventoryListing, Market, VendorRecord, Warehouse } from "@spicycorner/shared";

type Tab = "vendors" | "warehouses" | "markets" | "inventory";

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function NetworkAdminInner() {
  const api = useApiClient();
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "warehouses";
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [listings, setListings] = useState<InventoryListing[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [w, v, inv] = await Promise.all([
        api<{ warehouses: Warehouse[] }>("/admin/warehouses"),
        api<{ vendors: VendorRecord[] }>("/admin/vendors"),
        api<{ listings: InventoryListing[] }>("/admin/inventory-listings"),
      ]);
      setWarehouses(w.warehouses);
      setVendors(v.vendors);
      setListings(inv.listings);
      if (isAdmin) {
        const m = await api<{ markets: Market[] }>("/admin/markets");
        setMarkets(m.markets);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load network data");
    }
  }, [api, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: "warehouses", label: "Warehouses" },
    { id: "vendors", label: "Vendors" },
    { id: "markets", label: "Markets", adminOnly: true },
    { id: "inventory", label: "Inventory" },
  ];

  const saveWarehouse = async (wh: Warehouse) => {
    setSaving(true);
    setMessage("");
    try {
      await api(`/admin/warehouses/${wh.warehouseId}`, { method: "PUT", body: JSON.stringify(wh) });
      setMessage("Warehouse saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveVendor = async (vendor: VendorRecord) => {
    setSaving(true);
    setMessage("");
    try {
      await api(`/admin/vendors/${vendor.vendorId}`, { method: "PUT", body: JSON.stringify(vendor) });
      setMessage("Vendor saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveMarket = async (market: Market) => {
    setSaving(true);
    setMessage("");
    try {
      await api(`/admin/markets/${market.countryCode}`, { method: "PUT", body: JSON.stringify(market) });
      setMessage("Market saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addWarehouse = async () => {
    const code = window.prompt("Warehouse code (e.g. UK-LON)");
    if (!code) return;
    try {
      await api("/admin/warehouses", {
        method: "POST",
        body: JSON.stringify({
          warehouseCode: code,
          name: code,
          addressLine1: "TBD",
          city: "TBD",
          stateOrRegion: "TBD",
          postalCode: "00000",
          countryCode: "US",
          phone: "TBD",
          timezone: "UTC",
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const addVendor = async () => {
    const slug = window.prompt("Vendor slug (e.g. uk-vendor-a)");
    if (!slug) return;
    try {
      await api("/admin/vendors", {
        method: "POST",
        body: JSON.stringify({
          slug,
          name: slug,
          countryCode: "GB",
          warehouseIds: [],
          userEmails: [],
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const visibleTabs = useMemo(() => tabs.filter((t) => !t.adminOnly || isAdmin), [isAdmin]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Global network</h1>
      <p className="text-sm text-slate-600 mt-1 mb-6">
        Manage warehouses, vendors, country markets, and per-warehouse inventory. Vendor users only see their own
        data. Super admin sees everything.
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {visibleTabs.map((t) => (
          <a
            key={t.id}
            href={`/admin/network?tab=${t.id}`}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              tab === t.id ? "bg-nav text-white border-nav" : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {message && <p className="text-sm text-emerald-700 mb-3">{message}</p>}

      {tab === "warehouses" && (
        <div className="space-y-4">
          {isAdmin && (
            <button type="button" onClick={() => void addWarehouse()} className="rounded-lg bg-nav px-3 py-2 text-sm font-semibold text-white">
              Add warehouse
            </button>
          )}
          {warehouses.map((wh) => (
            <form
              key={wh.warehouseId}
              className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveWarehouse(wh);
              }}
            >
              <p className="sm:col-span-2 font-semibold">
                {wh.name} <span className="text-xs text-slate-400">{wh.warehouseCode}</span>
              </p>
              <Field label="Name" value={wh.name} onChange={(v) => setWarehouses((all) => all.map((w) => (w.warehouseId === wh.warehouseId ? { ...w, name: v } : w)))} />
              <Field label="Phone (stored exactly)" value={wh.phone} onChange={(v) => setWarehouses((all) => all.map((w) => (w.warehouseId === wh.warehouseId ? { ...w, phone: v } : w)))} />
              <Field label="Email (UK can be blank until provided)" value={wh.email ?? ""} onChange={(v) => setWarehouses((all) => all.map((w) => (w.warehouseId === wh.warehouseId ? { ...w, email: v } : w)))} />
              <Field label="Address" value={wh.addressLine1} onChange={(v) => setWarehouses((all) => all.map((w) => (w.warehouseId === wh.warehouseId ? { ...w, addressLine1: v } : w)))} />
              <Field label="City" value={wh.city} onChange={(v) => setWarehouses((all) => all.map((w) => (w.warehouseId === wh.warehouseId ? { ...w, city: v } : w)))} />
              <Field label="Postal code" value={wh.postalCode} onChange={(v) => setWarehouses((all) => all.map((w) => (w.warehouseId === wh.warehouseId ? { ...w, postalCode: v } : w)))} />
              <Field label="Country" value={wh.countryCode} onChange={(v) => setWarehouses((all) => all.map((w) => (w.warehouseId === wh.warehouseId ? { ...w, countryCode: v.toUpperCase() } : w)))} />
              <Field
                label="Serves countries (comma)"
                value={wh.serviceArea.countryCodes.join(",")}
                onChange={(v) =>
                  setWarehouses((all) =>
                    all.map((w) =>
                      w.warehouseId === wh.warehouseId
                        ? {
                            ...w,
                            serviceArea: {
                              ...w.serviceArea,
                              countryCodes: v.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
                            },
                          }
                        : w
                    )
                  )
                }
              />
              {isAdmin && (
                <div className="sm:col-span-2">
                  <button type="submit" disabled={saving} className="rounded-lg bg-nav px-3 py-2 text-sm font-semibold text-white">
                    Save warehouse
                  </button>
                </div>
              )}
            </form>
          ))}
        </div>
      )}

      {tab === "vendors" && (
        <div className="space-y-4">
          {isAdmin && (
            <button type="button" onClick={() => void addVendor()} className="rounded-lg bg-nav px-3 py-2 text-sm font-semibold text-white">
              Add vendor
            </button>
          )}
          {vendors.map((vendor) => (
            <form
              key={vendor.vendorId}
              className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveVendor(vendor);
              }}
            >
              <p className="sm:col-span-2 font-semibold">
                {vendor.name} <span className="text-xs text-slate-400">{vendor.slug}</span>
              </p>
              <Field label="Name" value={vendor.name} onChange={(v) => setVendors((all) => all.map((x) => (x.vendorId === vendor.vendorId ? { ...x, name: v } : x)))} />
              <Field label="Country" value={vendor.countryCode} onChange={(v) => setVendors((all) => all.map((x) => (x.vendorId === vendor.vendorId ? { ...x, countryCode: v.toUpperCase() } : x)))} />
              <Field
                label="Warehouse IDs (comma)"
                value={vendor.warehouseIds.join(",")}
                onChange={(v) =>
                  setVendors((all) =>
                    all.map((x) =>
                      x.vendorId === vendor.vendorId
                        ? { ...x, warehouseIds: v.split(",").map((s) => s.trim()).filter(Boolean) }
                        : x
                    )
                  )
                }
              />
              <Field
                label="Vendor user emails (comma) — server-side isolation"
                value={vendor.userEmails.join(",")}
                onChange={(v) =>
                  setVendors((all) =>
                    all.map((x) =>
                      x.vendorId === vendor.vendorId
                        ? { ...x, userEmails: v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) }
                        : x
                    )
                  )
                }
              />
              {isAdmin && (
                <div className="sm:col-span-2">
                  <button type="submit" disabled={saving} className="rounded-lg bg-nav px-3 py-2 text-sm font-semibold text-white">
                    Save vendor
                  </button>
                </div>
              )}
            </form>
          ))}
        </div>
      )}

      {tab === "markets" && isAdmin && (
        <div className="space-y-4">
          {markets.map((market) => (
            <form
              key={market.countryCode}
              className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveMarket(market);
              }}
            >
              <p className="sm:col-span-2 font-semibold">
                {market.flagEmoji} {market.name}
              </p>
              <Field label="Phone" value={market.contact.phone ?? ""} onChange={(v) => setMarkets((all) => all.map((m) => (m.countryCode === market.countryCode ? { ...m, contact: { ...m.contact, phone: v } } : m)))} />
              <Field label="Email (leave blank to add later)" value={market.contact.email ?? ""} onChange={(v) => setMarkets((all) => all.map((m) => (m.countryCode === market.countryCode ? { ...m, contact: { ...m.contact, email: v } } : m)))} />
              <Field label="Default warehouse" value={market.defaultWarehouseId ?? ""} onChange={(v) => setMarkets((all) => all.map((m) => (m.countryCode === market.countryCode ? { ...m, defaultWarehouseId: v } : m)))} />
              <Field label="Display currency" value={market.currency} onChange={(v) => setMarkets((all) => all.map((m) => (m.countryCode === market.countryCode ? { ...m, currency: v as Market["currency"] } : m)))} />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={market.active}
                  onChange={(e) =>
                    setMarkets((all) =>
                      all.map((m) => (m.countryCode === market.countryCode ? { ...m, active: e.target.checked } : m))
                    )
                  }
                />
                Active market
              </label>
              <div className="sm:col-span-2">
                <button type="submit" disabled={saving} className="rounded-lg bg-nav px-3 py-2 text-sm font-semibold text-white">
                  Save market
                </button>
              </div>
            </form>
          ))}
        </div>
      )}

      {tab === "inventory" && (
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Warehouse</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Available</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-slate-500">
                    No warehouse listings yet. Product.inventory remains the global fallback so the current US catalog stays
                    checkout-ready. Add listings here for country-specific stock.
                  </td>
                </tr>
              )}
              {listings.map((row) => (
                <tr key={row.listingId} className="border-t">
                  <td className="px-3 py-2">{row.productSlug}</td>
                  <td className="px-3 py-2">{row.vendorId}</td>
                  <td className="px-3 py-2">{row.warehouseId}</td>
                  <td className="px-3 py-2">{row.countryCode}</td>
                  <td className="px-3 py-2">{row.quantityAvailable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function NetworkAdminPage() {
  return (
    <Suspense fallback={<p className="p-6 text-slate-500">Loading…</p>}>
      <NetworkAdminInner />
    </Suspense>
  );
}
