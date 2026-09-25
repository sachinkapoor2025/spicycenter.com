"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import { whatsappChatUrl } from "@/lib/site";
import { EVENT_TYPES } from "@spicycorner/shared";
import { trackEnquiryEvent } from "@/lib/track";
import { BULK_PACK_SIZES, isKnownPackSize } from "@/lib/catalogue";

export function WholesaleQuoteForm({
  defaultProduct = "",
  defaultCountry = "",
  defaultQuantity = "",
}: {
  defaultProduct?: string;
  defaultCountry?: string;
  defaultQuantity?: string;
}) {
  const quantityOptions = isKnownPackSize(defaultQuantity) || !defaultQuantity
    ? [...BULK_PACK_SIZES]
    : [defaultQuantity, ...BULK_PACK_SIZES];

  const [form, setForm] = useState({
    contactName: "",
    company: "",
    email: "",
    phone: "",
    country: defaultCountry,
    product: defaultProduct,
    quantity: defaultQuantity && quantityOptions.includes(defaultQuantity) ? defaultQuantity : BULK_PACK_SIZES[0],
    message: "",
  });
  const [website, setWebsite] = useState("");
  const [formStarted, setFormStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_VIEW, { form: "catalogue" });
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      product: defaultProduct || current.product,
      country: defaultCountry || current.country,
      quantity:
        defaultQuantity && (isKnownPackSize(defaultQuantity) || quantityOptions.includes(defaultQuantity))
          ? defaultQuantity
          : current.quantity,
    }));
  }, [defaultProduct, defaultCountry, defaultQuantity]);

  function update(key: keyof typeof form, value: string) {
    if (!formStarted) {
      setFormStarted(true);
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_START, { form: "catalogue" });
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sessionId = getOrCreateSessionId();
      await api("/leads", {
        method: "POST",
        sessionId,
        body: JSON.stringify({
          sessionId,
          name: form.contactName,
          email: form.email,
          phone: form.phone,
          page: typeof window !== "undefined" ? window.location.pathname : "/enquiry",
          source: "catalogue-enquiry",
          metadata: {
            company: form.company,
            contactName: form.contactName,
            country: form.country,
            product: form.product,
            quantity: form.quantity,
            message: form.message,
            website,
          },
        }),
      });
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_SUBMIT, { form: "catalogue" });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your enquiry.");
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "catalogue" });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="card-spice p-6">
        Thank you, {form.contactName}. We have your enquiry for {form.product}
        {form.quantity ? ` (${form.quantity})` : ""}. Delivery timing is confirmed in our reply — this catalogue does not
        quote a delivery date.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 card-spice p-6">
      <p className="text-sm font-semibold">Business enquiry — importers, distributors, restaurants and commercial kitchens</p>
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      {(
        [
          ["contactName", "Customer Name", "text"],
          ["company", "Company Name", "text"],
          ["email", "Email", "email"],
          ["phone", "Phone/WhatsApp", "tel"],
          ["country", "Country", "text"],
          ["product", "Product Name", "text"],
        ] as const
      ).map(([key, label, type]) => (
        <label key={key} className="text-sm">
          <span className="block mb-1 font-medium">{label}</span>
          <input
            required
            type={type}
            value={form[key]}
            onChange={(e) => update(key, e.target.value)}
            className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2 text-base"
          />
        </label>
      ))}
      <label className="text-sm">
        <span className="block mb-1 font-medium">Required Quantity</span>
        <select
          required
          value={form.quantity}
          onChange={(e) => update("quantity", e.target.value)}
          className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2 text-base bg-paper"
        >
          {quantityOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="block mt-1 text-xs text-muted">Pack size only — not a price.</span>
      </label>
      <label className="text-sm">
        <span className="block mb-1 font-medium">Message/Requirements</span>
        <textarea
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2 min-h-24"
        />
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div className="flex flex-wrap gap-3 items-center">
        <button type="submit" disabled={loading} className="btn-primary justify-self-start disabled:opacity-50">
          {loading ? "Sending..." : "Enquire Now"}
        </button>
        <a
          href={whatsappChatUrl(
            `Hi SpicyCenter, I would like to enquire about ${form.product || "Indian spices"} (${form.quantity}).`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-nav font-semibold"
        >
          WhatsApp this enquiry
        </a>
      </div>
    </form>
  );
}
