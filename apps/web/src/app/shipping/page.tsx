import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { STOREFRONT_SHIPPING_COPY } from "@/lib/storefront-shipping-copy";

export const metadata: Metadata = pageMetadata({
  title: "Shipping — UK (GBP) and EU (EUR) quotes",
  description: "Weight-based shipping quoted in GBP for the UK and EUR for the EU. Duty and VAT are separate unless included.",
  path: "/shipping",
});

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl mb-6">Shipping to the UK and Europe</h1>
      <p className="text-slate-700">{STOREFRONT_SHIPPING_COPY.combined}</p>
      <p className="mt-4 text-slate-700">EU rates are not guessed. See <Link href="/legal/shipping" className="text-nav">legal shipping notes</Link> and <Link href="/uk" className="text-nav">UK</Link> / <Link href="/eu" className="text-nav">EU</Link> pages.</p>
    </div>
  );
}
