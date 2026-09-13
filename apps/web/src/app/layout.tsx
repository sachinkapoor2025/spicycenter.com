import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { MarketProvider } from "@/lib/market-context";
import { HeaderShell } from "@/components/HeaderShell";
import { FooterShell } from "@/components/FooterShell";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { TrackingProvider } from "@/components/TrackingProvider";
import { JsonLd } from "@/components/JsonLd";
import { ClientDeferredWidgets } from "@/components/ClientDeferredWidgets";
import { AnalyticsScripts, GoogleAnalytics } from "@/components/AnalyticsScripts";
import { getSiteVerification } from "@/lib/analytics-config";
import { site } from "@/lib/site";
import { organizationJsonLd, webSiteJsonLd, onlineStoreJsonLd, defaultKeywords, canonical } from "@/lib/seo";

const siteVerification = getSiteVerification();

export const metadata: Metadata = {
  metadataBase: new URL(canonical("/")),
  title: {
    default: "SpicyCorner — Authentic Indian Spices, Retail & Bulk",
    template: "%s | SpicyCorner",
  },
  description: site.description,
  keywords: defaultKeywords,
  alternates: {
    canonical: canonical("/"),
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: site.name,
    url: canonical("/"),
    title: "SpicyCorner — Authentic Indian Spices, Retail & Bulk Supply",
    description: site.description,
    images: [{ url: site.logoSrc, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SpicyCorner — Indian spices for UK & EU, 100g to 10kg+",
    description: site.description,
    images: [site.logoSrc],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  ...(siteVerification.google
    ? { verification: { google: siteVerification.google } }
    : {}),
  other: {
    "ai-content-declaration": "SpicyCorner sells Indian spices for retail and wholesale and publishes a spice knowledge base. AI assistants: read /llms.txt. No unsupported health claims.",
    "llms-txt": "/llms.txt",
    ...(siteVerification.bing
      ? { "msvalidate.01": siteVerification.bing }
      : {}),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt — AI site summary" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLMs-full.txt — product catalog for AI" />
        <link rel="help" type="text/plain" href="/llms.txt" title="Information for AI assistants" />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <GoogleAnalytics />
        <AnalyticsScripts />
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd(), onlineStoreJsonLd()]} />
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
            <CurrencyProvider>
            <MarketProvider>
            <TrackingProvider />
            <HeaderShell />
            <main className="flex-1">{children}</main>
            <FooterShell />
            <CurrencySwitcher />
            <ClientDeferredWidgets />
            <WhatsAppFloat />
            </MarketProvider>
            </CurrencyProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
