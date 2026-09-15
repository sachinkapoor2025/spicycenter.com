import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Indian spices Europe | EUR quotes when a country is configured",
  description: "EU expansion for Indian spices. Country pages only when shipping and compliance are configured.",
  path: "/eu",
});

export default function EuPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Indian spices for Europe</h1>
      <div className="mt-4 space-y-4 text-muted leading-relaxed">
        <p>
          Europe is the second market after the UK. Delivery countries in the selector are United Kingdom plus listed
          European destinations (Ireland, Germany, France, Spain, Italy, Netherlands, Belgium, Austria, Portugal, Sweden,
          Denmark, Finland, Poland, Czechia). We do not run a fake “ships everywhere” map.
        </p>
        <p>
          We will not publish empty doorway pages for every member state. When a country has a shipping rate and
          food-information workflow, it gets a landing page under /countries. VAT, labelling language and import controls
          differ; checkout tells the truth for that address.
        </p>
        <p>
          Cooks across Europe still shop the same Indian pantry: jeera, haldi, mirch, dhania, garam masala, whole garam
          spices for biryani. Pack sizes stay metric. Wholesale remains 10kg minimum.
        </p>
      </div>
      <p className="mt-6"><Link href="/europe/indian-spices" className="text-nav">Europe spices overview →</Link></p>
      <p className="mt-2"><Link href="/countries/de" className="text-nav">Germany</Link>
        {" · "}<Link href="/countries/fr" className="text-nav">France</Link>
        {" · "}<Link href="/countries/ie" className="text-nav">Ireland</Link>
        {" · "}<Link href="/countries/nl" className="text-nav">Netherlands</Link>
      </p>
    </div>
  );
}
