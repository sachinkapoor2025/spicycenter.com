"use client";

import {
  FREE_SHIPPING_MIN_SUBTOTAL_USD,
  SHIPPING_RATE_BANDS,
  type FreeShippingQuote,
} from "@spicycorner/shared";
import type { DisplayCurrency } from "@/lib/currency-context";

type Props = {
  quote: FreeShippingQuote;
  formatMoney: (amount: number, currency: DisplayCurrency) => string;
  currency: DisplayCurrency;
  className?: string;
};

function usdLabel(amountUsd: number, formatMoney: Props["formatMoney"]): string {
  return formatMoney(amountUsd, "USD");
}

/** Upsell when cart is below the free-shipping threshold. */
export function FreeShippingNotice({ quote, formatMoney, currency, className = "" }: Props) {
  if (quote.qualifiesForFreeShipping) {
    return (
      <div
        className={`text-xs text-green-800 bg-green-50 border border-green-100 rounded-md px-3 py-2 ${className}`}
      >
        <p className="font-semibold">
          Free shipping unlocked on this order ({usdLabel(FREE_SHIPPING_MIN_SUBTOTAL_USD, formatMoney)}+).
        </p>
      </div>
    );
  }

  const currentFee = formatMoney(quote.charge, currency);

  return (
    <div
      className={`text-xs text-amber-950 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 ${className}`}
    >
      <p className="font-semibold mb-1">Shipping today: {currentFee}</p>
      <ul className="list-disc pl-4 space-y-0.5 leading-snug">
        {SHIPPING_RATE_BANDS.map((band) => (
          <li key={band.minUsd}>
            {band.minUsd === 0 ? (
              <>
                Cart under {usdLabel(band.maxUsd, formatMoney)} →{" "}
                <strong>{usdLabel(band.feeUsd, formatMoney)} shipping</strong>
              </>
            ) : (
              <>
                Cart {usdLabel(band.minUsd, formatMoney)}+ →{" "}
                <strong>{usdLabel(band.feeUsd, formatMoney)} shipping</strong>
              </>
            )}
          </li>
        ))}
        <li>
          Cart {usdLabel(FREE_SHIPPING_MIN_SUBTOTAL_USD, formatMoney)}+ → <strong>free shipping</strong>
        </li>
      </ul>
    </div>
  );
}
