"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DISPLAY_CURRENCY_OPTIONS } from "@spicycorner/shared";
import { useCurrency } from "@/lib/currency-context";

export function CurrencySelect({
  variant = "inline",
  className = "",
}: {
  variant?: "inline" | "rail" | "header";
  className?: string;
}) {
  const { displayCurrency } = useCurrency();
  const labelId = useId();
  const selected = DISPLAY_CURRENCY_OPTIONS.find((o) => o.code === displayCurrency);

  if (variant === "header") {
    return (
      <CurrencySearchMenu
        className={className}
        placement="header"
        triggerLabel={selected?.code ?? displayCurrency}
        triggerClassName="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] sm:text-xs font-bold text-slate-800 hover:border-nav focus:outline-none focus:ring-2 focus:ring-accent"
      />
    );
  }

  if (variant === "inline") {
    return (
      <div className={className}>
        <p id={labelId} className="block text-xs font-semibold text-slate-500 mb-1">
          Currency
        </p>
        <CurrencySearchMenu
          labelledBy={labelId}
          placement="inline"
          triggerLabel={selected?.code ?? displayCurrency}
          triggerClassName="inline-flex items-center w-full max-w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 text-left"
        />
      </div>
    );
  }

  return (
    <CurrencySearchMenu
      className={className}
      placement="rail"
      triggerLabel={selected?.code ?? displayCurrency}
      triggerClassName="w-14 py-3 text-[11px] sm:text-xs font-bold tracking-wide text-white bg-primary hover:bg-primary/90"
    />
  );
}

function CurrencySearchMenu({
  className = "",
  placement,
  triggerLabel,
  triggerClassName,
  labelledBy,
}: {
  className?: string;
  placement: "header" | "inline" | "rail";
  triggerLabel: string;
  triggerClassName: string;
  labelledBy?: string;
}) {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DISPLAY_CURRENCY_OPTIONS;
    return DISPLAY_CURRENCY_OPTIONS.filter(
      (option) =>
        option.code.toLowerCase().includes(q) ||
        option.label.toLowerCase().includes(q) ||
        option.region.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const pick = (code: string) => {
    setDisplayCurrency(code);
    setOpen(false);
  };

  const panelClass =
    placement === "rail"
      ? "absolute right-full top-0 mr-1 w-52"
      : placement === "header"
        ? "absolute right-0 top-full mt-1 w-52"
        : "absolute left-0 top-full mt-1 w-52";

  return (
    <div ref={rootRef} className={`relative z-[70] ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={labelledBy}
        aria-label="Change display currency"
        className={triggerClassName}
      >
        {triggerLabel}
        <span className={placement === "rail" ? "block text-[9px] font-semibold opacity-80" : "ml-1 text-[9px] opacity-70"}>
          ▼
        </span>
      </button>
      {open && (
        <div
          className={`${panelClass} rounded-lg border border-slate-200 bg-white py-1 shadow-xl z-[80]`}
        >
          <div className="px-2 pb-1 pt-1">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered[0]) {
                  e.preventDefault();
                  pick(filtered[0].code);
                }
              }}
              placeholder="Search USD, GBP…"
              aria-label="Search currencies"
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">No matching currency</li>
            ) : (
              filtered.map((option) => (
                <li key={option.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.code === displayCurrency}
                    title={option.region}
                    onClick={() => pick(option.code)}
                    className={`w-full text-left px-3 py-1.5 text-xs ${
                      option.code === displayCurrency
                        ? "bg-orange-50 font-bold text-primary"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-semibold">{option.code}</span>
                    <span className="ml-1.5 text-slate-500">{option.region}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
