"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  flushEvents,
  trackPageView,
  trackPageLeave,
  trackLivePresence,
  ensureVisitorGeo,
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
    if (pathname.startsWith("/admin") || pathname.startsWith("/ses-email")) return;
    const id = window.setInterval(() => {
      void ensureVisitorGeo().then(() => trackLivePresence());
    }, LIVE_PRESENCE_MS);
    return () => window.clearInterval(id);
  }, [pathname]);

  return null;
}
