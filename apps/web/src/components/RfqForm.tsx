"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EVENT_TYPES } from "@spicycorner/shared";
import { api } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import { trackEnquiryEvent } from "@/lib/track";
import { whatsappChatUrl } from "@/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNITS = ["KG", "MT", "Tons", "Bags", "Cartons"];
const FORMS = ["Whole", "Seeds", "Powder", "Flakes", "Crushed", "Blend", "Other"];

export function RfqForm({
  products,
  defaultProduct = "",
}: {
  products: readonly string[];
  defaultProduct?: string;
}) {
  const [product, setProduct] = useState(defaultProduct);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("KG");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [grade, setGrade] = useState("");
  const [form, setForm] = useState("Whole");
  const [packaging, setPackaging] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [specLink, setSpecLink] = useState("");
  const [website, setWebsite] = useState("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const options = useMemo(() => [...new Set(products.filter(Boolean))].sort((a, b) => a.localeCompare(b)), [products]);

  function markStarted() {
    if (started) return;
    setStarted(true);
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_START, { form: "sourcing-rfq" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (!product.trim() || !quantity.trim() || !destinationCountry.trim() || !grade.trim() || !packaging.trim() || !timeline.trim() || !company.trim() || !name.trim()) {
      setError("Please complete the required fields.");
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "sourcing-rfq" });
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Please enter a business email or a WhatsApp number.");
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid business email.");
      return;
    }
    if (phone.trim() && (digits.length < 8 || digits.length > 15)) {
      setError("Please enter a valid phone number with the country code.");
      return;
    }
    if (Number(quantity) <= 0 || Number.isNaN(Number(quantity))) {
      setError("Please enter a quantity greater than zero.");
      return;
    }

    setLoading(true);
    try {
      const sessionId = getOrCreateSessionId();
      await api("/leads", {
        method: "POST",
        sessionId,
        body: JSON.stringify({
          sessionId,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          page: window.location.pathname,
          source: "sourcing-rfq",
          metadata: {
            product: product.trim(),
            quantity: quantity.trim(),
            unit,
            destinationCountry: destinationCountry.trim(),
            destinationPort: destinationPort.trim(),
            grade: grade.trim(),
            productForm: form,
            packaging: packaging.trim(),
            targetPrice: targetPrice.trim(),
            timeline: timeline.trim(),
            company: company.trim(),
            specLink: specLink.trim(),
            message: notes.trim(),
            website,
          },
        }),
      });
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_SUBMIT, { form: "sourcing-rfq", product: product.trim() });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your requirement. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-5 text-green-900">
        <p className="font-semibold">Your requirement has been received.</p>
        <p className="mt-2 text-sm leading-relaxed">
          We will review the details and reply with questions or available supplier options. Specifications, price and availability are confirmed with the selected supplier.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      <label className="block text-sm sm:col-span-2">
        Product
        <input list="rfq-products" required value={product} onChange={(e) => setProduct(e.target.value)} onFocus={markStarted} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
        <datalist id="rfq-products">
          {options.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>
      <label className="block text-sm">
        Quantity
        <input required inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} onFocus={markStarted} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Unit
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base">
          {UNITS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Destination country
        <input required value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Destination port (optional)
        <input value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Grade or specification
        <input required value={grade} onChange={(e) => setGrade(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Product form
        <select value={form} onChange={(e) => setForm(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base">
          {FORMS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm sm:col-span-2">
        Packaging
        <input required value={packaging} onChange={(e) => setPackaging(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Target price (optional)
        <input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Delivery timeline
        <input required value={timeline} onChange={(e) => setTimeline(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Company
        <input required value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Your name
        <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        Business email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        WhatsApp or phone
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm sm:col-span-2">
        Specification link (optional)
        <input value={specLink} onChange={(e) => setSpecLink(e.target.value)} placeholder="Link to a specification file" className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      <label className="block text-sm sm:col-span-2">
        Additional requirements
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 w-full min-h-11 rounded-lg border border-[#e6d5bc] bg-white px-3 py-2 text-base" />
      </label>
      {error ? <p className="sm:col-span-2 text-sm text-red-700">{error}</p> : null}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={loading} className="btn-primary w-full sm:!w-auto justify-center px-5 py-3 text-sm font-semibold disabled:opacity-60">
          {loading ? "Sending…" : "Submit Your Requirement"}
        </button>
        <a
          href={whatsappChatUrl("Hello SpicyCenter, I would like to share a spice sourcing requirement.")}
          className="text-sm font-semibold text-nav"
          onClick={() => trackEnquiryEvent(EVENT_TYPES.WHATSAPP_CLICK, { form: "sourcing-rfq" })}
        >
          Or continue on WhatsApp
        </a>
      </div>
      <p className="sm:col-span-2 text-xs text-muted">
        File upload is not enabled. Share a link to your specification instead. SpicyCenter does not publish a price until a supplier quotation is confirmed.
      </p>
    </form>
  );
}
