import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { regionLinks } from "@/lib/site";
import { loadSpiceEntities } from "@/lib/spice-data";
import { SuppliedPageCopy } from "@/components/SuppliedPageCopy";
import { REGIONS_SUPPLIED_H1, REGIONS_SUPPLIED_INTRO, REGIONS_SUPPLIED_SECTIONS } from "@/lib/content/supplied-pages";

const REGIONS_META_TITLE = "Complete Guide to Indian Spices and Uses | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: REGIONS_META_TITLE,
    description:
      "A guide to Indian spice types, names and uses, from whole spices and chillies to masala blends, for cooks and wholesale buyers.",
    path: "/indian-spice-regions",
    absoluteTitle: true,
  }),
  REGIONS_META_TITLE,
);

export default function RegionsIndex() {
  const spices = loadSpiceEntities();
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">{REGIONS_SUPPLIED_H1}</h1>
      {REGIONS_SUPPLIED_INTRO.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-muted leading-relaxed max-w-3xl">
          {paragraph}
        </p>
      ))}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {regionLinks.map((r) => {
          const local = spices.filter((s) => s.growingRegions.some((g) => g.toLowerCase().includes(r.label.toLowerCase().split(" ")[0])));
          return (
            <Link key={r.slug} href={`/indian-spice-regions/${r.slug}`} className="card-spice p-5">
              <p className="font-serif text-xl">{r.label}</p>
              <p className="text-sm text-muted mt-1">{local.slice(0, 4).map((s) => s.canonicalName).join(", ") || "Regional spices"}</p>
            </Link>
          );
        })}
      </div>
      <SuppliedPageCopy sections={REGIONS_SUPPLIED_SECTIONS} className="mt-12" />
    </div>
  );
}
