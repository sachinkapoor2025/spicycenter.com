"use client";

import Link from "next/link";
import { useState } from "react";
import { site, whatsappChatUrl } from "@/lib/site";
import { useSessionId } from "@/lib/session";
import { api } from "@/lib/api";

export function ReviewForm() {
  const sessionId = useSessionId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState("5");
  const [orderId, setOrderId] = useState("");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const sid = sessionId;
      if (!sid) throw new Error("Session not ready — please refresh and try again.");
      if (review.trim().length < 20) {
        throw new Error("Please write at least a few sentences about your experience.");
      }

      await api("/leads", {
        method: "POST",
        sessionId: sid,
        body: JSON.stringify({
          sessionId: sid,
          name,
          email,
          page: "/reviews",
          source: "review",
          metadata: {
            message: review.trim(),
            rating,
            city: city.trim(),
            orderId: orderId.trim(),
          },
        }),
      });

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-6 text-green-900">
        <p className="font-bold text-lg mb-2">Thank you for sharing!</p>
        <p className="text-sm leading-relaxed">
          Your review was sent to the SpicyCenter owner for approval. We will contact you for permission before displaying
          it on the website.
        </p>
        <Link href="/products" className="inline-block mt-4 text-sm font-semibold text-nav hover:underline">
          Continue shopping →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Your first name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City / state (optional)</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. San Jose, CA"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} star{n !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Order ID (optional)</label>
        <input
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="From your confirmation email"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Your experience</label>
        <textarea
          rows={5}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="How was delivery? Did you love your spice order? Would you recommend SpicyCenter?"
          required
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="btn-cart px-8 disabled:opacity-50">
        {loading ? "Submitting…" : "Submit review"}
      </button>
      <p className="text-xs text-slate-500">
        Prefer WhatsApp?{" "}
        <a href={whatsappChatUrl("Hi SpicyCenter, I'd like to share a review of my order.")} className="text-nav hover:underline">
          Message us with a photo
        </a>
        . We will review your submission first and ask for your permission before publishing it on {site.domain}.
      </p>
    </form>
  );
}
