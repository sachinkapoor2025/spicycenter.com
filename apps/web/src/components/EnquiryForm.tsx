"use client";

import { useEffect, useState, type FormEvent } from "react";
import { EVENT_TYPES } from "@spicycorner/shared";
import { api } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";
import { trackEnquiryEvent } from "@/lib/track";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EnquiryForm({
  defaultProduct = "",
  onSuccess,
}: {
  defaultProduct?: string;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [productName, setProductName] = useState(defaultProduct);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [formStarted, setFormStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setProductName(defaultProduct);
  }, [defaultProduct]);

  useEffect(() => {
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_VIEW, { form: "product" });
  }, []);

  function markStarted() {
    if (formStarted) return;
    setFormStarted(true);
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_START, { form: "product" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedProduct = productName.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!trimmedEmail && !trimmedPhone) {
      setError("Please enter an email address or a phone number.");
      return;
    }
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (trimmedPhone && trimmedPhone.replace(/\D/g, "").length < 6) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (!trimmedProduct) {
      setError("Please enter the product you are enquiring about.");
      return;
    }
    if (!trimmedMessage) {
      setError("Please add a short message.");
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
          name: trimmedName,
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
          page: typeof window !== "undefined" ? window.location.pathname : "/",
          source: "product",
          metadata: {
            product: trimmedProduct,
            message: trimmedMessage,
            website,
          },
        }),
      });
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_SUBMIT, { form: "product" });
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your enquiry. Please try again.");
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "product" });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-5 text-green-900">
        <p className="font-semibold text-base">Thank you — your enquiry has been sent.</p>
        <p className="text-sm mt-2 leading-relaxed">
          Our team will get back to you shortly with availability and next steps. If you need a faster reply, you can
          also use Contact Us or WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      <div>
        <label htmlFor="enquiry-name" className="block text-sm font-medium text-primary mb-1">
          Name <span className="text-chili">*</span>
        </label>
        <input
          id="enquiry-name"
          type="text"
          value={name}
          onChange={(e) => {
            markStarted();
            setName(e.target.value);
          }}
          className="w-full border border-[#e6d5bc] rounded-lg px-3 py-2.5 text-base bg-white"
          placeholder="Your name"
          autoComplete="name"
          required
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="enquiry-email" className="block text-sm font-medium text-primary mb-1">
            Email
          </label>
          <input
            id="enquiry-email"
            type="email"
            value={email}
            onChange={(e) => {
              markStarted();
              setEmail(e.target.value);
            }}
            className="w-full border border-[#e6d5bc] rounded-lg px-3 py-2.5 text-base bg-white"
            placeholder="you@email.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="enquiry-phone" className="block text-sm font-medium text-primary mb-1">
            Phone
          </label>
          <input
            id="enquiry-phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              markStarted();
              setPhone(e.target.value);
            }}
            className="w-full border border-[#e6d5bc] rounded-lg px-3 py-2.5 text-base bg-white"
            placeholder="+44 7700 900000"
            autoComplete="tel"
          />
        </div>
      </div>
      <p className="text-xs text-muted -mt-2">Email or phone is required.</p>
      <div>
        <label htmlFor="enquiry-product" className="block text-sm font-medium text-primary mb-1">
          Product name <span className="text-chili">*</span>
        </label>
        <input
          id="enquiry-product"
          type="text"
          value={productName}
          onChange={(e) => {
            markStarted();
            setProductName(e.target.value);
          }}
          className="w-full border border-[#e6d5bc] rounded-lg px-3 py-2.5 text-base bg-white"
          placeholder="e.g. Cumin 1kg"
          required
        />
      </div>
      <div>
        <label htmlFor="enquiry-message" className="block text-sm font-medium text-primary mb-1">
          Message <span className="text-chili">*</span>
        </label>
        <textarea
          id="enquiry-message"
          rows={4}
          value={message}
          onChange={(e) => {
            markStarted();
            setMessage(e.target.value);
          }}
          className="w-full border border-[#e6d5bc] rounded-lg px-3 py-2.5 text-base bg-white"
          placeholder="Quantity, pack size, delivery country, or any other details"
          required
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto disabled:opacity-50">
        {loading ? "Sending..." : "Send enquiry"}
      </button>
    </form>
  );
}
