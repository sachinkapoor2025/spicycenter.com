import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

export const metadata: Metadata = pageMetadata({
  title: "Bulk spice enquiry",
  description:
    "Send a bulk enquiry for Indian spices. You choose the quantity. Prices are not published on this website.",
  path: "/bulk-enquiry",
});

export default function BulkEnquiryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Bulk spice enquiry</h1>
      <p className="mt-3 text-muted leading-relaxed">
        Use the same enquiry for a large order. Type the quantity you need. We reply with availability. This page does
        not calculate or show a price.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-muted">Loading form…</p>}>
          <WholesaleQuoteForm defaultQuantity="" />
        </Suspense>
      </div>
    </div>
  );
}
