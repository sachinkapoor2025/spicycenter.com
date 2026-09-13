"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function PendingPaymentUnsubscribeForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api<{ ok: boolean }>("/pending-payment-unsubscribe", {
        method: "POST",
        revalidate: false,
        body: JSON.stringify({ email: email.trim() }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unsubscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-900">
        <p className="font-semibold mb-1">You are unsubscribed</p>
        <p>
          We will no longer send pending-payment reminder emails to{" "}
          <span className="font-medium">{email.trim()}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Email address</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-nav/40"
          autoComplete="email"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-nav text-white font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Unsubscribe from payment reminders"}
      </button>
    </form>
  );
}
