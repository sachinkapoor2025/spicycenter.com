"use client";

import Link from "next/link";
import { EnquireNowButton } from "@/components/EnquireNowButton";

export default function CheckoutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="spice-heading text-3xl mb-3">Online checkout is not used</h1>
      <p className="text-muted mb-8 leading-relaxed">
        This site takes enquiries rather than cart checkout. Send product details and we will follow up with you.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <EnquireNowButton />
        <Link href="/contact" className="btn-outline">
          Contact Us
        </Link>
      </div>
    </div>
  );
}
