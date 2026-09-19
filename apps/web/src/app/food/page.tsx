import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { FOOD_FAMILIES } from "@/lib/food-families";

export const metadata: Metadata = pageMetadata({
  title: "Indian vegetarian food sourcing — spices plus enquiry families",
  description:
    "Spice catalogue is live. Rice, pulses, makhana and dry fruits can be requested as free sourcing enquiries. We do not invent stock we do not hold.",
  path: "/food",
});

export default function FoodFamiliesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
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
