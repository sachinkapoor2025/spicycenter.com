"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  TRACKED_COMMODITIES,
  BULK_QUOTE_DISCLAIMER,
  DEFAULT_DOCUMENTATION_FEE_EUR,
  DEFAULT_DOCUMENTATION_FEE_GBP,
  DEFAULT_SAMPLE_FEE_EUR,
  DEFAULT_SAMPLE_FEE_GBP,
  type BulkQuoteResult,
} from "@spicycorner/shared";
import { StripePaymentForm } from "@/components/StripePaymentForm";

const PRESETS = [100, 200, 500, 1000, 5000, 10000];

type GradeSlice = { variety: string; grade: string; label: string; average_modal_price: number; market_count: number };

type QuoteResponse = {
  quote: BulkQuoteResult;
  addOns: {
    sample_fee_gbp: number;
    sample_fee_eur: number;
    documentation_handling_fee_gbp: number;
    documentation_handling_fee_eur: number;
  };
  minQtyKg: number;
  fx: { inr_gbp: number; inr_eur: number; source: string; fetched_at: string };
  grades?: GradeSlice[];
};

function money(n: number, currency: "GBP" | "EUR" | "INR") {
  if (currency === "INR") return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return new Intl.NumberFormat(currency === "GBP" ? "en-GB" : "en-IE", {
    style: "currency",
    currency,
  }).format(n);
}

export function BulkEnquiryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [spiceId, setSpiceId] = useState(searchParams.get("spice") || TRACKED_COMMODITIES[1]?.spiceId || "cumin");
  const [spiceQuery, setSpiceQuery] = useState("");
  const [qtyKg, setQtyKg] = useState(100);
  const [customQty, setCustomQty] = useState("100");
  const [destination, setDestination] = useState<"UK" | "EU">("UK");
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

  useEffect(() => {
    const min = quotePack?.minQtyKg ?? 100;
    if (qtyKg < min) {
      setQtyError(`Minimum bulk quantity is ${min}kg. We do not round up.`);
    } else {
      setQtyError("");
    }
  }, [qtyKg, quotePack?.minQtyKg]);

  useEffect(() => {
    const min = 100;
    if (qtyKg < min) return;
    let cancelled = false;
    setLoadingQuote(true);
    setQuoteError("");
    const params = new URLSearchParams({
      spiceId,
      qtyKg: String(qtyKg),
      destination,
    });
    if (gradeKey) params.set("grade", gradeKey);
    api<QuoteResponse>(`/bulk/quote?${params.toString()}`, { revalidate: false })
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
  }, [spiceId, qtyKg, destination, gradeKey]);

  const quote = quotePack?.quote;
  const displayCurrency = destination === "UK" ? "GBP" : "EUR";
  const addOns = quotePack?.addOns;
  const sampleFee =
    displayCurrency === "GBP"
      ? addOns?.sample_fee_gbp ?? DEFAULT_SAMPLE_FEE_GBP
      : addOns?.sample_fee_eur ?? DEFAULT_SAMPLE_FEE_EUR;
  const docFee =
    displayCurrency === "GBP"
      ? addOns?.documentation_handling_fee_gbp ?? DEFAULT_DOCUMENTATION_FEE_GBP
      : addOns?.documentation_handling_fee_eur ?? DEFAULT_DOCUMENTATION_FEE_EUR;
  const addOnsTotal = (sampleSelected ? sampleFee : 0) + (documentationSelected ? docFee : 0);
  const runningTotal =
    quote && quote.pricingAvailable ? quote.estimatedDisplay + addOnsTotal : addOnsTotal;
  const grades = (quotePack?.grades ?? []).filter((g) => g.label && g.label !== "Unspecified");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (qtyError) return;
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
                <option key={g.label} value={g.label}>
                  {g.label} ({g.market_count} lots)
                </option>
              ))}
            </select>
          </>
        )}
        <p className="text-sm mt-4">Quantity (kg)</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setQtyKg(n);
                setCustomQty(String(n));
              }}
              className={`rounded-full border px-3 py-1 text-sm ${qtyKg === n ? "bg-nav text-white border-nav" : ""}`}
            >
              {n.toLocaleString()}kg
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          className="w-full border rounded-lg px-3 py-2 mt-3"
          value={customQty}
          onChange={(e) => {
            setCustomQty(e.target.value);
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setQtyKg(n);
          }}
        />
        {qtyError && <p className="text-red-600 text-sm mt-2">{qtyError}</p>}
        <div className="flex gap-3 mt-4">
          {(["UK", "EU"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDestination(d);
                setCountry(d === "UK" ? "GB" : "DE");
              }}
              className={`rounded-lg border px-4 py-2 ${destination === d ? "bg-nav text-white border-nav" : ""}`}
            >
              Deliver to {d}
            </button>
          ))}
        </div>
      </section>

      <section className="card-spice p-6">
        <h2 className="font-serif text-2xl text-primary">2. Indicative quote</h2>
        {loadingQuote && <p className="text-sm text-muted mt-3">Updating quote…</p>}
        {quoteError && <p className="text-red-600 text-sm mt-3">{quoteError}</p>}
        {quote && !quote.pricingAvailable && (
          <p className="mt-3 font-semibold">Contact us for pricing — no reference rate is on file for this spice yet.</p>
        )}
        {quote && quote.pricingAvailable && (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Spice cost</dt>
              <dd>{money(quote.spiceCostInr, "INR")}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping ({destination})</dt>
              <dd>{money(quote.shippingCostInr, "INR")}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Export clearance</dt>
              <dd>{money(quote.clearanceChargeInr, "INR")}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Testing / lab certification</dt>
              <dd>{money(quote.testingChargeInr, "INR")}</dd>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <dt>Subtotal (INR)</dt>
              <dd>{money(quote.subtotalInr, "INR")}</dd>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <dt>Estimated total ({quote.displayCurrency})</dt>
              <dd>{money(quote.estimatedDisplay, quote.displayCurrency)}</dd>
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
        )}
        <p className="text-xs text-muted mt-4 leading-relaxed">{BULK_QUOTE_DISCLAIMER}</p>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-primary">3. Add-ons</h2>
        <label className="flex gap-2 mt-4 text-sm">
          <input type="checkbox" checked={sampleSelected} onChange={(e) => setSampleSelected(e.target.checked)} />
          Add a sample (+{money(sampleFee, displayCurrency)})
        </label>
        <label className="flex gap-2 mt-2 text-sm">
          <input
            type="checkbox"
            checked={documentationSelected}
            onChange={(e) => setDocumentationSelected(e.target.checked)}
          />
          Let us handle all export documentation (+{money(docFee, displayCurrency)})
        </label>
        <p className="text-xs text-muted mt-2">
          Checking these takes you to checkout for those service fees only. The bulk spice cost is never charged online.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-primary">4. Contact</h2>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <input required className="border rounded-lg px-3 py-2" placeholder="Full name *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input required type="email" className="border rounded-lg px-3 py-2" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required className="border rounded-lg px-3 py-2" placeholder="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input required className="border rounded-lg px-3 py-2" placeholder="Country *" value={country} onChange={(e) => setCountry(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="Company (optional)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="VAT / EORI (optional)" value={vatEori} onChange={(e) => setVatEori(e.target.value)} />
        </div>
        <textarea className="w-full border rounded-lg px-3 py-2 mt-3" rows={2} placeholder="Delivery address (optional)" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
        <textarea className="w-full border rounded-lg px-3 py-2 mt-3" rows={3} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <label className="block text-sm mt-3">Preferred Incoterm</label>
        <select className="border rounded-lg px-3 py-2 mt-1" value={incoterm} onChange={(e) => setIncoterm(e.target.value as "FOB" | "CIF")}>
          <option value="FOB">FOB</option>
          <option value="CIF">CIF</option>
        </select>
        <p className="text-xs text-muted mt-2">Spice: {spiceId} · Quantity: {qtyKg}kg (pre-filled)</p>
      </section>

      {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
      <button type="submit" disabled={submitting || Boolean(qtyError)} className="btn-primary disabled:opacity-50">
        {submitting ? "Submitting…" : sampleSelected || documentationSelected ? "Continue to add-on payment" : "Confirm enquiry"}
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
