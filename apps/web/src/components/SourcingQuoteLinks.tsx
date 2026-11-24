"use client";

import Link from "next/link";
import { EVENT_TYPES } from "@spicycorner/shared";
import { trackEnquiryEvent } from "@/lib/track";
import { site, whatsappChatUrl } from "@/lib/site";

export function SourcingQuoteLinks({ productName }: { productName: string }) {
  const href = `/rfq?product=${encodeURIComponent(productName)}`;
  return (
    <div className="mt-4 rounded-xl border border-[#e6d5bc] bg-beige/60 p-4">
      <p className="text-sm leading-relaxed text-muted">
        Grades, origin, certificates, stock and price for {productName} are confirmed with the selected supplier for each requirement. They are not fixed catalogue claims.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Confirm grade, form and origin for the lot.</li>
        <li>Confirm packaging, documents and lead time.</li>
        <li>Confirm price, MOQ and destination terms.</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="btn-primary !w-auto px-4 py-2 text-sm font-semibold"
          onClick={() => trackEnquiryEvent(EVENT_TYPES.CTA_CLICK, { cta: "sourcing-quote", product: productName })}
        >
          Get a Sourcing Quote
        </Link>
        <a
          href={whatsappChatUrl(`Hello SpicyCenter, I need a sourcing quote for ${productName}.`)}
          className="text-sm font-semibold text-nav self-center"
          onClick={() => trackEnquiryEvent(EVENT_TYPES.WHATSAPP_CLICK, { product: productName })}
        >
          WhatsApp
        </a>
        <a
          href={`mailto:${site.contactEmail}?subject=${encodeURIComponent(`Sourcing quote: ${productName}`)}`}
          className="text-sm font-semibold text-nav self-center"
          onClick={() => trackEnquiryEvent(EVENT_TYPES.CONTACT_CLICK, { channel: "email", product: productName })}
        >
          Email
        </a>
      </div>
    </div>
  );
}
