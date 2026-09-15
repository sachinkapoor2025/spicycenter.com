"use client";

import { useEffect, useState } from "react";
import { SPICE_QUOTES } from "@/lib/i18n/quotes";

const ROTATE_MS = 15_000;

export function QuoteRibbon() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % SPICE_QUOTES.length);
        setVisible(true);
      }, 380);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const quote = SPICE_QUOTES[index];

  return (
    <div
      data-no-i18n
      className="flex-1 min-w-0 text-center md:text-left"
      aria-live="polite"
    >
      <p
        className={`font-quote text-[16px] sm:text-[18px] md:text-[20px] leading-snug transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ color: "#f8efe2" }}
      >
        <span className="italic" style={{ color: "#f3e6c8" }}>
          “{quote.text}”
        </span>
        <span className="mx-2" style={{ color: "#d4a017" }}>
          —
        </span>
        <span className="not-italic font-semibold tracking-wide" style={{ color: "#d4a017" }}>
          {quote.author}
        </span>
      </p>
    </div>
  );
}
