import Link from "next/link";
import { legalMeta, LegalShell } from "@/components/LegalShell";

export const metadata = legalMeta("/legal/allergens", "Allergens", "Allergen information approach for SpicyCenter spices.");

export default function Page() {
  return (
    <LegalShell title="Allergens">
      <p>
        Mustard, sesame and celery can appear in this catalogue. Compounded asafoetida may contain wheat or other starches.
        Cross-contact in a spice packing facility is possible. Always read the pack. Allergen statements are lot-specific
        and managed in admin — we do not invent them. See{" "}
        <Link href="/legal/food-information" className="text-nav font-semibold hover:underline">
          food information
        </Link>
        , the{" "}
        <Link href="/spice-guide" className="text-nav font-semibold hover:underline">
          spice guide
        </Link>
        , and{" "}
        <Link href="/contact" className="text-nav font-semibold hover:underline">
          contact
        </Link>
        .
      </p>
    </LegalShell>
  );
}
