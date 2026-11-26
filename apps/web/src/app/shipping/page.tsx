import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Worldwide spice shipping",
  description:
    "SpicyCenter arranges Indian spice delivery worldwide. Cost, documents and timing are confirmed in the quote.",
  path: "/shipping",
});

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl mb-6">Shipping worldwide</h1>
      <div className="space-y-4 text-slate-700 leading-relaxed">
        <p>
          SpicyCenter arranges delivery of Indian spices for buyers in the United Kingdom, Europe, the Middle East,
          and other countries. Delivery is not limited to the UK and EU.
        </p>
        <p>
          Shipping cost, documents and timing depend on the product, the quantity and the destination. Those details
          are confirmed in your quote. This page does not publish a delivery date or a fixed postage rate.
        </p>
        <p>
          Import duty and local taxes depend on the destination country. They are separate unless the quote says they
          are included.
        </p>
        <p>
          See the{" "}
          <Link href="/legal/shipping" className="text-nav font-semibold">
            shipping notes
          </Link>{" "}
          and send the destination with your{" "}
          <Link href="/enquiry" className="text-nav font-semibold">
            enquiry
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
