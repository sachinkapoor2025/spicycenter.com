import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { quoteShipping } from "@/lib/spice/shipping";

export const metadata: Metadata = pageMetadata({
  title: "Shipping — UK per-kg rates, EU per country",
  description: "Configurable shipping: UK default ₹750/kg, 1kg minimum. Duty and VAT are separate.",
  path: "/shipping",
});

export default function ShippingPage() {
  const uk = quoteShipping({ countryCode: "GB", weightKg: 1, mode: "retail" });
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl mb-6">Shipping</h1>
      <p className="text-slate-700">{uk.message}</p>
      <p className="mt-4 text-slate-700">EU rates are not guessed. See <Link href="/legal/shipping" className="text-nav">legal shipping notes</Link> and <Link href="/uk" className="text-nav">UK</Link> / <Link href="/eu" className="text-nav">EU</Link> pages.</p>
    </div>
  );
}
