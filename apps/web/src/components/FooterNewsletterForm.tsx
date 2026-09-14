"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";

export function FooterNewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      setStatus("err");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const sessionId = getOrCreateSessionId();
      await api("/leads", {
        method: "POST",
        sessionId,
        body: JSON.stringify({
          sessionId,
          email: trimmed,
          page: "/",
          source: "newsletter",
          metadata: { signup: "footer" },
        }),
      });
      setStatus("ok");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not subscribe. Please try again.");
      setStatus("err");
    }
  }

  if (status === "ok") {
    return <p className="text-sm text-primary font-medium">Thanks — we sent a note to our team and a confirmation to your inbox.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full md:w-auto flex-col sm:flex-row gap-2">
      <input
        type="email"
        name="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="flex-1 md:w-72 rounded-md border border-[#e6d5bc] bg-paper px-4 py-2.5 text-base md:text-sm text-primary"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-nav px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a74c1e] shrink-0 disabled:opacity-50"
      >
        {status === "sending" ? "Sending..." : "Subscribe"}
      </button>
      {error ? <p className="text-sm text-red-800 sm:col-span-2">{error}</p> : null}
    </form>
  );
}
