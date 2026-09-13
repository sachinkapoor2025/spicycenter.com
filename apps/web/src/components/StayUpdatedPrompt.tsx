"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";

const DISMISS_KEY = "spicycorner_stay_updated_dismissed";
const SUBSCRIBED_KEY = "spicycorner_stay_updated_subscribed";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Compact “Stay Updated” control for the festival banner (not the sticky header).
 * Captures newsletter leads so admin can email offers / top sellers.
 */
export function StayUpdatedPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"prompt" | "email" | "done">("prompt");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/ses-email")) {
      setHidden(true);
      return;
    }
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY) || localStorage.getItem(DISMISS_KEY)) {
        setHidden(true);
        return;
      }
    } catch {
      /* ignore */
    }
    setHidden(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    setHidden(true);
  };

  const onAllow = () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
    setStep("email");
    setError("");
  };

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const sessionId = getOrCreateSessionId();
      await api("/leads", {
        method: "POST",
        sessionId,
        body: JSON.stringify({
          sessionId,
          email: trimmed,
          page: pathname || "/",
          source: "newsletter",
          metadata: {
            stayUpdated: "1",
            intent: "offers_top_sellers",
          },
        }),
      });
      try {
        localStorage.setItem(SUBSCRIBED_KEY, "1");
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        /* ignore */
      }
      setStep("done");
      setTimeout(() => {
        setOpen(false);
        setHidden(true);
      }, 1600);
    } catch {
      setError("Could not subscribe right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative shrink-0" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setStep("prompt");
          setError("");
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/35 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg className="w-3.5 h-3.5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        Stay Updated
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Stay Updated"
          className="absolute right-0 top-full z-[80] mt-2 w-[min(92vw,280px)] rounded-xl border border-slate-200 bg-[#f7f7f5] p-4 shadow-xl text-left"
        >
          {step === "done" ? (
            <p className="text-sm font-semibold text-slate-800 text-center py-2">
              You&apos;re on the list — thanks!
            </p>
          ) : step === "email" ? (
            <form onSubmit={subscribe} className="space-y-3">
              <div className="text-center">
                <p className="text-base font-bold text-slate-800">Stay Updated!</p>
                <p className="mt-1 text-xs text-slate-600">
                  Share your email for new offers and top-selling spice picks.
                </p>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-nav"
              />
              {error && <p className="text-xs text-red-600 text-center">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex-1 rounded-lg bg-slate-300 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-400"
                >
                  No, Thanks
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#5c6b3d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4a5732] disabled:opacity-60"
                >
                  {saving ? "…" : "Allow"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-base font-bold text-slate-800">Stay Updated!</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Allow notifications to receive the latest offers and updates.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex-1 rounded-lg bg-slate-300 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-400"
                >
                  No, Thanks
                </button>
                <button
                  type="button"
                  onClick={onAllow}
                  className="flex-1 rounded-lg bg-[#5c6b3d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4a5732]"
                >
                  Allow
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
