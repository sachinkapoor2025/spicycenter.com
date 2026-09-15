import { legalMeta, LegalShell } from "@/components/LegalShell";
import { STOREFRONT_SHIPPING_COPY } from "@/lib/storefront-shipping-copy";

export const metadata = legalMeta("/legal/shipping", "Shipping", "GBP/EUR shipping quotes, separate from duty and VAT.");

export default function Page() {
  return (
    <LegalShell title="Shipping">
      <p>{STOREFRONT_SHIPPING_COPY.uk}</p>
      <p>{STOREFRONT_SHIPPING_COPY.eu}</p>
      <p>
        {STOREFRONT_SHIPPING_COPY.perKgAdmin} We do not claim that shipping includes customs duty or VAT unless a rule
        says so.
      </p>
    </LegalShell>
  );
}
