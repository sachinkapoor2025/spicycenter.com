import Link from "next/link";
import { formatInrPerKg, formatMandiDate, type LiveMandiPriceRow } from "@/lib/live-mandi-prices";

export function LiveMandiPriceBoard({
  prices,
  compact = false,
}: {
  prices: LiveMandiPriceRow[];
  compact?: boolean;
}) {
  if (prices.length === 0) {
    return (
      <p className="mt-8 text-muted">
        Today&apos;s Agmarknet prints have not landed yet. The daily fetch usually fills this board after Indian mandis
        report. Check back later — these figures move every day.
      </p>
    );
  }

  return (
    <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {prices.map((p) => (
        <article
          key={p.slug}
          className="rounded-2xl border border-[#e6d5bc] bg-white p-5 shadow-[0_1px_0_rgba(90,58,32,0.04)]"
        >
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
          <p className="text-xs text-muted mt-1">Average modal across reporting mandis</p>
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
      ))}
    </div>
  );
}
