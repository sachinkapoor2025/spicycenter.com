import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { loadComparisons } from "@/lib/content/comparisons";

export const metadata: Metadata = pageMetadata({
  title: "Indian spice comparisons",
  description:
    "Kashmiri vs regular chilli, green vs black cardamom, garam masala vs curry powder, cumin vs caraway, turmeric vs saffron — culinary comparisons for UK cooks.",
  path: "/spice-guide/comparisons",
});

export default function ComparisonsIndex() {
  const items = loadComparisons();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-sm text-muted">
        <Link href="/spice-guide">Spice guide</Link>
      </p>
      <h1 className="spice-heading text-4xl mt-2">Spice comparisons</h1>
      <p className="mt-3 text-muted leading-relaxed">
        High-intent questions UK shoppers actually type: which chilli for colour, which cardamom for chai, whether curry
        powder replaces garam masala. Pair these notes with{" "}
        <Link href="/recipes" className="text-nav font-semibold hover:underline">
          Indian spice recipes
        </Link>
        , the{" "}
        <Link href="/spices" className="text-nav font-semibold hover:underline">
          Indian spice catalogue
        </Link>
        , and{" "}
        <Link href="/wholesale" className="text-nav font-semibold hover:underline">
          wholesale Indian spices
        </Link>
        . These pages are culinary, not medical.
      </p>
      <ul className="mt-8 space-y-4">
        {items.map((c) => (
          <li key={c.slug} className="card-spice p-5">
            <Link href={`/spice-guide/comparisons/${c.slug}`} className="font-serif text-xl text-nav">
              {c.title}
            </Link>
            <p className="text-sm text-muted mt-1">{c.metaDescription}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
