import { legalMeta, LegalShell } from "@/components/LegalShell";

export const metadata = legalMeta("/legal/allergens", "Allergens", "Allergen information approach for SpicyCenter spices.");

export default function Page() {
  return (
    <LegalShell title="Allergens">
      <p>
        Mustard, sesame and celery can appear in this catalogue. Compounded asafoetida may contain wheat or other starches.
        Cross-contact in a spice packing facility is possible. Always read the pack. Allergen statements are lot-specific
        and managed in admin — we do not invent them.
      </p>
    </LegalShell>
  );
}
