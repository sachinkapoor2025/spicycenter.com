"use client";

import Link from "next/link";
import { EnquireNowButton } from "@/components/EnquireNowButton";

export default function CartPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="spice-heading text-3xl mb-3">Enquire instead of checkout</h1>
      <p className="text-muted mb-8 leading-relaxed">
        SpicyCenter is enquiry-based. Tell us the spices and quantities you need and we will reply with availability.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <EnquireNowButton />
        <Link href="/contact" className="btn-outline">
          Contact Us
        </Link>
      </div>
      <p className="mt-8">
        <Link href="/spices" className="text-nav font-semibold">
          Browse spices →
        </Link>
      </p>
    </div>
  );
}
