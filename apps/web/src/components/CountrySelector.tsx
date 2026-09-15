"use client";

import { useEffect, useState } from "react";
import { useMarket } from "@/lib/market-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { STOREFRONT_LOCALES, type StorefrontLocale } from "@/lib/i18n/locales";

export function CountrySelector({ compact = false }: { compact?: boolean }) {
  const {
    countryCode,
    markets,
    market,
    loading,
    manualOverride,
    setMarketLocation,
    resetToDetectedLocation,
  } = useMarket();
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [draftCountry, setDraftCountry] = useState(countryCode);
  const [draftLocale, setDraftLocale] = useState<StorefrontLocale>(locale);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setDraftCountry(countryCode);
    setDraftLocale(locale);
  }, [countryCode, locale, open]);

  const label = loading
    ? t("Detecting…")
    : market
      ? `${market.flagEmoji} ${market.name}`
      : t("Select delivery country");

  const save = () => {
    setSaving(true);
    setMarketLocation(draftCountry, undefined, "manual");
    setLocale(draftLocale);
    setSaving(false);
    setOpen(false);
  };

  const useMyLocation = async () => {
    setDetecting(true);
    await resetToDetectedLocation();
    setDetecting(false);
    setOpen(false);
  };

  const ukLocales = STOREFRONT_LOCALES.filter((l) => l.region.includes("United Kingdom") || l.region.includes("Ireland"));
  const euLocales = STOREFRONT_LOCALES.filter((l) => l.region === "Europe");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "flex items-center justify-center rounded-md border border-[#e6d5bc] bg-paper h-9 w-9 text-base hover:border-nav"
            : "flex items-center gap-2 rounded-md border border-[#e6d5bc] bg-paper px-3 py-1.5 text-xs font-semibold text-primary hover:border-nav"
        }
        aria-label={t("Change country & language")}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-busy={loading}
      >
        <span className={compact ? "" : "truncate max-w-[min(46vw,220px)] sm:max-w-[280px]"}>
          {compact
            ? loading
              ? "…"
              : (market?.flagEmoji ?? "🌍")
            : `${t("Delivering to:")} ${label}`}
        </span>
        {!compact && (
          <span className="text-[10px] uppercase tracking-wide text-nav">{t("Change")}</span>
        )}
      </button>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/20" aria-label={t("Close")} onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label={t("Change country & language")}
            className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-1.5rem),360px)] max-w-[calc(100vw-1.5rem)] rounded-xl border border-[#e6d5bc] bg-paper p-4 shadow-xl"
          >
            <p className="text-sm font-bold text-primary mb-3">{t("Change country & language")}</p>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Country")}</label>
            <select
              value={draftCountry}
              onChange={(e) => setDraftCountry(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3"
            >
              {markets.map((m) => (
                <option key={m.countryCode} value={m.countryCode}>
                  {m.flagEmoji} {m.name}
                </option>
              ))}
            </select>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Website language")}</label>
            <select
              data-no-i18n
              value={draftLocale}
              onChange={(e) => setDraftLocale(e.target.value as StorefrontLocale)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-2"
            >
              <optgroup label="United Kingdom & Ireland">
                {ukLocales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Europe">
                {euLocales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="flex flex-wrap items-center justify-end gap-2 mt-2">
              <button
                type="button"
                className="mr-auto text-sm px-3 py-1.5 text-nav font-semibold hover:text-white hover:bg-nav rounded-lg transition-colors"
                onClick={() => void useMyLocation()}
                disabled={detecting || loading}
              >
                {detecting ? t("Detecting…") : t("Use my location")}
              </button>
              <button type="button" className="text-sm px-3 py-1.5 text-slate-600" onClick={() => setOpen(false)}>
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-nav px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary disabled:opacity-60 transition-colors"
              >
                {t("Save")}
              </button>
            </div>
            {manualOverride && (
              <p className="text-[11px] text-slate-500 mt-2">
                {t("You chose this country. Use my location to switch back to the country from your IP.")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
