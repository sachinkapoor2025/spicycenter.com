"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isStorefrontLocale,
  localeFromBrowser,
  type StorefrontLocale,
} from "./locales";
import { canonicalEnglish, translatePhrase } from "./messages";

interface LocaleContextValue {
  locale: StorefrontLocale;
  setLocale: (next: StorefrontLocale) => void;
  t: (phrase: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): StorefrontLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && isStorefrontLocale(stored)) return stored;
  return localeFromBrowser(navigator.language);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<StorefrontLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: StorefrontLocale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback((phrase: string) => translatePhrase(locale, phrase), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>
      <HtmlLangSync locale={locale} />
      <I18nDomSync locale={locale} />
      {children}
    </LocaleContext.Provider>
  );
}

function HtmlLangSync({ locale }: { locale: StorefrontLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "KBD", "SVG"]);

function I18nDomSync({ locale }: { locale: StorefrontLocale }) {
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/ses-email")) {
      return;
    }

    const originals = new WeakMap<Text, string>();
    let applying = false;

    const apply = () => {
      if (applying) return;
      applying = true;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const text = node as Text;
        const parent = text.parentElement;
        if (
          parent &&
          !SKIP_TAGS.has(parent.tagName) &&
          parent.closest("[data-no-i18n]") == null &&
          !(parent instanceof HTMLInputElement) &&
          parent.getAttribute("contenteditable") !== "true"
        ) {
          const current = text.textContent ?? "";
          const original = originals.get(text) ?? canonicalEnglish(current);
          originals.set(text, original);
          const next = translatePhrase(locale, original);
          if (text.textContent !== next) text.textContent = next;
        }
        node = walker.nextNode();
      }

      document.querySelectorAll<HTMLElement>("[placeholder],[aria-label],[title]").forEach((el) => {
        for (const attr of ["placeholder", "aria-label", "title"] as const) {
          const current = el.getAttribute(attr);
          if (!current) continue;
          const key = `data-i18n-orig-${attr}`;
          const original = el.getAttribute(key) ?? canonicalEnglish(current);
          if (!el.hasAttribute(key)) el.setAttribute(key, original);
          const next = translatePhrase(locale, original);
          if (current !== next) el.setAttribute(attr, next);
        }
      });
      applying = false;
    };

    apply();
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (applying) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [locale]);

  return null;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
