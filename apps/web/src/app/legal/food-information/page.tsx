import { legalMeta, LegalShell } from "@/components/LegalShell";

export const metadata = legalMeta(
  "/legal/food-information",
  "Food information",
  "How SpicyCenter handles mandatory food information for UK and EU distance selling."
);

export default function Page() {
  return (
    <LegalShell title="Food information">
      <p>
        For prepacked food sold at a distance, mandatory food information generally needs to be available before purchase.
        Product records include fields for name, ingredients, allergens, net quantity, origin, storage, use, responsible
        food business operator, importer, lot/batch, nutrition and certifications.
      </p>
      <p>
        Those fields are required in the data model. Values must be completed by the food business before an SKU is offered
        for sale. This page is not legal advice.
      </p>
    </LegalShell>
  );
}
