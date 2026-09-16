"use client";

import { useEffect, useState } from "react";
import { useApiClient, useAuth } from "@/lib/auth-context";
import {
  defaultAdvisoryNote,
  type AddOnPricing,
  type BulkPricingSpice,
  type FreightTiersConfig,
  type FxCache,
  type MoistureTreatmentPricing,
} from "@spicycorner/shared";

export default function AdminBulkPricingPage() {
  const api = useApiClient();
  const { isAdmin } = useAuth();
  const [spices, setSpices] = useState<BulkPricingSpice[]>([]);
  const [addOns, setAddOns] = useState<AddOnPricing | null>(null);
  const [moisture, setMoisture] = useState<MoistureTreatmentPricing | null>(null);
  const [freightTiers, setFreightTiers] = useState<FreightTiersConfig | null>(null);
  const [fx, setFx] = useState<FxCache | null>(null);
  const [msg, setMsg] = useState("");

  function load() {
    api<{
      spices: BulkPricingSpice[];
      addOns: AddOnPricing;
      moisture: MoistureTreatmentPricing;
      freightTiers: FreightTiersConfig;
      fx: FxCache;
    }>("/admin/bulk-pricing")
      .then((d) => {
        setSpices(d.spices);
        setAddOns(d.addOns);
        setMoisture(d.moisture);
        setFreightTiers(d.freightTiers);
        setFx(d.fx);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "Load failed"));
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) return <p className="p-6">Admin only.</p>;

  async function saveSpice(row: BulkPricingSpice) {
    setMsg("");
    await api("/admin/bulk-pricing", { method: "PUT", body: JSON.stringify(row) });
    setMsg(`Saved ${row.spice_name}`);
    load();
  }

  async function saveAddOns() {
    if (!addOns) return;
    await api("/admin/bulk-pricing/addons", { method: "PUT", body: JSON.stringify(addOns) });
    setMsg("Saved add-on fees");
  }

  async function saveMoisture() {
    if (!moisture) return;
    await api("/admin/bulk-pricing/moisture", { method: "PUT", body: JSON.stringify(moisture) });
    setMsg("Saved moisture / desiccant fees (placeholder estimates — confirm supplier costs before live quotes)");
  }

  async function saveFreightTiers() {
    if (!freightTiers) return;
    await api("/admin/bulk-pricing/freight-tiers", { method: "PUT", body: JSON.stringify(freightTiers) });
    setMsg("Saved freight / container capacity tiers");
  }

  async function runFetch() {
    setMsg("Starting Agmarknet fetch in the background…");
    const out = await api<{ message?: string; invoked?: boolean }>("/admin/agmarknet/run", {
      method: "POST",
      body: JSON.stringify({ backfill: true }),
    });
    setMsg(out.message ?? "Fetch started. Reload this page in about a minute — do not click the button again.");
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">Bulk pricing</h1>
      <p className="text-sm text-slate-600 mt-2">
        Leave base price blank to use Agmarknet LATEST × markup. Never treat mandi prints as FOB. Clearance ₹
        {addOns ? "" : ""}10,000–20,000 is a CHA placeholder until a real quote is filed.
      </p>
      {fx && (
        <p className="text-xs mt-2">
          FX cache: 1 INR = {fx.inr_gbp} GBP / {fx.inr_eur} EUR ({fx.source}, {fx.fetched_at})
        </p>
      )}
      <button type="button" className="mt-4 rounded bg-nav text-white px-3 py-1.5 text-sm" onClick={() => void runFetch()}>
        Run Agmarknet fetch now
      </button>
      {msg && <p className="text-sm mt-2">{msg}</p>}

      {addOns && (
        <section className="mt-8 border rounded-xl p-4 bg-white">
          <h2 className="font-semibold">Add-on fees (not auto-converted)</h2>
          <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
            {(
              [
                ["sample_fee_gbp", "Sample GBP"],
                ["sample_fee_eur", "Sample EUR"],
                ["documentation_handling_fee_gbp", "Docs GBP"],
                ["documentation_handling_fee_eur", "Docs EUR"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={addOns[key]}
                  onChange={(e) => setAddOns({ ...addOns, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <button type="button" className="mt-3 text-sm text-nav" onClick={() => void saveAddOns()}>
            Save add-ons
          </button>
        </section>
      )}

      {moisture && (
        <section className="mt-8 border rounded-xl p-4 bg-white">
          <h2 className="font-semibold">Moisture protection & desiccant (per shipment, INR)</h2>
          <p className="text-xs text-slate-600 mt-1">
            Placeholder estimates. Confirm against actual packaging/desiccant supplier costs before going live. Charged
            once per shipment, not per kg.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
            <label>
              Standard (whole / low-sensitivity) INR
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={moisture.desiccant_fee_standard_inr}
                onChange={(e) =>
                  setMoisture({ ...moisture, desiccant_fee_standard_inr: Number(e.target.value) })
                }
              />
            </label>
            <label>
              High (ground / moisture-sensitive) INR
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={moisture.desiccant_fee_high_inr}
                onChange={(e) => setMoisture({ ...moisture, desiccant_fee_high_inr: Number(e.target.value) })}
              />
            </label>
          </div>
          <button type="button" className="mt-3 text-sm text-nav" onClick={() => void saveMoisture()}>
            Save desiccant fees
          </button>
        </section>
      )}

      {freightTiers && (
        <section className="mt-8 border rounded-xl p-4 bg-white">
          <h2 className="font-semibold">Freight tiers (standard dry containers only)</h2>
          <p className="text-xs text-slate-600 mt-1">
            Container recommendations are derived from these weight breakpoints. Reefer and ventilated equipment are not
            offered.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
            <label>
              LCL max kg
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={freightTiers.lcl_max_kg}
                onChange={(e) => setFreightTiers({ ...freightTiers, lcl_max_kg: Number(e.target.value) })}
              />
            </label>
            <label>
              20ft payload kg
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={freightTiers.payload_20ft_kg}
                onChange={(e) => setFreightTiers({ ...freightTiers, payload_20ft_kg: Number(e.target.value) })}
              />
            </label>
            <label>
              40ft payload kg
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={freightTiers.payload_40ft_kg}
                onChange={(e) => setFreightTiers({ ...freightTiers, payload_40ft_kg: Number(e.target.value) })}
              />
            </label>
          </div>
          <button type="button" className="mt-3 text-sm text-nav" onClick={() => void saveFreightTiers()}>
            Save freight tiers
          </button>
        </section>
      )}

      <div className="mt-8 space-y-4">
        {spices.map((s) => (
          <div key={s.spice_id} className="border rounded-xl p-4 bg-white text-sm grid sm:grid-cols-3 gap-2">
            <p className="font-semibold sm:col-span-3">{s.spice_name}</p>
            <label>
              Override INR/kg (blank = Agmarknet + markup)
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={s.base_price_inr_per_kg ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSpices((rows) =>
                    rows.map((r) =>
                      r.spice_id === s.spice_id
                        ? { ...r, base_price_inr_per_kg: v === "" ? null : Number(v) }
                        : r
                    )
                  );
                }}
              />
            </label>
            <label>
              Markup %
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={s.markup_percent}
                onChange={(e) =>
                  setSpices((rows) =>
                    rows.map((r) => (r.spice_id === s.spice_id ? { ...r, markup_percent: Number(e.target.value) } : r))
                  )
                }
              />
            </label>
            <label>
              Ship UK INR/kg
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={s.shipping_rate_inr_per_kg_uk}
                onChange={(e) =>
                  setSpices((rows) =>
                    rows.map((r) =>
                      r.spice_id === s.spice_id ? { ...r, shipping_rate_inr_per_kg_uk: Number(e.target.value) } : r
                    )
                  )
                }
              />
            </label>
            <label>
              Ship EU INR/kg
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={s.shipping_rate_inr_per_kg_eu}
                onChange={(e) =>
                  setSpices((rows) =>
                    rows.map((r) =>
                      r.spice_id === s.spice_id ? { ...r, shipping_rate_inr_per_kg_eu: Number(e.target.value) } : r
                    )
                  )
                }
              />
            </label>
            <label>
              Clearance INR (placeholder 10k–20k)
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={s.clearance_charge_inr}
                onChange={(e) =>
                  setSpices((rows) =>
                    rows.map((r) => (r.spice_id === s.spice_id ? { ...r, clearance_charge_inr: Number(e.target.value) } : r))
                  )
                }
              />
            </label>
            <label>
              Testing INR
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={s.testing_charge_inr}
                onChange={(e) =>
                  setSpices((rows) =>
                    rows.map((r) => (r.spice_id === s.spice_id ? { ...r, testing_charge_inr: Number(e.target.value) } : r))
                  )
                }
              />
            </label>
            <label>
              Spice form
              <select
                className="w-full border rounded px-2 py-1 mt-1"
                value={s.spice_form ?? "whole"}
                onChange={(e) => {
                  const spice_form = e.target.value === "ground" ? "ground" : "whole";
                  const moisture_sensitivity = spice_form === "ground" ? "high" : "standard";
                  setSpices((rows) =>
                    rows.map((r) =>
                      r.spice_id === s.spice_id
                        ? {
                            ...r,
                            spice_form,
                            moisture_sensitivity,
                            advisory_note:
                              !(r.advisory_note ?? "").trim() ||
                              r.advisory_note === defaultAdvisoryNote(r.spice_name, r.spice_form ?? "whole")
                                ? defaultAdvisoryNote(r.spice_name, spice_form)
                                : r.advisory_note,
                          }
                        : r
                    )
                  );
                }}
              >
                <option value="whole">Whole</option>
                <option value="ground">Ground / powder</option>
              </select>
            </label>
            <label>
              Moisture sensitivity
              <select
                className="w-full border rounded px-2 py-1 mt-1"
                value={s.moisture_sensitivity ?? "standard"}
                onChange={(e) => {
                  const moisture_sensitivity = e.target.value === "high" ? "high" : "standard";
                  setSpices((rows) =>
                    rows.map((r) => (r.spice_id === s.spice_id ? { ...r, moisture_sensitivity } : r))
                  );
                }}
              >
                <option value="standard">Standard (whole / low risk)</option>
                <option value="high">High (ground / moisture-sensitive)</option>
              </select>
            </label>
            <label className="sm:col-span-3">
              Shipping / handling advice (shown on the quote)
              <textarea
                className="w-full border rounded px-2 py-1 mt-1"
                rows={3}
                value={s.advisory_note ?? ""}
                onChange={(e) =>
                  setSpices((rows) =>
                    rows.map((r) => (r.spice_id === s.spice_id ? { ...r, advisory_note: e.target.value } : r))
                  )
                }
              />
            </label>
            <button type="button" className="text-nav self-end" onClick={() => void saveSpice(s)}>
              Save {s.spice_name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
