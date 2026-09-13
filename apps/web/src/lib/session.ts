"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { api } from "./api";

const SESSION_KEY = "hr_ecom_session";

/** Get or create session id from localStorage (client only). */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useSessionId(): string {
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  return sessionId;
}

export function useLeadCapture(sessionId: string) {
  return useCallback(
    async (fields: {
      name?: string;
      email?: string;
      phone?: string;
      page?: string;
      productSlug?: string;
      source?: "checkout" | "newsletter" | "product" | "browse" | "admin" | "contact" | "chat";
    }) => {
      const sid = sessionId || getOrCreateSessionId();
      if (!sid) return;
      try {
        await api("/leads", {
          method: "POST",
          sessionId: sid,
          body: JSON.stringify({ sessionId: sid, ...fields }),
        });
      } catch {
        /* silent — lead capture should not block UX */
      }
    },
    [sessionId]
  );
}

export function useDebouncedLeadCapture(sessionId: string, delay = 800) {
  const capture = useLeadCapture(sessionId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (fields: Parameters<typeof capture>[0]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => capture(fields), delay);
    },
    [capture, delay]
  );
}
