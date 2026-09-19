import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { SOURCING_GUIDES } from "@/lib/sourcing-guides";

export const metadata: Metadata = pageMetadata({
  title: "Sourcing guides — bulk, packing and import notes",
  description: "Educational buyer guides. Verified SpicyCenter supply claims stay on quotes, not in generic copy.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Sourcing guides</h1>
      <ul className="mt-6 space-y-3">
        {SOURCING_GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="font-serif text-xl text-nav">
              {g.title}
            </Link>
            <p className="text-sm text-muted">{g.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
