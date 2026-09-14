"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import { whatsappChatUrl } from "@/lib/site";

const BUYER_TYPES = [
  "Restaurant",
  "Hotel",
  "Caterer",
  "Importer",
  "Distributor",
  "Retailer",
  "Food manufacturer",
  "Other",
] as const;

const QUANTITIES = ["10–25 kg", "25–50 kg", "50–100 kg", "100–500 kg", "500 kg+"] as const;

const empty = {
  company: "",
  contactName: "",
  email: "",
  phone: "",
  country: "GB",
  vatNumber: "",
  buyerType: "Restaurant",
  product: "",
  quantity: "10–25 kg",
  grade: "",
  packaging: "",
  deliveryLocation: "",
  requiredDate: "",
  message: "",
};

export function WholesaleQuoteForm({ defaultProduct = "" }: { defaultProduct?: string }) {
  const [form, setForm] = useState({ ...empty, product: defaultProduct });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sessionId = getOrCreateSessionId();
      const metadata: Record<string, string> = {
        company: form.company,
        contactName: form.contactName,
        country: form.country,
        vatNumber: form.vatNumber,
        buyerType: form.buyerType,
        product: form.product,
        quantity: form.quantity,
        grade: form.grade,
        packaging: form.packaging,
        deliveryLocation: form.deliveryLocation,
        requiredDate: form.requiredDate,
        message: form.message,
      };
      await api("/leads", {
        method: "POST",
        sessionId,
        body: JSON.stringify({
          sessionId,
          name: form.contactName,
          email: form.email,
          phone: form.phone,
          page: typeof window !== "undefined" ? window.location.pathname : "/wholesale",
          source: "wholesale",
          metadata,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your quote request.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="card-spice p-6">
        Thank you. Your wholesale enquiry has been emailed to our team. We will reply with a quote — prices depend on
        grade, origin, crop, packaging and market.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 card-spice p-6">
      <p className="text-sm font-semibold">10kg minimum wholesale order</p>
      <label className="text-sm">
        <span className="block mb-1 font-medium">I am a</span>
        <select
          value={form.buyerType}
          onChange={(e) => update("buyerType", e.target.value)}
          className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2 text-base bg-paper"
        >
          {BUYER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {[
        ["company", "Company name"],
        ["contactName", "Contact name"],
        ["email", "Email"],
        ["phone", "Phone"],
        ["country", "Country"],
        ["vatNumber", "VAT / business number"],
        ["product", "Product"],
        ["grade", "Required grade"],
        ["packaging", "Packaging"],
        ["deliveryLocation", "Delivery location / postcode"],
        ["requiredDate", "Required delivery date"],
      ].map(([k, label]) => (
        <label key={k} className="text-sm">
          <span className="block mb-1 font-medium">{label}</span>
          <input
            required={["company", "contactName", "email", "phone", "product", "deliveryLocation"].includes(k)}
            type={k === "email" ? "email" : k === "requiredDate" ? "date" : "text"}
            value={(form as Record<string, string>)[k]}
            onChange={(e) => update(k, e.target.value)}
            className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2 text-base"
          />
        </label>
      ))}
      <label className="text-sm">
        <span className="block mb-1 font-medium">Quantity</span>
        <select
          value={form.quantity}
          onChange={(e) => update("quantity", e.target.value)}
          className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2 text-base bg-paper"
        >
          {QUANTITIES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="block mb-1 font-medium">Message</span>
        <textarea
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2 min-h-24"
        />
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <div className="flex flex-wrap gap-3 items-center">
        <button type="submit" disabled={loading} className="btn-primary justify-self-start disabled:opacity-50">
          {loading ? "Sending..." : "Request Wholesale Quote"}
        </button>
        <a
          href={whatsappChatUrl("Hi SpicyCenter, I need a wholesale quote for Indian spices.")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-nav font-semibold"
        >
          WhatsApp the trade desk
        </a>
      </div>
    </form>
  );
}
