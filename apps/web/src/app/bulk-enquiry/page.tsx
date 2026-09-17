import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import { BulkEnquiryForm } from "@/components/BulkEnquiryForm";

export const metadata: Metadata = pageMetadata({
  title: "Bulk spice enquiry — 100kg minimum",
  description:
    "Indicative bulk quotes for Indian spices to the UK, EU, United States and Canada. 100kg minimum. Same Indian spice cost; destination shipping and compliance differ. Not a checkout price for the cargo.",
  path: "/bulk-enquiry",
});

export default function BulkEnquiryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Bulk spice enquiry</h1>
      <p className="mt-3 text-muted leading-relaxed">
        Get an indicative landed-cost estimate for 100kg and above, including the United States and Canada. Mandi prints
        are a domestic wholesale reference, not an FOB export price — we apply your configured markup and never show the
        raw Agmarknet figure as a customer selling price. US and Canada visitors are quoted in USD/CAD with North American
        ocean freight and import-compliance notes; UK and EU quotes are unchanged. North America bulk is an enquiry only
        — the cargo is never charged online.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading form…</p>}>
        <BulkEnquiryForm />
      </Suspense>
    </div>
  );
}
