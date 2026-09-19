"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  flushEvents,
  trackPageView,
  trackPageLeave,
  trackLivePresence,
  ensureVisitorGeo,
  trackWebVital,
} from "@/lib/track";
import { captureAttributionFromLocation } from "@/lib/attribution-store";

const LIVE_PRESENCE_MS = 30_000;

/** Emits a page_view on every route change and flushes the event queue on unload. */
export function TrackingProvider() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttributionFromLocation();
    void ensureVisitorGeo().then(() => {
      trackPageLeave();
      trackPageView(pathname);
      trackLivePresence();
    });
  }, [pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        trackPageLeave();
        flushEvents();
      } else {
        void ensureVisitorGeo().then(() => trackLivePresence());
      }
    };
    const onPageHide = () => {
      trackPageLeave();
      flushEvents();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;
    const seen = new Set<string>();
    const report = (name: string, value: number) => {
      const key = `${name}:${Math.round(value)}`;
      if (seen.has(key)) return;
      seen.add(key);
      trackWebVital(name, value);
    };
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          report("LCP", entry.startTime);
        }
        if (entry.entryType === "layout-shift" && !(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          report("CLS", Number((entry as PerformanceEntry & { value?: number }).value ?? 0));
        }
        if (entry.entryType === "event" && "interactionId" in entry) {
          const e = entry as PerformanceEntry & { duration?: number };
          report("INP", e.duration ?? entry.duration);
        }
      }
    });
    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observer.observe({ type: "layout-shift", buffered: true });
      observer.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    } catch {
      /* older browsers */
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/ses-email")) return;
    const id = window.setInterval(() => {
      void ensureVisitorGeo().then(() => trackLivePresence());
    }, LIVE_PRESENCE_MS);
    return () => window.clearInterval(id);
  }, [pathname]);

  return null;
}
