"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  TRACKED_COMMODITIES,
  BULK_ODOR_SEGREGATION_NOTE,
  BULK_DESTINATIONS,
  DEFAULT_DOCUMENTATION_FEE_CAD,
  DEFAULT_DOCUMENTATION_FEE_EUR,
  DEFAULT_DOCUMENTATION_FEE_GBP,
  DEFAULT_DOCUMENTATION_FEE_USD,
  DEFAULT_SAMPLE_FEE_CAD,
  DEFAULT_SAMPLE_FEE_EUR,
  DEFAULT_SAMPLE_FEE_GBP,
  DEFAULT_SAMPLE_FEE_USD,
  addOnFeesForDestination,
  bulkDestinationFromCountry,
  bulkDisplayCurrency,
  bulkQuoteDisclaimer,
  bulkShippingAdviceCloser,
  computeBulkQuote,
  isoCountryForBulkDestination,
  isNorthAmericaBulk,
  shippingRateInrPerKg,
  type AddOnPricing,
  type BulkDestination,
  type BulkPricingSpice,
  type BulkQuoteResult,
  type FreightTiersConfig,
  type MoistureTreatmentPricing,
} from "@spicycorner/shared";
import { StripePaymentForm } from "@/components/StripePaymentForm";

const KG_PER_LB = 0.45359237;

type QtyUnit = "kg" | "lb";

type GradeSlice = {
  variety: string;
  grade: string;
  label: string;
  key?: string;
  inr_per_kg?: number;
  average_modal_price: number;
  market_count: number;
};

type QuoteResponse = {
  quote: BulkQuoteResult;
  spice?: BulkPricingSpice;
  addOns: AddOnPricing;
  moisture?: MoistureTreatmentPricing;
  freightTiers?: FreightTiersConfig;
  mandiInrPerKg?: number | null;
  minQtyKg: number;
  fx: { inr_gbp: number; inr_eur: number; inr_usd?: number; inr_cad?: number; source: string; fetched_at: string };
  grades?: GradeSlice[];
};

function money(n: number, currency: "GBP" | "EUR" | "INR" | "USD" | "CAD") {
  if (currency === "INR") return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const locale = currency === "GBP" ? "en-GB" : currency === "EUR" ? "en-IE" : currency === "CAD" ? "en-CA" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(n);
}

export function BulkEnquiryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [spiceId, setSpiceId] = useState(searchParams.get("spice") || TRACKED_COMMODITIES[1]?.spiceId || "cumin");
  const [spiceQuery, setSpiceQuery] = useState("");
  const [qtyUnit, setQtyUnit] = useState<QtyUnit>("kg");
  const [qtyInput, setQtyInput] = useState("");
  const destParam = (searchParams.get("destination") || "").toUpperCase();
  const [destination, setDestination] = useState<BulkDestination>(
    destParam === "US" || destParam === "CA" || destParam === "EU" || destParam === "UK" ? destParam : "UK"
  );
  const [sampleSelected, setSampleSelected] = useState(false);
  const [documentationSelected, setDocumentationSelected] = useState(false);
  const [gradeKey, setGradeKey] = useState("");
  const [qtyError, setQtyError] = useState("");
  const [quotePack, setQuotePack] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(destination === "UK" ? "GB" : "DE");
  const [companyName, setCompanyName] = useState("");
  const [vatEori, setVatEori] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [incoterm, setIncoterm] = useState<"FOB" | "CIF">("FOB");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);
  const [enquiryId, setEnquiryId] = useState<string | null>(null);

  const spices = useMemo(() => {
    const q = spiceQuery.trim().toLowerCase();
    if (!q) return TRACKED_COMMODITIES;
    return TRACKED_COMMODITIES.filter(
      (c) => c.spiceName.toLowerCase().includes(q) || c.slug.includes(q)
    );
  }, [spiceQuery]);

  const qtyEntered = Number(String(qtyInput).replace(/,/g, "").replace(/[^\d.]/g, ""));
  const qtyKg =
    Number.isFinite(qtyEntered) && qtyEntered > 0
      ? qtyUnit === "lb"
        ? qtyEntered * KG_PER_LB
        : qtyEntered
      : 0;

  useEffect(() => {
    const min = quotePack?.minQtyKg ?? 100;
    if (!qtyInput.trim()) {
      setQtyError("");
      return;
    }
    if (!Number.isFinite(qtyEntered) || qtyEntered <= 0) {
      setQtyError("Enter a quantity greater than zero.");
    } else if (qtyKg < min) {
      const minLb = Math.ceil(min / KG_PER_LB);
      setQtyError(
        `Minimum bulk quantity is ${min}kg (about ${minLb} lb). We do not round up.`
      );
    } else {
      setQtyError("");
    }
  }, [qtyInput, qtyEntered, qtyKg, qtyUnit, quotePack?.minQtyKg]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/geo")
      .then((r) => r.json())
      .then((geo: { country?: string }) => {
        if (cancelled) return;
        const dest = bulkDestinationFromCountry(geo.country);
        if (!dest) return;
        setDestination(dest);
        setCountry(isoCountryForBulkDestination(dest));
        if (isNorthAmericaBulk(dest)) setQtyUnit("lb");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingQuote(true);
    setQuoteError("");
    const body = JSON.stringify({ spiceId, qtyKg: 100, destination: "UK" });
    api<QuoteResponse>("/bulk/quote", { method: "POST", revalidate: false, body })
      .catch(() =>
        api<QuoteResponse>(`/bulk/quote?spiceId=${encodeURIComponent(spiceId)}&qtyKg=100&destination=UK`, {
          revalidate: false,
        })
      )
      .then((data) => {
        if (!cancelled) setQuotePack(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setQuotePack(null);
          setQuoteError(err instanceof Error ? err.message : "Could not load quote");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingQuote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spiceId]);

  const grades = quotePack?.grades ?? [];
  const selectedGrade = grades.find((g) => (g.key ?? g.label) === gradeKey);
  const mandiKg =
    (gradeKey ? selectedGrade?.inr_per_kg : undefined) ?? quotePack?.mandiInrPerKg ?? null;

  const displayCurrency = bulkDisplayCurrency(destination);
  const quoteAddOns: AddOnPricing = {
    sample_fee_gbp:
      quotePack?.addOns?.sample_fee_gbp === 9
        ? DEFAULT_SAMPLE_FEE_GBP
        : quotePack?.addOns?.sample_fee_gbp ?? DEFAULT_SAMPLE_FEE_GBP,
    sample_fee_eur: quotePack?.addOns?.sample_fee_eur ?? DEFAULT_SAMPLE_FEE_EUR,
    sample_fee_usd: quotePack?.addOns?.sample_fee_usd ?? DEFAULT_SAMPLE_FEE_USD,
    sample_fee_cad: quotePack?.addOns?.sample_fee_cad ?? DEFAULT_SAMPLE_FEE_CAD,
    documentation_handling_fee_gbp:
      quotePack?.addOns?.documentation_handling_fee_gbp ?? DEFAULT_DOCUMENTATION_FEE_GBP,
    documentation_handling_fee_eur:
      quotePack?.addOns?.documentation_handling_fee_eur ?? DEFAULT_DOCUMENTATION_FEE_EUR,
    documentation_handling_fee_usd:
      quotePack?.addOns?.documentation_handling_fee_usd ?? DEFAULT_DOCUMENTATION_FEE_USD,
    documentation_handling_fee_cad:
      quotePack?.addOns?.documentation_handling_fee_cad ?? DEFAULT_DOCUMENTATION_FEE_CAD,
  };
  const addOnFees = addOnFeesForDestination(quoteAddOns, destination);
  const sampleFee = addOnFees.sample;
  const docFee = addOnFees.documentation;

  const quote = useMemo(() => {
    if (!quotePack?.spice || !quotePack.fx || qtyKg <= 0) return undefined;
    return computeBulkQuote({
      spice: quotePack.spice,
      qtyKg,
      destination,
      agmarknetModalAvgInr: mandiKg,
      fxInrGbp: quotePack.fx.inr_gbp,
      fxInrEur: quotePack.fx.inr_eur,
      fxInrUsd: quotePack.fx.inr_usd,
      fxInrCad: quotePack.fx.inr_cad,
      addOns: quoteAddOns,
      sampleSelected,
      documentationSelected,
      moisture: quotePack.moisture,
      freightTiers: quotePack.freightTiers,
    });
  }, [quotePack, qtyKg, destination, mandiKg, sampleSelected, documentationSelected, quoteAddOns]);
  const addOnsTotal =
    quote && quote.pricingAvailable
      ? quote.addOnsTotalDisplay
      : (sampleSelected ? sampleFee : 0) + (documentationSelected ? docFee : 0);
  const runningTotal =
    quote && quote.pricingAvailable ? quote.grandTotalDisplay : addOnsTotal;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!qtyInput.trim() || qtyError || qtyKg < (quotePack?.minQtyKg ?? 100)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const data = await api<{
        enquiryId: string;
        requiresPayment?: boolean;
        clientSecret?: string | null;
        quote: BulkQuoteResult;
      }>("/bulk/enquiries", {
        method: "POST",
        body: JSON.stringify({
          spiceId,
          qtyKg,
          destination,
          grade: gradeKey || undefined,
          sampleSelected,
          documentationSelected,
          contact: {
            fullName,
            email,
            phone,
            country,
            companyName: companyName || undefined,
            vatEori: vatEori || undefined,
            deliveryAddress: deliveryAddress || undefined,
            notes: notes || undefined,
            incoterm,
          },
        }),
      });
      setEnquiryId(data.enquiryId);
      if (data.requiresPayment && data.clientSecret && !data.clientSecret.includes("_dev_")) {
        setStripeSecret(data.clientSecret);
        return;
      }
      router.push(`/bulk-enquiry/confirm/${data.enquiryId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit enquiry");
    } finally {
      setSubmitting(false);
    }
  }

  if (stripeSecret && enquiryId) {
    return (
      <div className="card-spice p-6 space-y-4">
        <h2 className="font-serif text-2xl">Pay add-on fees only</h2>
        <p className="text-sm text-muted">
          The spice shipment is not charged here. You are paying only the sample and/or documentation service fee.
          Reference {enquiryId}.
        </p>
        <StripePaymentForm
          clientSecret={stripeSecret}
          returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/bulk-enquiry/confirm/${enquiryId}`}
          amountLabel="Pay add-on fees"
          onError={setSubmitError}
        />
        {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <section>
        <h2 className="font-serif text-2xl text-primary">1. Spice and quantity</h2>
        <label className="block text-sm mt-4">Search spices</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mt-1"
          value={spiceQuery}
          onChange={(e) => setSpiceQuery(e.target.value)}
          placeholder="Cumin, turmeric, chilli…"
        />
        <select
          className="w-full border rounded-lg px-3 py-2 mt-3"
          value={spiceId}
          onChange={(e) => {
            setSpiceId(e.target.value);
            setGradeKey("");
          }}
          required
        >
          {spices.map((c) => (
            <option key={c.spiceId} value={c.spiceId}>
              {c.spiceName}
            </option>
          ))}
        </select>
        {grades.length > 0 && (
          <>
            <p className="text-sm mt-4">Grade / variety (when Agmarknet reports it)</p>
            <select
              className="w-full border rounded-lg px-3 py-2 mt-2"
              value={gradeKey}
              onChange={(e) => setGradeKey(e.target.value)}
            >
              <option value="">All grades (average)</option>
              {grades.map((g) => (
                <option key={g.key ?? g.label} value={g.key ?? g.label}>
                  {g.label} — ₹{Math.round(g.inr_per_kg ?? g.average_modal_price / 100)}/kg ({g.market_count} lots)
                </option>
              ))}
            </select>
          </>
        )}
        <p className="text-sm mt-4">Quantity</p>
        <div className="flex gap-2 mt-2">
          {(["kg", "lb"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => {
                if (unit === qtyUnit) return;
                const n = Number(qtyInput);
                if (Number.isFinite(n) && n > 0) {
                  const kg = qtyUnit === "lb" ? n * KG_PER_LB : n;
                  const shown = unit === "lb" ? kg / KG_PER_LB : kg;
                  setQtyInput(String(Math.round(shown * 100) / 100));
                }
                setQtyUnit(unit);
              }}
              className={`rounded-lg border px-4 py-2 text-sm ${qtyUnit === unit ? "bg-nav text-white border-nav" : "bg-white"}`}
            >
              {unit === "kg" ? "Kilograms (kg)" : "Pounds (lb)"}
            </button>
          ))}
        </div>
        <input
          type="text"
          inputMode="decimal"
          className="w-full border rounded-lg px-3 py-2 mt-3 placeholder:text-slate-400"
          value={qtyInput}
          onChange={(e) => setQtyInput(e.target.value)}
          placeholder={qtyUnit === "kg" ? "e.g. 100kg, 200kg, 500kg" : "e.g. 220 lb, 440 lb, 1100 lb"}
        />
        {qtyKg >= 100 && qtyUnit === "lb" && (
          <p className="text-xs text-muted mt-1">{qtyKg.toFixed(1)} kg used for the quote</p>
        )}
        {qtyError && <p className="text-red-600 text-sm mt-2">{qtyError}</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          {BULK_DESTINATIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDestination(d.id);
                setCountry(d.iso);
                if (isNorthAmericaBulk(d.id)) setQtyUnit("lb");
              }}
              className={`rounded-lg border px-4 py-2 ${destination === d.id ? "bg-nav text-white border-nav" : ""}`}
            >
              Deliver to {d.label}
            </button>
          ))}
        </div>
        {isNorthAmericaBulk(destination) && (
          <p className="text-xs text-muted mt-2">
            US and Canada bulk orders are handled as an enquiry. Indian spice cost stays the same; ocean freight,
            phytosanitary paperwork and importer-side customs are quoted for North America. The cargo is never charged
            online.
          </p>
        )}
      </section>

      <section className="card-spice p-6">
        <h2 className="font-serif text-2xl text-primary">2. Indicative quote</h2>
        {loadingQuote && <p className="text-sm text-muted mt-3">Loading reference prices…</p>}
        {quoteError && <p className="text-red-600 text-sm mt-3">{quoteError}</p>}
        {!qtyInput.trim() && !quoteError && (
          <p className="text-sm text-muted mt-3">Enter a quantity to see a live estimate. Minimum 100kg.</p>
        )}
        {quote && !quote.pricingAvailable && (
          <p className="mt-3 font-semibold">Contact us for pricing — no reference rate is on file for this spice yet.</p>
        )}
        {quote && quote.pricingAvailable && qtyKg >= (quotePack?.minQtyKg ?? 100) && (
          <>
            <div className="mt-4 rounded-xl border border-[#e6d5bc] bg-[#fdf8f1] p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Recommended container</p>
              <p className="font-semibold text-primary mt-1">{quote.containerRecommendation.label}</p>
              <p className="text-sm text-muted mt-1">{quote.containerRecommendation.explanation}</p>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>
                  Spice cost
                  <span className="block text-xs text-muted font-normal">
                    {money(quote.unitPriceInrPerKg, "INR")}/kg × {qtyKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg
                    {qtyUnit === "lb" && qtyInput ? ` (${qtyInput} lb)` : ""}
                  </span>
                </dt>
                <dd>{money(quote.spiceCostInr, "INR")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Export clearance (fixed per shipment)</dt>
                <dd>{money(quote.clearanceChargeInr, "INR")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Testing / lab certification (fixed per shipment)</dt>
                <dd>{money(quote.testingChargeInr, "INR")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>
                  Moisture protection &amp; desiccant treatment
                  <span className="block text-xs text-muted font-normal">
                    Fixed per shipment · {quote.moistureSensitivity === "high" ? "high-sensitivity / ground" : "standard / whole"}
                  </span>
                </dt>
                <dd>{money(quote.moistureTreatmentInr, "INR")}</dd>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <dt>Subtotal (INR)</dt>
                <dd>{money(quote.subtotalInr, "INR")}</dd>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <dt>Estimated goods total ({quote.displayCurrency})</dt>
                <dd>{money(quote.estimatedDisplay, quote.displayCurrency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>
                  Shipping ({destination})
                  <span className="block text-xs text-muted font-normal">
                    {money(
                      quotePack?.spice ? shippingRateInrPerKg(quotePack.spice, destination) : quote.shippingCostInr / (quote.qtyKg || qtyKg || 1),
                      "INR"
                    )}
                    /kg × {qtyKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg
                  </span>
                </dt>
                <dd>{money(quote.shippingCostDisplay, quote.displayCurrency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Add-ons</dt>
                <dd>{money(addOnsTotal, displayCurrency)}</dd>
              </div>
              <div className="flex justify-between font-bold">
                <dt>Running total</dt>
                <dd>{money(runningTotal, displayCurrency)}</dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl text-primary">3. Add-ons</h2>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div className="rounded-2xl border border-[#e6d5bc] bg-white p-5 flex flex-col">
            <p className="text-xs uppercase tracking-wide text-muted">Sample pack</p>
            <p className="font-serif text-xl text-primary mt-1">{money(sampleFee, displayCurrency)}</p>
            <p className="text-sm text-muted mt-2 flex-1">A physical sample of the selected spice, shipped separately. Charged only if you add it.</p>
            <button
              type="button"
              onClick={() => setSampleSelected((v) => !v)}
              className={`mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold ${
                sampleSelected ? "bg-nav text-white" : "border border-nav text-nav hover:bg-orange-50"
              }`}
            >
              {sampleSelected ? "Added" : "Add"}
            </button>
          </div>
          <div className="rounded-2xl border border-[#e6d5bc] bg-white p-5 flex flex-col">
            <p className="text-xs uppercase tracking-wide text-muted">Export documentation</p>
            <p className="font-serif text-xl text-primary mt-1">{money(docFee, displayCurrency)}</p>
            <p className="text-sm text-muted mt-2 flex-1">We prepare the export paperwork. Charged only if you add it — not the spice cargo.</p>
            <button
              type="button"
              onClick={() => setDocumentationSelected((v) => !v)}
              className={`mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold ${
                documentationSelected ? "bg-nav text-white" : "border border-nav text-nav hover:bg-orange-50"
              }`}
            >
              {documentationSelected ? "Added" : "Add"}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted mt-3">
          {isNorthAmericaBulk(destination)
            ? "Add-ons are noted on your enquiry. We do not take cargo or add-on payment online for US/Canada bulk — our team confirms the quote."
            : "Add-on fees go to checkout if selected. The bulk spice cost is never charged online."}
        </p>
      </section>

      {quote && quote.pricingAvailable && qtyKg >= (quotePack?.minQtyKg ?? 100) && (
        <section className="rounded-2xl border border-[#e6d5bc] bg-white p-6">
          <h2 className="font-serif text-2xl text-primary">Our shipping advice</h2>
          <p className="text-sm text-muted mt-3 leading-relaxed">{quote.advisoryNote}</p>
          <p className="text-sm text-muted mt-3 leading-relaxed">{BULK_ODOR_SEGREGATION_NOTE}</p>
          <p className="text-sm text-muted mt-3 leading-relaxed">{bulkShippingAdviceCloser(destination)}</p>
          <p className="text-xs text-muted mt-4 leading-relaxed">{bulkQuoteDisclaimer(destination)}</p>
        </section>
      )}
      {!(quote && quote.pricingAvailable && qtyKg >= (quotePack?.minQtyKg ?? 100)) && (
        <p className="text-xs text-muted leading-relaxed">{bulkQuoteDisclaimer(destination)}</p>
      )}

      <section>
        <h2 className="font-serif text-2xl text-primary">4. Contact</h2>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <input required className="border rounded-lg px-3 py-2" placeholder="Full name *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input required type="email" className="border rounded-lg px-3 py-2" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required className="border rounded-lg px-3 py-2" placeholder="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input required className="border rounded-lg px-3 py-2" placeholder="Country *" value={country} onChange={(e) => setCountry(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="Company (optional)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder={isNorthAmericaBulk(destination) ? "EIN / tax ID (optional)" : "VAT / EORI (optional)"} value={vatEori} onChange={(e) => setVatEori(e.target.value)} />
        </div>
        <textarea className="w-full border rounded-lg px-3 py-2 mt-3" rows={2} placeholder="Delivery address (optional)" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
        <textarea className="w-full border rounded-lg px-3 py-2 mt-3" rows={3} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <label className="block text-sm mt-3">Preferred Incoterm</label>
        <select className="border rounded-lg px-3 py-2 mt-1" value={incoterm} onChange={(e) => setIncoterm(e.target.value as "FOB" | "CIF")}>
          <option value="FOB">FOB</option>
          <option value="CIF">CIF</option>
        </select>
        <p className="text-xs text-muted mt-2">
          Spice: {spiceId} · Quantity: {qtyInput || "—"} {qtyUnit}
          {qtyKg > 0 ? ` (${qtyKg.toFixed(1)} kg)` : ""}
        </p>
      </section>

      {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
      <button type="submit" disabled={submitting || Boolean(qtyError)} className="btn-primary disabled:opacity-50">
        {submitting
          ? "Submitting…"
          : isNorthAmericaBulk(destination)
            ? "Send bulk enquiry"
            : sampleSelected || documentationSelected
              ? "Continue to add-on payment"
              : "Confirm enquiry"}
      </button>
      <p className="text-xs text-muted">
        Need a smaller restaurant bag? Use the{" "}
        <Link href="/wholesale" className="text-nav">
          10kg+ wholesale form
        </Link>
        .
      </p>
    </form>
  );
}
