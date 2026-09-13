"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import { type FestivalModeRange, type ShippingSettings } from "@spicycorner/shared";

type SettingsForm = ShippingSettings;

const SERVICE_LABELS: Record<string, string> = {
  GROUND_ADVANTAGE: "USPS Ground Advantage",
  PRIORITY_MAIL: "Priority Mail",
  PRIORITY_MAIL_EXPRESS: "Priority Mail Express",
  FIRST_CLASS_PACKAGE_SERVICE: "First-Class Package",
};

export default function AdminShippingSettingsPage() {
  const api = useApiClient();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [settingsRes, missingRes] = await Promise.all([
        api<{ settings: ShippingSettings }>("/admin/shipping/settings"),
        api<{ count: number }>("/admin/shipping/products-missing-dims"),
      ]);
      setForm(settingsRes.settings);
      setMissingCount(missingRes.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shipping settings");
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await api<{ settings: ShippingSettings }>("/admin/shipping/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setForm(res.settings);
      setMessage("Shipping settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateOrigin = (key: string, value: string) => {
    if (!form) return;
    setForm({
      ...form,
      originAddress: { ...form.originAddress, [key]: value },
    });
  };

  const updateFestival = (index: number, patch: Partial<FestivalModeRange>) => {
    if (!form) return;
    const festivalModeRanges = form.festivalModeRanges.map((r, i) =>
      i === index ? { ...r, ...patch } : r
    );
    setForm({ ...form, festivalModeRanges });
  };

  const addFestival = () => {
    if (!form) return;
    setForm({
      ...form,
      festivalModeRanges: [
        ...form.festivalModeRanges,
        {
          name: "Custom window",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
          deliverByDate: new Date().toISOString().slice(0, 10),
        },
      ],
    });
  };

  const removeFestival = (index: number) => {
    if (!form) return;
    setForm({
      ...form,
      festivalModeRanges: form.festivalModeRanges.filter((_, i) => i !== index),
    });
  };

  if (!form) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Shipping Settings</h1>
        {error ? <p className="text-red-600 text-sm">{error}</p> : <p className="text-slate-500">Loading…</p>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shipping Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          USPS rate shopping, festival mode, and label purchase controls
        </p>
      </div>

      {missingCount != null && missingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{missingCount} products</strong> are missing shipping weight/dimensions. Rate quotes
          use a small-parcel fallback until you backfill them on the{" "}
          <Link href="/admin/products" className="underline font-medium">
            Products
          </Link>{" "}
          page.
        </div>
      )}

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={save} className="space-y-6">
        <section className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Rate selection</h2>
          <label className="block text-sm">
            Default priority
            <select
              value={form.defaultRatePriority}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultRatePriority: e.target.value as SettingsForm["defaultRatePriority"],
                })
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="cheapest">Cheapest eligible service</option>
              <option value="fastest_by_date">Cheapest that arrives by date</option>
            </select>
          </label>
          {form.defaultRatePriority === "fastest_by_date" && (
            <label className="block text-sm">
              Deliver-by date
              <input
                type="date"
                value={form.deliverByDate ?? ""}
                onChange={(e) => setForm({ ...form, deliverByDate: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
          )}
          <label className="block text-sm">
            Customer shipping charge
            <select
              value={form.customerShippingMode}
              onChange={(e) =>
                setForm({
                  ...form,
                  customerShippingMode: e.target.value as SettingsForm["customerShippingMode"],
                })
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="free">
                Free shipping $49+ (under $10 → $10; under $20 → $8; under $30 → $6; under $40 → $4; under $49 → $2)
              </option>
              <option value="pass_through">Pass through selected rate to customer</option>
            </select>
          </label>
          <label className="block text-sm">
            Flat fallback rate (USD) when USPS API fails
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.flatRateFallbackUsd}
              onChange={(e) =>
                setForm({ ...form, flatRateFallbackUsd: parseFloat(e.target.value) || 5.99 })
              }
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoPurchaseOnPayment}
              onChange={(e) => setForm({ ...form, autoPurchaseOnPayment: e.target.checked })}
            />
            Auto-purchase label when payment confirms (recommended off until trusted)
          </label>
        </section>

        <section className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold">Enabled USPS services</h2>
          {(Object.keys(SERVICE_LABELS) as Array<keyof typeof SERVICE_LABELS>).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabledServices[key as keyof typeof form.enabledServices] !== false}
                onChange={(e) =>
                  setForm({
                    ...form,
                    enabledServices: {
                      ...form.enabledServices,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
              {SERVICE_LABELS[key]}
            </label>
          ))}
        </section>

        <section className="bg-white border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Festival mode scheduler</h2>
            <button
              type="button"
              onClick={addFestival}
              className="text-sm border rounded-lg px-3 py-1.5 hover:bg-slate-50"
            >
              Add range
            </button>
          </div>
          <p className="text-xs text-slate-500">
            During these dates the system picks the cheapest service that still arrives by the
            deliver-by date you enter below. Spices have no festival deadline.
          </p>
          {form.festivalModeRanges.length === 0 && (
            <p className="text-sm text-slate-500">No festival ranges configured.</p>
          )}
          {form.festivalModeRanges.map((range, i) => (
            <div key={i} className="grid sm:grid-cols-2 gap-2 border rounded-lg p-3">
              <input
                placeholder="Name"
                value={range.name}
                onChange={(e) => updateFestival(i, { name: e.target.value })}
                className="border rounded-lg px-2 py-1.5 text-sm sm:col-span-2"
              />
              <label className="text-xs text-slate-500">
                Start
                <input
                  type="date"
                  value={range.startDate}
                  onChange={(e) => updateFestival(i, { startDate: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-slate-500">
                End
                <input
                  type="date"
                  value={range.endDate}
                  onChange={(e) => updateFestival(i, { endDate: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-slate-500 sm:col-span-2">
                Deliver by
                <input
                  type="date"
                  value={range.deliverByDate}
                  onChange={(e) => updateFestival(i, { deliverByDate: e.target.value })}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => removeFestival(i)}
                className="text-xs text-red-600 hover:underline sm:col-span-2 text-left"
              >
                Remove
              </button>
            </div>
          ))}
        </section>

        <section className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold">Origin / fulfillment address</h2>
          <input
            placeholder="Business name *"
            value={form.originAddress.name}
            onChange={(e) => updateOrigin("name", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Address line 1 *"
            value={form.originAddress.line1}
            onChange={(e) => updateOrigin("line1", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Address line 2"
            value={form.originAddress.line2 ?? ""}
            onChange={(e) => updateOrigin("line2", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid sm:grid-cols-3 gap-2">
            <input
              placeholder="City *"
              value={form.originAddress.city}
              onChange={(e) => updateOrigin("city", e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="State *"
              value={form.originAddress.state}
              onChange={(e) => updateOrigin("state", e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="ZIP *"
              value={form.originAddress.postalCode}
              onChange={(e) => updateOrigin("postalCode", e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="bg-nav text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save shipping settings"}
        </button>
      </form>

      <p className="text-xs text-slate-500 border-t pt-4">
        Label purchase requires USPS Business Customer Gateway + EPS postage account and production
        Labels API approval. Rate shopping works with OAuth credentials alone. Set{" "}
        <code className="bg-slate-100 px-1 rounded">USPS_CLIENT_ID</code> /{" "}
        <code className="bg-slate-100 px-1 rounded">USPS_CLIENT_SECRET</code> in Lambda env or Secrets
        Manager.
      </p>
    </div>
  );
}
