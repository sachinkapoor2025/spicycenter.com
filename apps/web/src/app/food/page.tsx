import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { FOOD_FAMILIES } from "@/lib/food-families";
import { SuppliedPageCopy } from "@/components/SuppliedPageCopy";
import { FOOD_SUPPLIED_H1, FOOD_SUPPLIED_INTRO, FOOD_SUPPLIED_SECTIONS } from "@/lib/content/supplied-pages";

const FOOD_META_TITLE = "Indian Food Ingredients for Wholesale Sourcing | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: FOOD_META_TITLE,
    description:
      "Enquire for Indian rice, pulses, beans, makhana, millets, seeds and dry fruits for wholesale and international food sourcing.",
    path: "/food",
    absoluteTitle: true,
  }),
  FOOD_META_TITLE,
);

export default function FoodFamiliesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Food sourcing", path: "/food" }]} />
      <p className="spice-kicker">B2B sourcing</p>
      <h1 className="spice-heading text-3xl sm:text-4xl mt-2">{FOOD_SUPPLIED_H1}</h1>
      {FOOD_SUPPLIED_INTRO.map((paragraph) => (
        <p key={paragraph} className="mt-4 text-muted leading-relaxed max-w-3xl">
          {paragraph}
        </p>
      ))}
      <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {FOOD_FAMILIES.map((f) => (
          <li key={f.slug}>
            <Link href={`/food/${f.slug}`} className="block rounded-2xl border border-[#e6d5bc] bg-white p-4">
              <p className="font-serif text-lg text-primary">{f.name}</p>
              <p className="text-xs text-muted mt-1">{f.inCatalog ? "Related spices in shop" : "Enquiry only — no invented SKUs"}</p>
            </Link>
          </li>
        ))}
      </ul>
      <SuppliedPageCopy sections={FOOD_SUPPLIED_SECTIONS} className="mt-12" />
    </div>
  );
}
