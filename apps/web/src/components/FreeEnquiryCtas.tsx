"use client";

import { EnquireNowButton } from "@/components/EnquireNowButton";

/** Conversion CTA — not counted as an in-content SEO internal link. */
export function FreeEnquiryCtas({
  productName,
}: {
  productName?: string;
  spiceQuery?: string;
  destination?: string | null;
}) {
  return (
    <div className="mt-6">
      <EnquireNowButton productName={productName} variant="default" label="Enquire Now" />
    </div>
  );
}
