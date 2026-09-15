/** Badge for product cards and detail pages. */
export function FastSellingBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm ${className}`}
    >
      <span aria-hidden>🔥</span>
      Fast Selling
    </span>
  );
}

export function FastSellingBanner({ unitsSold }: { unitsSold: number }) {
  if (!unitsSold || unitsSold < 1) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 mb-3">
      <span className="text-2xl shrink-0" aria-hidden>
        🔥
      </span>
      <div>
        <p className="font-bold text-orange-900 text-sm">Popular with UK kitchens — {unitsSold}+ sold</p>
        <p className="text-xs text-orange-800/90 mt-0.5 leading-relaxed">
          Based on recorded storefront sales for this SKU. Stock is limited by lot.
        </p>
      </div>
    </div>
  );
}
