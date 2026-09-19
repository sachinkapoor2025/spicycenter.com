"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatInrPerKg,
  formatMandiDate,
  MANDI_BOARD_PAGE_SIZE,
  type LiveMandiPriceRow,
} from "@/lib/live-mandi-prices";

function MandiCard({ p, compact }: { p: LiveMandiPriceRow; compact: boolean }) {
  return (
    <article className="rounded-2xl border border-[#e6d5bc] bg-white p-5 shadow-[0_1px_0_rgba(90,58,32,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl text-primary">
          <Link href={`/spice-guide/${p.slug}`} className="hover:text-nav">
            {p.spiceName}
          </Link>
        </h3>
        {p.available ? (
          <span className="shrink-0 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold uppercase tracking-wide px-2 py-1">
            Live
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[#f4eadc] text-earth text-[11px] font-semibold uppercase tracking-wide px-2 py-1">
            Pending
          </span>
        )}
      </div>
      <p className="mt-3 font-serif text-3xl text-primary">{formatInrPerKg(p.inrPerKg)}</p>
      <p className="text-xs text-muted mt-1">
        {p.available ? "Average modal across reporting mandis" : "No Agmarknet print for this spice yet"}
      </p>
      {p.available && (p.minInrPerKg != null || p.maxInrPerKg != null) && (
        <p className="text-sm text-muted mt-3">
          Range {formatInrPerKg(p.minInrPerKg)} – {formatInrPerKg(p.maxInrPerKg)}
        </p>
      )}
      <p className="text-sm text-muted mt-2">
        {p.marketCount ? `${p.marketCount.toLocaleString("en-IN")} markets` : "Markets pending"}
        {p.arrivalDate ? ` · arrivals ${formatMandiDate(p.arrivalDate)}` : ""}
      </p>
      {!compact && p.grades.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted border-t border-[#eadfce] pt-3">
          {p.grades.map((g) => (
            <li key={g.label} className="flex justify-between gap-3">
              <span>{g.label}</span>
              <span>{formatInrPerKg(g.inrPerKg)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ProductFilter({
  prices,
  selected,
  onChange,
}: {
  prices: LiveMandiPriceRow[];
  selected: string[];
  onChange: (slugs: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prices.filter((p) => !q || p.spiceName.toLowerCase().includes(q) || p.slug.includes(q));
  }, [prices, query]);

  return (
    <div className="min-w-[16rem] max-w-md w-full">
      <label htmlFor="mandi-product-filter" className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
        Filter products
      </label>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search spices…"
        className="mb-2 w-full rounded-xl border border-[#e6d5bc] bg-white px-3 py-2 text-sm"
      />
      <select
        id="mandi-product-filter"
        multiple
        value={selected}
        size={8}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
        className="w-full rounded-xl border border-[#e6d5bc] bg-white px-2 py-2 text-sm text-primary"
      >
        {options.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.spiceName}
            {p.available ? " · Live" : " · Pending"}
          </option>
        ))}
      </select>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Select one or more. Empty selection shows all spices.</p>
        {selected.length > 0 && (
          <button type="button" className="text-xs text-nav font-semibold shrink-0" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function LiveMandiPriceBoard({
  prices,
  compact = false,
  pageSize = MANDI_BOARD_PAGE_SIZE,
}: {
  prices: LiveMandiPriceRow[];
  compact?: boolean;
  pageSize?: number;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (selected.length === 0) return prices;
    const set = new Set(selected);
    return prices.filter((p) => set.has(p.slug));
  }, [prices, selected]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = compact ? filtered : filtered.slice(start, start + pageSize);

  function changeFilter(slugs: string[]) {
    setSelected(slugs);
    setPage(1);
  }

  if (prices.length === 0) {
    return (
      <p className="mt-8 text-muted">
        Today&apos;s Agmarknet prints have not landed yet. The daily fetch usually fills this board after Indian mandis
        report. Check back later — these figures move every day.
      </p>
    );
  }

  return (
    <div className="mt-8">
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
          <ProductFilter prices={prices} selected={selected} onChange={changeFilter} />
          <p className="text-sm text-muted">
            Showing {visible.length} of {filtered.length} spices
            {filtered.length !== prices.length ? ` (filtered from ${prices.length})` : ""} · {pageSize} per page
          </p>
        </div>
      )}
      {visible.length === 0 ? (
        <p className="text-muted">No spices match that filter.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((p) => (
            <MandiCard key={p.slug} p={p} compact={compact} />
          ))}
        </div>
      )}
      {!compact && totalPages > 1 && (
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Market price pages">
          <button
            type="button"
            className="rounded-lg border border-[#e6d5bc] bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-current={n === safePage ? "page" : undefined}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                n === safePage
                  ? "border-nav bg-nav text-white"
                  : "border-[#e6d5bc] bg-white text-primary"
              }`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="rounded-lg border border-[#e6d5bc] bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
