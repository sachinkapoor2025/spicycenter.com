import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { FOOD_FAMILIES } from "@/lib/food-families";

const FOOD_META_TITLE = "Indian Food Ingredients Sourcing: Rice & More | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: FOOD_META_TITLE,
    description:
      "Enquire for Indian spices, rice and other food ingredients for the UK, Europe and worldwide. Spices are in the catalogue. Other ingredients are confirmed when we reply.",
    path: "/food",
    absoluteTitle: true,
  }),
  FOOD_META_TITLE,
);

export default function FoodFamiliesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Food sourcing", path: "/food" }]} />
      <p className="spice-kicker">B2B sourcing</p>
      <h1 className="spice-heading text-4xl mt-2">Indian vegetarian food families</h1>
      <p className="mt-4 text-muted leading-relaxed">
        The storefront catalogue is Indian spices. Other vegetarian families below are enquiry hubs so buyers can send
        requirements without us publishing fake SKUs.
      </p>
      <ul className="mt-8 grid sm:grid-cols-2 gap-3">
        {FOOD_FAMILIES.map((f) => (
          <li key={f.slug}>
            <Link href={`/food/${f.slug}`} className="block rounded-2xl border border-[#e6d5bc] bg-white p-4">
              <p className="font-serif text-lg text-primary">{f.name}</p>
              <p className="text-xs text-muted mt-1">{f.inCatalog ? "Related spices in shop" : "Enquiry only — no invented SKUs"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
