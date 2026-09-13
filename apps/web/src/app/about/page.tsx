import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `About ${site.name}`,
  description: site.description,
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl mb-6">About {site.name}</h1>
      <p className="text-slate-700 leading-relaxed">
        {site.name} ({site.domain}) is an Indian spice marketplace and knowledge site: retail packs, 10kg+ wholesale,
        spice guides, recipes, and indicative Indian market prices. Primary market is the UK, then the EU. India is the sourcing story.
      </p>
      <p className="mt-4 text-slate-700">
        We do not publish medical claims, fake reviews, or unsourced market numbers. Food-information fields exist so UK/EU
        offers can be completed properly before checkout goes live.
      </p>
      <p className="mt-6"><Link href="/contact" className="text-nav font-semibold">Contact</Link></p>
    </div>
  );
}
