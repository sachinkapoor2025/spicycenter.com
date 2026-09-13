"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient, useAuth } from "@/lib/auth-context";
import {
  ADMIN_OUTREACH_DISCOUNT_OPTIONS,
  ADMIN_CONFIRMED_SALE_DISCOUNT_PERCENT,
  ADMIN_CONFIRMED_SALE_COUPON_HOURS,
  ADMIN_MANUAL_COUPON_HOURS,
  ADMIN_EXTREME_DISCOUNT_MIN,
  ADMIN_EXTREME_DISCOUNT_MAX,
  isAdminConfirmedSaleDiscount,
  isAdminExtremeDiscount,
  isTestOrderCoupon,
  TEST_ORDER_COUPON_MINUTES,
  TEST_ORDER_FORCE_TOTAL_USD,
  type StoreCoupon,
} from "@spicycorner/shared";
import { PhoneInput, buildPhoneValue } from "@/components/PhoneInput";

type CreateResult = {
  coupon: StoreCoupon & { phone?: string; createdBy?: string; confirmedSale?: boolean };
  emails: {
    customerOk: boolean;
    notifyOk: boolean;
    customerError?: string;
    notifyError?: string;
  };
  whatsapp: {
    sent: boolean;
    skipped?: boolean;
    provider?: string;
    deepLink: string;
    error?: string;
  };
};

type DiscountMode = "outreach" | "special";

export function CouponsPanel() {
  const api = useApiClient();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("IN");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("outreach");
  const [outreachPercent, setOutreachPercent] = useState<number>(10);
  const [specialPercent, setSpecialPercent] = useState<string>(
    String(ADMIN_CONFIRMED_SALE_DISCOUNT_PERCENT)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastWhatsAppLink, setLastWhatsAppLink] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testPhoneCountry, setTestPhoneCountry] = useState("US");
  const [testPhoneLocal, setTestPhoneLocal] = useState("");
  const [testSaving, setTestSaving] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testError, setTestError] = useState("");
  const [lastTestCode, setLastTestCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [rows, setRows] = useState<StoreCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  const discountPercent =
    discountMode === "outreach"
      ? outreachPercent
      : Math.round(Number(specialPercent));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ coupons: StoreCoupon[] }>("/admin/coupons/abandoned");
      setRows(res.coupons ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!testEmail && user?.email) setTestEmail(user.email);
  }, [user?.email, testEmail]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const generateTestOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasEmail = Boolean(testEmail.trim() && testEmail.includes("@"));
    const mobileDigits = testPhoneLocal.replace(/\D/g, "");
    const hasPhone = mobileDigits.length >= 7;
    if (!hasEmail && !hasPhone) {
      setTestError("Enter the email or mobile you will use at checkout");
      return;
    }

    setTestSaving(true);
    setTestMessage("");
    setTestError("");
    setLastTestCode("");
    try {
      const res = await api<{ coupon: StoreCoupon }>("/admin/coupons/test-order", {
        method: "POST",
        body: JSON.stringify({
          ...(hasEmail ? { email: testEmail.trim() } : {}),
          ...(hasPhone ? { phone: mobileDigits } : {}),
        }),
      });
      setLastTestCode(res.coupon.code);
      setTestMessage(
        `Test coupon ${res.coupon.code} is valid for ${TEST_ORDER_COUPON_MINUTES} minutes. Use this same email/phone at checkout — items + shipping will charge $${TEST_ORDER_FORCE_TOTAL_USD}.00.`
      );
      await load();
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Could not generate test coupon");
    } finally {
      setTestSaving(false);
    }
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasEmail = Boolean(email.trim() && email.includes("@"));
    const mobileDigits = phoneLocal.replace(/\D/g, "");
    const hasPhone = mobileDigits.length >= 7;
    if (!hasEmail && !hasPhone) {
      setError("Enter a customer email or mobile number");
      return;
    }

    if (discountMode === "special") {
      const n = Math.round(Number(specialPercent));
      if (
        !Number.isFinite(n) ||
        !Number.isInteger(n) ||
        n < ADMIN_EXTREME_DISCOUNT_MIN ||
        n > ADMIN_EXTREME_DISCOUNT_MAX
      ) {
        setError(
          `Special discount must be a whole number from ${ADMIN_EXTREME_DISCOUNT_MIN} to ${ADMIN_EXTREME_DISCOUNT_MAX}`
        );
        return;
      }
    }

    setSaving(true);
    setMessage("");
    setError("");
    setLastWhatsAppLink("");
    setLastCode("");
    try {
      const confirmedSale = isAdminConfirmedSaleDiscount(discountPercent);
      const hours = confirmedSale ? ADMIN_CONFIRMED_SALE_COUPON_HOURS : ADMIN_MANUAL_COUPON_HOURS;
      const res = await api<CreateResult>("/admin/coupons/abandoned", {
        method: "POST",
        body: JSON.stringify({
          ...(hasEmail ? { email: email.trim() } : {}),
          ...(hasPhone
            ? {
                phone: mobileDigits,
                whatsappPhone: buildPhoneValue(phoneCountry, phoneLocal),
              }
            : {}),
          discountPercent,
          ...(confirmedSale ? { confirmedSale: true } : {}),
        }),
      });
      setLastCode(res.coupon.code);
      setLastWhatsAppLink(res.whatsapp.deepLink);
      const emailNotes = hasEmail
        ? [
            res.emails.customerOk
              ? "customer emailed"
              : `customer email failed${res.emails.customerError ? `: ${res.emails.customerError}` : ""}`,
            res.emails.notifyOk
              ? isAdminExtremeDiscount(discountPercent)
                ? "extreme-discount alert emailed"
                : "team notified"
              : `notify failed${res.emails.notifyError ? `: ${res.emails.notifyError}` : ""}`,
          ].join(" · ")
        : [
            "no customer email (phone-only)",
            res.emails.notifyOk
              ? isAdminExtremeDiscount(discountPercent)
                ? "extreme-discount alert emailed"
                : "team notified"
              : `notify failed${res.emails.notifyError ? `: ${res.emails.notifyError}` : ""}`,
          ].join(" · ");
      const waNote = !hasPhone
        ? "WhatsApp skipped (no phone)"
        : res.whatsapp.sent
          ? `WhatsApp sent via ${res.whatsapp.provider}`
          : res.whatsapp.skipped
            ? "WhatsApp API not configured — use Open WhatsApp below"
            : `WhatsApp failed${res.whatsapp.error ? `: ${res.whatsapp.error}` : ""}`;
      const saleLabel = isAdminExtremeDiscount(discountPercent)
        ? " · Extreme discount"
        : res.coupon.confirmedSale || confirmedSale
          ? " · Confirmed sale"
          : "";
      setMessage(
        `Coupon ${res.coupon.code} created (${res.coupon.discountPercent}%${saleLabel} · expires in ${hours} hour${hours === 1 ? "" : "s"}). ${emailNotes}. ${waNote}.`
      );
      setEmail("");
      setPhoneLocal("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Coupons</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate a coupon for outreach (7–15%, 1 hour) or a confirmed / special offer (
          {ADMIN_EXTREME_DISCOUNT_MIN}–{ADMIN_EXTREME_DISCOUNT_MAX}%,{" "}
          {ADMIN_CONFIRMED_SALE_COUPON_HOURS} hours). Type any whole percent from{" "}
          {ADMIN_EXTREME_DISCOUNT_MIN}–{ADMIN_EXTREME_DISCOUNT_MAX} for customers who need more than{" "}
          {ADMIN_CONFIRMED_SALE_DISCOUNT_PERCENT}%. Discounts above {ADMIN_CONFIRMED_SALE_DISCOUNT_PERCENT}%
          email the team with subject “Extreme discount offered”, including you (
          {user?.email ?? "logged-in admin"}).
        </p>
      </div>

      <form
        onSubmit={generateTestOrder}
        className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-amber-950">$1 test-order coupon</h3>
          <p className="text-xs text-amber-900/80 mt-1">
            For end-to-end site testing only. Whatever the cart is — including shipping — checkout
            charges ${TEST_ORDER_FORCE_TOTAL_USD}.00 USD (or the INR equivalent). Valid{" "}
            {TEST_ORDER_COUPON_MINUTES} minutes, one use. Bind it to the email or phone you will enter
            at checkout.
          </p>
        </div>
        <label className="block text-sm">
          Checkout email <span className="text-slate-400 font-normal">(optional if phone is set)</span>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@spicycorner.com"
            className="mt-1 w-full border rounded-lg px-3 py-2 bg-white"
          />
        </label>
        <div>
          <PhoneInput
            label="Checkout phone"
            countryIso={testPhoneCountry}
            localNumber={testPhoneLocal}
            onCountryChange={setTestPhoneCountry}
            onLocalNumberChange={setTestPhoneLocal}
            compact
            placeholder="Mobile number"
            className="text-sm"
            selectClassName="mt-1"
            inputClassName="mt-1"
          />
        </div>
        <button
          type="submit"
          disabled={testSaving}
          className="bg-amber-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {testSaving ? "Generating…" : `Generate $${TEST_ORDER_FORCE_TOTAL_USD} test coupon (${TEST_ORDER_COUPON_MINUTES} min)`}
        </button>
        {testMessage && <p className="text-sm text-green-800">{testMessage}</p>}
        {testError && <p className="text-sm text-red-600">{testError}</p>}
        {lastTestCode && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-white px-3 py-2">
            <p className="text-sm">
              Code: <strong className="font-mono text-base">{lastTestCode}</strong>
            </p>
            <button
              type="button"
              onClick={() => void copyCode(lastTestCode)}
              className="text-sm font-medium text-amber-900 hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </form>

      <form onSubmit={generate} className="bg-white border rounded-xl p-5 space-y-4">
        <label className="block text-sm">
          Email <span className="text-slate-400 font-normal">(optional if phone is set)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@email.com"
            className="mt-1 w-full border rounded-lg px-3 py-2"
          />
        </label>

        <div>
          <PhoneInput
            label="Phone number (WhatsApp)"
            countryIso={phoneCountry}
            localNumber={phoneLocal}
            onCountryChange={setPhoneCountry}
            onLocalNumberChange={setPhoneLocal}
            compact
            placeholder="Mobile number"
            className="text-sm"
            selectClassName="mt-1"
            inputClassName="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">
            Optional if email is set. Country code is for WhatsApp only — coupon validation uses the
            mobile number.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">Discount</legend>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer flex-1">
              <input
                type="radio"
                name="discountMode"
                checked={discountMode === "outreach"}
                onChange={() => setDiscountMode("outreach")}
              />
              Outreach (7–15%)
            </label>
            <label className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer flex-1">
              <input
                type="radio"
                name="discountMode"
                checked={discountMode === "special"}
                onChange={() => setDiscountMode("special")}
              />
              Confirmed / special ({ADMIN_EXTREME_DISCOUNT_MIN}–{ADMIN_EXTREME_DISCOUNT_MAX}%)
            </label>
          </div>

          {discountMode === "outreach" ? (
            <label className="block text-sm">
              Outreach percent
              <select
                value={outreachPercent}
                onChange={(e) => setOutreachPercent(Number(e.target.value))}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              >
                {ADMIN_OUTREACH_DISCOUNT_OPTIONS.map((pct) => (
                  <option key={pct} value={pct}>
                    {pct}% off ({ADMIN_MANUAL_COUPON_HOURS}h outreach)
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm">
              Type discount percent ({ADMIN_EXTREME_DISCOUNT_MIN}–{ADMIN_EXTREME_DISCOUNT_MAX})
              <input
                type="number"
                inputMode="numeric"
                min={ADMIN_EXTREME_DISCOUNT_MIN}
                max={ADMIN_EXTREME_DISCOUNT_MAX}
                step={1}
                value={specialPercent}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
                  setSpecialPercent(raw);
                }}
                className="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-base"
                placeholder="20"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Whole numbers only. Default {ADMIN_CONFIRMED_SALE_DISCOUNT_PERCENT}%. Use 21–50 when the
                customer needs a higher offer — that sends an “Extreme discount offered” alert.
              </span>
            </label>
          )}
        </fieldset>

        {discountMode === "special" && isAdminConfirmedSaleDiscount(discountPercent) && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              isAdminExtremeDiscount(discountPercent)
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            {isAdminExtremeDiscount(discountPercent) ? (
              <>
                <span className="inline-flex items-center rounded-md bg-amber-700 text-white text-xs font-semibold px-2 py-0.5 mr-2">
                  Extreme discount
                </span>
                {discountPercent}% off — team + you will get email subject “Extreme discount offered”.
                Valid {ADMIN_CONFIRMED_SALE_COUPON_HOURS} hours.
              </>
            ) : (
              <>
                <span className="inline-flex items-center rounded-md bg-emerald-700 text-white text-xs font-semibold px-2 py-0.5 mr-2">
                  Confirmed sale
                </span>
                Use when the customer confirmed they will buy. Code stays valid for{" "}
                {ADMIN_CONFIRMED_SALE_COUPON_HOURS} hours.
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-nav text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {saving
            ? "Generating…"
            : isAdminExtremeDiscount(discountPercent)
              ? "Generate extreme-discount coupon"
              : isAdminConfirmedSaleDiscount(discountPercent)
                ? "Generate confirmed-sale coupon"
                : "Generate coupon"}
        </button>
      </form>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {lastCode && (
        <div className="rounded-xl border border-nav/30 bg-blue-50 px-4 py-3 text-sm space-y-2">
          <p>
            Latest code: <strong className="font-mono text-base">{lastCode}</strong>
          </p>
          {lastWhatsAppLink && (
            <a
              href={lastWhatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-nav font-medium hover:underline"
            >
              Open WhatsApp with coupon message →
            </a>
          )}
        </div>
      )}

      <section className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">Recent admin coupons</div>
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No admin coupons yet.</p>
        ) : (
          <ul className="divide-y text-sm max-h-96 overflow-y-auto">
            {rows.slice(0, 50).map((c) => {
              const expired = new Date(c.expiresAt).getTime() < Date.now();
              const used = Boolean(c.usedAt);
              const testOrder = isTestOrderCoupon(c);
              const extreme = !testOrder && isAdminExtremeDiscount(c.discountPercent);
              const confirmed =
                !testOrder &&
                (Boolean(c.confirmedSale) || isAdminConfirmedSaleDiscount(c.discountPercent));
              const phoneVal =
                "phone" in c && typeof (c as { phone?: string }).phone === "string"
                  ? (c as { phone?: string }).phone
                  : "";
              const remainingMs = new Date(c.expiresAt).getTime() - Date.now();
              const remainingMin = Math.max(0, Math.ceil(remainingMs / 60000));
              return (
                <li key={c.code} className="px-4 py-3 flex flex-wrap gap-2 justify-between">
                  <div>
                    <p className="font-mono font-medium flex flex-wrap items-center gap-2">
                      {c.code}
                      {testOrder ? (
                        <span className="rounded bg-amber-800 text-white text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5">
                          Test $1
                        </span>
                      ) : extreme ? (
                        <span className="rounded bg-amber-700 text-white text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5">
                          Extreme
                        </span>
                      ) : confirmed ? (
                        <span className="rounded bg-emerald-700 text-white text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5">
                          Confirmed sale
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        c.email || null,
                        phoneVal || null,
                        testOrder ? `$${TEST_ORDER_FORCE_TOTAL_USD} total` : `${c.discountPercent}%`,
                        `by ${(c as { createdBy?: string }).createdBy ?? "—"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-xs text-right text-slate-500">
                    <p>
                      {used
                        ? "Used"
                        : expired
                          ? "Expired"
                          : testOrder
                            ? `Active · ${remainingMin} min left`
                            : "Active"}
                    </p>
                    <p>exp {new Date(c.expiresAt).toLocaleString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
