"use client";

import { useState, type FormEvent } from "react";

const empty = {
  company: "",
  contactName: "",
  email: "",
  phone: "",
  country: "GB",
  vatNumber: "",
  product: "",
  quantity: "10kg",
  grade: "",
  packaging: "",
  deliveryLocation: "",
  requiredDate: "",
  message: "",
};

export function WholesaleQuoteForm({ defaultProduct = "" }: { defaultProduct?: string }) {
  const [form, setForm] = useState({ ...empty, product: defaultProduct });
  const [done, setDone] = useState(false);

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const id = `WC-${10000 + Math.floor(Math.random() * 90000)}`;
    const blob = { id, ...form, createdAt: new Date().toISOString(), status: "new" };
    const key = "spicycorner-wholesale-quotes";
    const prev = JSON.parse(typeof window !== "undefined" ? localStorage.getItem(key) || "[]" : "[]");
    localStorage.setItem(key, JSON.stringify([blob, ...prev]));
    setDone(true);
  }

  if (done) {
    return (
      <p className="card-spice p-6">
        Thank you. Your wholesale inquiry has been saved for the team. We will reply with a quote — prices depend on grade, origin, crop, packaging and market.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 card-spice p-6">
      {[
        ["company", "Company name"],
        ["contactName", "Contact name"],
        ["email", "Email"],
        ["phone", "Phone"],
        ["country", "Country"],
        ["vatNumber", "VAT / business number"],
        ["product", "Product"],
        ["quantity", "Quantity (10kg minimum)"],
        ["grade", "Required grade"],
        ["packaging", "Packaging"],
        ["deliveryLocation", "Delivery location"],
        ["requiredDate", "Required delivery date"],
      ].map(([k, label]) => (
        <label key={k} className="text-sm">
          <span className="block mb-1 font-medium">{label}</span>
          <input
            required={["company", "contactName", "email", "phone", "product", "quantity", "deliveryLocation"].includes(k)}
            type={k === "email" ? "email" : k === "requiredDate" ? "date" : "text"}
            value={(form as Record<string, string>)[k]}
            onChange={(e) => update(k, e.target.value)}
            className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2"
          />
        </label>
      ))}
      <label className="text-sm">
        <span className="block mb-1 font-medium">Message</span>
        <textarea value={form.message} onChange={(e) => update("message", e.target.value)} className="w-full border border-[#dcc9a8] rounded-lg px-3 py-2 min-h-24" />
      </label>
      <button type="submit" className="btn-primary justify-self-start">Request wholesale quote</button>
    </form>
  );
}
