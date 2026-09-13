"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useSessionId } from "@/lib/session";
import { formatCouponExpiry } from "@/lib/welcome-coupon";
import {
  applyCouponToOrderTotals,
  isTestOrderCoupon,
  TEST_ORDER_FORCE_TOTAL_USD,
  type DisplayCurrency,
  type ShopCurrency,
} from "@spicycorner/shared";

export type AppliedCouponMeta = {
  code: string;
  kind?: string;
  discountPercent?: number;
};

type Props = {
  email: string;
  phone?: string;
  /** Subtotal coupons may discount (excludes flash-sale / couponExcluded lines). */
  subtotal: number;
  shipping?: number;
  currency: DisplayCurrency;
  payCurrency?: ShopCurrency;
  usdInrRate?: number;
  formatMoney: (amount: number, currency: DisplayCurrency) => string;
  initialCode?: string;
  /** When true, flash-sale lines are in the cart — coupons skip those lines. */
  hasCouponExcludedItems?: boolean;
  onApplied: (discount: number, code: string, meta?: AppliedCouponMeta) => void;
  onCleared: () => void;
};

export function CouponInput({
  email,
  phone = "",
  subtotal,
  shipping = 0,
  currency,
  payCurrency,
  usdInrRate = 0,
  formatMoney,
  initialCode = "",
  hasCouponExcludedItems = false,
  onApplied,
  onCleared,
}: Props) {
  const sessionId = useSessionId();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<{
    code: string;
    kind?: string;
    discountPercent?: number;
    expiresAt: string;
  } | null>(null);

  const checkoutCurrency: ShopCurrency = payCurrency ?? (currency === "INR" ? "INR" : "USD");
  const priced = useMemo(() => {
    if (!applied) return null;
    return applyCouponToOrderTotals({
      kind: applied.kind,
      discountPercent: applied.discountPercent,
      eligibleSubtotal: subtotal,
      subtotal,
      shipping,
      currency: checkoutCurrency,
      usdInrRate,
    });
  }, [applied, subtotal, shipping, checkoutCurrency, usdInrRate]);

  const apply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const hasEmail = Boolean(email.trim() && email.includes("@"));
    const hasPhone = phone.replace(/\D/g, "").length >= 7;
    if (!hasEmail && !hasPhone) {
      setError("Enter your mobile number or email in the shipping form first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api<{
        valid: boolean;
        code?: string;
        discountPercent?: number;
        expiresAt?: string;
        error?: string;
        kind?: string;
        forceTotalUsd?: number;
      }>("/coupons/validate", {
        method: "POST",
        sessionId: sessionId ?? undefined,
        body: JSON.stringify({
          code: trimmed,
          ...(hasEmail ? { email: email.trim() } : {}),
          ...(hasPhone ? { phone: phone.trim() } : {}),
        }),
      });

      if (!result.valid || !result.code) {
        throw new Error(result.error ?? "Invalid coupon");
      }

      const testOrder = isTestOrderCoupon(result);
      if (!testOrder && (!result.discountPercent || subtotal <= 0)) {
        throw new Error(
          subtotal <= 0 ? "Coupons cannot be applied to flash sale items" : (result.error ?? "Invalid coupon")
        );
      }

      const next = {
        code: result.code,
        kind: result.kind,
        discountPercent: result.discountPercent,
        expiresAt: result.expiresAt ?? "",
      };
      const amounts = applyCouponToOrderTotals({
        kind: next.kind,
        discountPercent: next.discountPercent,
        eligibleSubtotal: subtotal,
        subtotal,
        shipping,
        currency: checkoutCurrency,
        usdInrRate,
      });
      setApplied(next);
      onApplied(amounts.discount, result.code, {
        code: result.code,
        kind: result.kind,
        discountPercent: result.discountPercent,
      });
    } catch (err) {
      setApplied(null);
      onCleared();
      setError(err instanceof Error ? err.message : "Could not apply coupon");
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    setApplied(null);
    setError("");
    onCleared();
  };

  const testApplied = isTestOrderCoupon(applied);

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
      <p className="text-sm font-semibold text-slate-900">Coupon code</p>
      <p className="text-xs text-slate-500">
        One coupon can be applied per order.
        {hasCouponExcludedItems
          ? " Flash sale items are excluded from coupon discounts."
          : ""}
      </p>
      {applied && priced ? (
        <div className="text-sm space-y-1">
          <p className="text-green-700 font-medium">
            {testApplied
              ? `${applied.code} applied — test order total ${formatMoney(priced.total, checkoutCurrency)} (includes shipping)`
              : `${applied.code} applied — ${applied.discountPercent}% off (−${formatMoney(priced.discount, checkoutCurrency)})`}
          </p>
          {applied.expiresAt && (
            <p className="text-xs text-slate-500">Expires {formatCouponExpiry(applied.expiresAt)}</p>
          )}
          {testApplied && (
            <p className="text-xs text-amber-800">
              Admin test coupon: pay ${TEST_ORDER_FORCE_TOTAL_USD} regardless of cart and shipping.
            </p>
          )}
          <button type="button" onClick={remove} className="text-xs text-nav hover:underline">
            Remove coupon
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SPICY-XXXXXX"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase"
            />
            <button
              type="button"
              onClick={() => void apply()}
              disabled={loading || !code.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "…" : "Apply"}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </>
      )}
    </div>
  );
}
