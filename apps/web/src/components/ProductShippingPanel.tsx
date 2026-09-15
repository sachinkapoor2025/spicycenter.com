"use client";

import { quoteItemShipping } from "@/lib/quote-cart-shipping";
import { useCurrency } from "@/lib/currency-context";

export function ProductShippingPanel({
  price,
  currency = "USD",
}: {
  price: number;
  currency?: string;
}) {
  const { format, usdInrRate } = useCurrency();
  const quote = quoteItemShipping(price, currency, usdInrRate);
  const shippingLabel = quote.qualifiesForFreeShipping
    ? "FREE"
    : format(quote.charge, currency === "INR" ? "INR" : "USD");

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-start gap-2 rounded-md border border-orange-100 bg-orange-50/80 px-3 py-2.5 text-sm text-slate-700">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-nav"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0m-4 0V9m0 0H5.5M12 9h6.5M12 9L9 5m3 4l3-4"
          />
        </svg>
        <div className="min-w-0">
          <p>
            <span className="font-semibold text-primary">Delivering in 5–7 days</span>
          </p>
          <p className="mt-1 text-slate-800">
            Shipping for this item:{" "}
            <span className={quote.qualifiesForFreeShipping ? "font-bold text-accent" : "font-semibold"}>
              {shippingLabel}
            </span>
          </p>
          {!quote.qualifiesForFreeShipping && (
            <p className="mt-0.5 text-xs text-slate-600">
              Add {format(quote.amountAwayFromFreeShipping, currency === "INR" ? "INR" : "USD")} more to unlock
              free shipping when a threshold applies. Charged at checkout in your display currency.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
