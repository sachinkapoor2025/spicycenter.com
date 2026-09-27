"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import { whatsappChatUrl } from "@/lib/site";
import { EVENT_TYPES } from "@spicycorner/shared";
import { trackEnquiryEvent } from "@/lib/track";

const BUYER_TYPES = [
  "Wholesaler",
  "White Label",
  "Retailer",
  "Restaurant",
  "Foodservice Distributor",
  "Other",
] as const;

const ENQUIRY_TYPES = ["Quote", "Bulk Order", "Sample Request", "General Enquiry"] as const;

export function WholesaleQuoteForm({
  defaultProduct = "",
  defaultCountry = "",
  defaultQuantity = "",
}: {
  defaultProduct?: string;
  defaultCountry?: string;
  defaultQuantity?: string;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    address: defaultCountry ? "" : "",
    buyerType: "",
    quantity: defaultQuantity,
    product: defaultProduct,
    enquiryType: "",
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
      quantity: defaultQuantity || current.quantity,
    }));
  }, [defaultProduct, defaultQuantity]);

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
    const contactName = `${form.firstName} ${form.lastName}`.trim();
    try {
      const sessionId = getOrCreateSessionId();
      await api("/leads", {
        method: "POST",
        sessionId,
        body: JSON.stringify({
          sessionId,
          name: contactName,
          email: form.email,
          phone: form.phone,
          page: typeof window !== "undefined" ? window.location.pathname : "/enquiry",
          source: "catalogue-enquiry",
          metadata: {
            company: form.company,
            contactName,
            firstName: form.firstName,
            lastName: form.lastName,
            address: form.address,
            buyerType: form.buyerType,
            country: defaultCountry,
            product: form.product,
            quantity: form.quantity,
            enquiryType: form.enquiryType,
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
        Thank you, {form.firstName}. We have your {form.enquiryType.toLowerCase() || "enquiry"}
        {form.product ? ` for ${form.product}` : ""}
        {form.quantity ? ` (${form.quantity})` : ""}. We reply with availability. This catalogue does not publish a price
        or a delivery date.
      </p>
    );
  }

  const fieldClass = "w-full border border-[#dcc9a8] rounded-lg px-3 py-2 text-base bg-paper";

  return (
    <form onSubmit={submit} className="grid gap-4 card-spice p-6 sm:p-8">
      <div>
        <p className="spice-kicker">Get in touch</p>
        <h2 className="font-serif text-2xl text-primary mt-1">Send us a message</h2>
        <p className="text-sm text-muted mt-2">
          Quotes, sample requests, bulk orders or a general question — tell us what you need and we will reply.
        </p>
      </div>
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block mb-1 font-medium">First name*</span>
          <input required className={fieldClass} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="block mb-1 font-medium">Last name</span>
          <input className={fieldClass} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="block mb-1 font-medium">Email*</span>
          <input required type="email" className={fieldClass} value={form.email} onChange={(e) => update("email", e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="block mb-1 font-medium">Phone number*</span>
          <input required type="tel" className={fieldClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </label>
      </div>
      <label className="text-sm">
        <span className="block mb-1 font-medium">Company name*</span>
        <input required className={fieldClass} value={form.company} onChange={(e) => update("company", e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="block mb-1 font-medium">Company address</span>
        <input className={fieldClass} value={form.address} onChange={(e) => update("address", e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="block mb-1 font-medium">What best describes you?*</span>
        <select required className={fieldClass} value={form.buyerType} onChange={(e) => update("buyerType", e.target.value)}>
          <option value="">Please select</option>
          {BUYER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="block mb-1 font-medium">Approximate quantity*</span>
        <textarea
          required
          value={form.quantity}
          onChange={(e) => update("quantity", e.target.value)}
          placeholder="Type the quantity you need, for example 25 kg, 500 gm, or 1 metric ton"
          className={`${fieldClass} min-h-20`}
        />
        <span className="block mt-1 text-xs text-muted">You choose the quantity. It is not a price.</span>
      </label>
      <label className="text-sm">
        <span className="block mb-1 font-medium">Product interested in</span>
        <input className={fieldClass} value={form.product} onChange={(e) => update("product", e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="block mb-1 font-medium">Enquiry type</span>
        <select className={fieldClass} value={form.enquiryType} onChange={(e) => update("enquiryType", e.target.value)}>
          <option value="">Please select</option>
          {ENQUIRY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="block mb-1 font-medium">Message</span>
        <textarea
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className={`${fieldClass} min-h-28`}
        />
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div className="flex flex-wrap gap-3 items-center">
        <button type="submit" disabled={loading} className="btn-primary justify-self-start disabled:opacity-50">
          {loading ? "Sending..." : "Send your enquiry"}
        </button>
        <a
          href={whatsappChatUrl(
            `Hi SpicyCenter, I would like to enquire about ${form.product || "Indian spices"}${form.quantity ? ` (${form.quantity})` : ""}.`
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
