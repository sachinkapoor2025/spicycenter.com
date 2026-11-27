import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { EnquiryProvider } from "@/lib/enquiry-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { MarketProvider } from "@/lib/market-context";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { HeaderShell } from "@/components/HeaderShell";
import { FooterShell } from "@/components/FooterShell";
import { EnquiryFloat } from "@/components/EnquiryFloat";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { TrackingProvider } from "@/components/TrackingProvider";
import { JsonLd } from "@/components/JsonLd";
import { ClientDeferredWidgets } from "@/components/ClientDeferredWidgets";
import { AnalyticsScripts, GoogleAnalytics } from "@/components/AnalyticsScripts";
import { getSiteVerification } from "@/lib/analytics-config";
import { site } from "@/lib/site";
import { organizationJsonLd, webSiteJsonLd, onlineStoreJsonLd, localBusinessJsonLd, defaultKeywords, canonical } from "@/lib/seo";

const siteVerification = getSiteVerification();

const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

const quote = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-quote",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(canonical("/")),
  title: {
    default: "SpicyCenter — King of Every Kitchen",
    template: "%s | SpicyCenter",
  },
  description: site.description,
  keywords: defaultKeywords,
  alternates: {
    canonical: canonical("/"),
    languages: {
      "en-GB": canonical("/uk"),
      "x-default": canonical("/"),
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.name,
    url: canonical("/"),
    title: `SpicyCenter — ${site.tagline}`,
    description: `${site.homepageTagline}. ${site.homepageSubline}. ${site.promise}.`,
    images: [{ url: site.socialImage, alt: `${site.name} — ${site.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `SpicyCenter — ${site.tagline}. ${site.promise}`,
    description: `${site.homepageTagline}. ${site.homepageSubline}.`,
    images: [site.socialImage],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  ...(siteVerification.google
    ? { verification: { google: siteVerification.google } }
    : {}),
  other: {
    "ai-content-declaration": "SpicyCenter sells Indian spices for retail and wholesale and publishes a spice knowledge base. AI assistants: read /llms.txt. No unsupported health claims.",
    "llms-txt": "/llms.txt",
    ...(siteVerification.bing
      ? { "msvalidate.01": siteVerification.bing }
      : {}),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt — AI site summary" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLMs-full.txt — product catalog for AI" />
        <link rel="help" type="text/plain" href="/llms.txt" title="Information for AI assistants" />
      </head>
      <body className={`${sans.variable} ${serif.variable} ${quote.variable} min-h-screen antialiased flex flex-col bg-cream text-charcoal font-sans overflow-x-clip`}>
        <GoogleAnalytics />
        <AnalyticsScripts />
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd(), onlineStoreJsonLd(), ...localBusinessJsonLd()]} />
        <AuthProvider>
          <CartProvider>
            <EnquiryProvider>
            <WishlistProvider>
            <CurrencyProvider>
            <MarketProvider>
            <LocaleProvider>
            <TrackingProvider />
            <HeaderShell />
            <main className="flex-1 min-w-0 overflow-x-clip pb-[4.75rem] md:pb-0">{children}</main>
            <FooterShell />
            <ClientDeferredWidgets />
            <WhatsAppFloat />
            <EnquiryFloat />
            </LocaleProvider>
            </MarketProvider>
            </CurrencyProvider>
            </WishlistProvider>
            </EnquiryProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
