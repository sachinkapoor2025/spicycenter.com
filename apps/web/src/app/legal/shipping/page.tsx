import Link from "next/link";
import { legalMeta, LegalShell } from "@/components/LegalShell";
import { STOREFRONT_SHIPPING_COPY } from "@/lib/storefront-shipping-copy";

export const metadata = legalMeta(
  "/legal/shipping",
  "Shipping",
  "UK and EU checkout quotes, plus worldwide spice delivery arranged on enquiry. Duty and tax are separate unless the quote says otherwise.",
);

export default function Page() {
  return (
    <LegalShell title="Shipping">
      <p>
        SpicyCenter arranges Indian spice delivery worldwide. Destinations outside the UK and EU are quoted on enquiry.
        Cost, documents and timing are confirmed in that quote. This page does not publish a worldwide postage rate.
      </p>
      <p>{STOREFRONT_SHIPPING_COPY.uk}</p>
      <p>{STOREFRONT_SHIPPING_COPY.eu}</p>
      <p>
        {STOREFRONT_SHIPPING_COPY.perKgAdmin} We do not claim that shipping includes customs duty or VAT unless a rule
        says so. See{" "}
        <Link href="/uk" className="text-nav font-semibold hover:underline">
          Indian spices UK
        </Link>
        ,{" "}
        <Link href="/eu" className="text-nav font-semibold hover:underline">
          Indian spices Europe
        </Link>
        , or send a{" "}
        <Link href="/enquiry" className="text-nav font-semibold hover:underline">
          free spice enquiry
        </Link>
        .
      </p>
    </LegalShell>
  );
}
