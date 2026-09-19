"use client";

import { useEffect, useState } from "react";
import { EVENT_TYPES } from "@spicycorner/shared";
import { trackEnquiryEvent } from "@/lib/track";
import Link from "next/link";
import { site, whatsappChatUrl } from "@/lib/site";
import { useSessionId } from "@/lib/session";
import { api } from "@/lib/api";
import { StoreLocations } from "@/components/StoreLocations";
import { PhoneInput, buildPhoneValue } from "@/components/PhoneInput";
import { DEFAULT_COUNTRY_ISO } from "@/lib/country-codes";

export function ContactForm() {
  const sessionId = useSessionId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const [website, setWebsite] = useState("");
  const [formStarted, setFormStarted] = useState(false);

  useEffect(() => {
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_VIEW, { form: "contact" });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sid = sessionId;
      if (!sid) throw new Error("Session not ready");
      const phone = buildPhoneValue(countryIso, phoneLocal);
      if (phoneLocal.replace(/\D/g, "").length < 6) {
        throw new Error("Please enter a valid phone number");
      }

      await api("/leads", {
        method: "POST",
        sessionId: sid,
        body: JSON.stringify({
          sessionId: sid,
          name,
          email,
          phone,
          page: "/contact",
          source: "contact",
          metadata: { message, countryIso, website },
        }),
      });
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_SUBMIT, { form: "contact" });

      setSubmittedEmail(email);
      setSent(true);
      setName("");
      setEmail("");
      setCountryIso(DEFAULT_COUNTRY_ISO);
      setPhoneLocal("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "contact" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-6">Contact Us</h1>
      <p className="text-slate-600 mb-8">
        Have questions about your spice order or delivery? We can help before, during, and after spice.
        For cutoffs and transit times, see{" "}
        <Link href="/shipping" className="text-nav hover:underline">
          shipping and delivery
        </Link>
        . Common answers also live on our{" "}
        <Link href="/faq" className="text-nav hover:underline">
          FAQ page
        </Link>
        .
      </p>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="border border-slate-200 rounded-xl p-6">
          <h2 className="font-bold text-primary mb-2">Email</h2>
          <a href={`mailto:${site.supportEmail}`} className="text-nav hover:underline">
            {site.supportEmail}
          </a>
        </div>
        <div className="border border-slate-200 rounded-xl p-6">
          <h2 className="font-bold text-primary mb-2">WhatsApp</h2>
          <a
            href={whatsappChatUrl("Hi SpicyCenter, I have a question about my order.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-nav hover:underline"
          >
            Chat on WhatsApp
          </a>
        </div>
        <div className="border border-slate-200 rounded-xl p-6">
          <h2 className="font-bold text-primary mb-2">Delivery</h2>
          <p className="text-slate-600 text-sm">Delivering in 5–7 days.</p>
        </div>
      </div>
      <div className="mb-10">
        <StoreLocations variant="light" />
      </div>

      {sent ? (
        <div className="border border-green-200 bg-green-50 rounded-xl p-6 text-green-800">
          <p className="font-semibold mb-2">Message sent!</p>
          <p className="text-sm">
            We&apos;ll get back to you at {submittedEmail} as soon as possible. A confirmation email has been sent to
            your inbox (check spam if you don&apos;t see it).
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 border border-slate-200 rounded-xl p-6 bg-slate-50">
          <label className="hidden" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                if (!formStarted) {
                  setFormStarted(true);
                  trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_START, { form: "contact" });
                }
                setName(e.target.value);
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
              placeholder="you@email.com"
              required
            />
          </div>
          <PhoneInput
            countryIso={countryIso}
            localNumber={phoneLocal}
            onCountryChange={setCountryIso}
            onLocalNumberChange={setPhoneLocal}
            required
            placeholder="98765 43210"
          />
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
              placeholder="How can we help?"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-cart px-8 disabled:opacity-50">
            {loading ? "Sending..." : "Send Message"}
          </button>
          <p className="text-xs text-slate-500">
            For order tracking, use your confirmation email or visit{" "}
            <Link href="/account" className="text-nav hover:underline">
              My Account
            </Link>
            .
          </p>
        </form>
      )}
    </div>
  );
}
