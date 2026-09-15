export const STOREFRONT_LOCALES = [
  { code: "en", name: "English", nativeName: "English", region: "United Kingdom" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg", region: "United Kingdom" },
  { code: "gd", name: "Scottish Gaelic", nativeName: "Gàidhlig", region: "United Kingdom" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge", region: "Ireland & UK" },
  { code: "de", name: "German", nativeName: "Deutsch", region: "Europe" },
  { code: "fr", name: "French", nativeName: "Français", region: "Europe" },
  { code: "es", name: "Spanish", nativeName: "Español", region: "Europe" },
  { code: "it", name: "Italian", nativeName: "Italiano", region: "Europe" },
  { code: "pt", name: "Portuguese", nativeName: "Português", region: "Europe" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", region: "Europe" },
  { code: "pl", name: "Polish", nativeName: "Polski", region: "Europe" },
  { code: "ro", name: "Romanian", nativeName: "Română", region: "Europe" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", region: "Europe" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", region: "Europe" },
  { code: "da", name: "Danish", nativeName: "Dansk", region: "Europe" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", region: "Europe" },
  { code: "cs", name: "Czech", nativeName: "Čeština", region: "Europe" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", region: "Europe" },
  { code: "bg", name: "Bulgarian", nativeName: "Български", region: "Europe" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", region: "Europe" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina", region: "Europe" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina", region: "Europe" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių", region: "Europe" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu", region: "Europe" },
  { code: "et", name: "Estonian", nativeName: "Eesti", region: "Europe" },
  { code: "mt", name: "Maltese", nativeName: "Malti", region: "Europe" },
  { code: "nb", name: "Norwegian", nativeName: "Norsk", region: "Europe" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska", region: "Europe" },
  { code: "lb", name: "Luxembourgish", nativeName: "Lëtzebuergesch", region: "Europe" },
  { code: "ca", name: "Catalan", nativeName: "Català", region: "Europe" },
] as const;

export type StorefrontLocale = (typeof STOREFRONT_LOCALES)[number]["code"];

export const DEFAULT_LOCALE: StorefrontLocale = "en";
export const LOCALE_STORAGE_KEY = "hr_ecom_site_locale";

const LOCALE_SET = new Set<string>(STOREFRONT_LOCALES.map((l) => l.code));

export function isStorefrontLocale(value: string): value is StorefrontLocale {
  return LOCALE_SET.has(value);
}

export function localeFromBrowser(language: string | undefined): StorefrontLocale {
  const raw = (language ?? "").trim().toLowerCase();
  if (!raw) return DEFAULT_LOCALE;
  const full = raw.replace("_", "-");
  if (full.startsWith("zh")) return DEFAULT_LOCALE;
  const exact = STOREFRONT_LOCALES.find((l) => full === l.code || full.startsWith(`${l.code}-`));
  if (exact) return exact.code;
  if (full.startsWith("nn") || full.startsWith("no")) return "nb";
  return DEFAULT_LOCALE;
}

export function suggestedLocaleForCountry(countryCode: string): StorefrontLocale {
  const map: Record<string, StorefrontLocale> = {
    GB: "en",
    IE: "en",
    DE: "de",
    AT: "de",
    CH: "de",
    FR: "fr",
    BE: "fr",
    LU: "fr",
    ES: "es",
    IT: "it",
    PT: "pt",
    NL: "nl",
    PL: "pl",
    RO: "ro",
    GR: "el",
    CY: "el",
    SE: "sv",
    DK: "da",
    FI: "fi",
    CZ: "cs",
    HU: "hu",
    BG: "bg",
    HR: "hr",
    SK: "sk",
    SI: "sl",
    LT: "lt",
    LV: "lv",
    EE: "et",
    MT: "mt",
    NO: "nb",
    IS: "is",
  };
  return map[countryCode.trim().toUpperCase()] ?? DEFAULT_LOCALE;
}
