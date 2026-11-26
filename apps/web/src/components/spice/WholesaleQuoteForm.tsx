"use client";

import { useState } from "react";
import { ALL_SPICE_ENTITIES } from "@/lib/spice/entities";
import { EMAIL_INPUT_PATTERN, EMAIL_INPUT_TITLE, isStrictEmail } from "@/lib/email";

export function WholesaleQuoteForm() {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [error, setError] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!isStrictEmail(String(data.email ?? ""))) {
      setError("Enter a valid email address.");
      setStatus("err");
      return;
    }
    setError("");
    const res = await fetch("/api/wholesale-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setStatus(res.ok ? "ok" : "err");
    if (res.ok) form.reset();
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 card-spice p-6">
      <input required name="company" placeholder="Company name" className="border rounded px-3 py-2" />
      <input required name="contactName" placeholder="Contact name" className="border rounded px-3 py-2" />
      <input required type="email" name="email" placeholder="Email" pattern={EMAIL_INPUT_PATTERN} title={EMAIL_INPUT_TITLE} className="border rounded px-3 py-2" />
      <input name="phone" placeholder="Phone" className="border rounded px-3 py-2" />
      <input required name="country" placeholder="Country" className="border rounded px-3 py-2" />
      <input name="vatNumber" placeholder="VAT / business number" className="border rounded px-3 py-2" />
      <select name="product" className="border rounded px-3 py-2" defaultValue="cumin">
        {ALL_SPICE_ENTITIES.slice(0, 80).map((s) => (
          <option key={s.slug} value={s.slug}>{s.canonicalName}</option>
        ))}
      </select>
      <input required name="quantity" placeholder="Quantity (kg)" className="border rounded px-3 py-2" />
      <input name="grade" placeholder="Required grade" className="border rounded px-3 py-2" />
      <input name="packaging" placeholder="Packaging" className="border rounded px-3 py-2" />
      <input name="deliveryLocation" placeholder="Delivery location" className="border rounded px-3 py-2" />
      <input type="date" name="requiredDate" className="border rounded px-3 py-2" />
      <textarea name="message" placeholder="Message" className="border rounded px-3 py-2 min-h-24" />
      <button className="btn-primary" type="submit">Request wholesale quote</button>
      {status === "ok" && <p className="text-sm text-green-800">Quote request received. We will reply by email.</p>}
      {status === "err" && <p className="text-sm text-red-800">{error || "Could not send. Email enquiry@spicycenter.com."}</p>}
    </form>
  );
}
