import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { loadSpiceEntities, searchSpices } from "@/lib/spice-data";
import { parseBulkHint } from "@spicycorner/shared";
import { exploreCategories } from "@/lib/site";
import { isKnownPackSize } from "@/lib/catalogue";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { SpiceSkuCard } from "@/components/SpiceSkuCard";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; pack?: string; category?: string; channel?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.search || sp.pack || sp.category || sp.channel) {
    const bits = [sp.search, sp.pack, sp.category, sp.channel].filter(Boolean).join(" · ");
    return pageMetadata({
      title: `Shop Indian spices — ${bits}`,
      description: `Filtered Indian spice catalogue (${bits}). Bulk pack sizes for worldwide business enquiries.`,
      path: "/spices",
      noIndex: true,
    });
  }
  return pageMetadata({
    title: "Indian spice catalogue",
    description:
      "Browse whole spices, powders, Indian chillies and masalas. Pack sizes from 100 gm to 1 metric ton. Enquire worldwide.",
    path: "/spices",
  });
}

export default async function SpicesIndex({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; pack?: string; category?: string; channel?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.search ?? "";
  const pack = sp.pack ?? "";
  const category = sp.category ?? "";
  const channel = sp.channel === "retail" ? "" : (sp.channel ?? "");
  const { prefersBulk, kg } = parseBulkHint(q);

  let products = getCatalogProducts();
  if (q) {
    const matches = searchSpices(q);
    const ids = new Set(matches.map((s) => s.id));
    products = products.filter((p) => {
      const spiceTag = p.tags?.find((t) => t.startsWith("spice:"))?.slice(6);
      const hay = `${p.name} ${p.tags?.join(" ")}`.toLowerCase();
      return hay.includes(q.toLowerCase()) || (spiceTag && ids.has(spiceTag));
    });
    if (prefersBulk) {
      products = [
        ...products.filter((p) => p.tags?.includes("channel:bulk")),
        ...products.filter((p) => !p.tags?.includes("channel:bulk")),
      ];
    }
    if (kg) {
      products.sort((a, b) => {
        const aw = a.tags?.includes(`weightKg:${kg}`) ? 0 : 1;
        const bw = b.tags?.includes(`weightKg:${kg}`) ? 0 : 1;
        return aw - bw;
      });
    }
  }
  if (pack && !isKnownPackSize(pack)) {
    const packTag = pack.endsWith("+") ? "50kg" : pack;
    products = products.filter((p) => p.tags?.some((t) => t === `pack:${packTag}` || (pack === "50kg+" && t.startsWith("pack:50"))));
  }
  if (category) products = products.filter((p) => p.categorySlug === category || p.additionalCategorySlugs?.includes(category));
  if (channel) products = products.filter((p) => p.tags?.includes(`channel:${channel}`));

  const spices = loadSpiceEntities();
  const shown = products.slice(0, 48);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <p className="text-sm text-muted"><Link href="/">Home</Link> / Shop spices</p>
      <h1 className="spice-heading text-3xl sm:text-4xl mt-2">Indian spice catalogue</h1>
      <p className="mt-3 text-muted max-w-2xl">
        Browse by spice type. Every product can be enquired in pack sizes from 100 gm to 1 metric ton. Origin: India. Worldwide delivery is arranged on enquiry. {products.length} matching products.
        {q ? ` Search: “${q}”.` : ""}
      </p>
      <div className="flex flex-wrap gap-2 mt-6">
        {exploreCategories.map((c) => (
          <Link key={c.slug} href={`/spices/${c.slug}`} className="rounded-full border border-[#dcc9a8] px-3 py-1 text-sm hover:border-nav">
            {c.name}
          </Link>
        ))}
        <Link href="/enquiry" className="rounded-full border px-3 py-1 text-sm">Enquire Now</Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {shown.map((p) => (
          <SpiceSkuCard key={p.slug} product={p} />
        ))}
        {products.length === 0 && (
          <p className="text-muted col-span-full">
            No SKUs matched these filters. Browse a spice type above, or open the{" "}
            <Link href="/spice-guide" className="text-nav">
              spice guide
            </Link>
            .
          </p>
        )}
      </div>
      {products.length > shown.length && (
        <p className="mt-6 text-sm text-muted">Showing 48 of {products.length}. Refine search or filters — listing pages are paginated so we do not load 500 images at once.</p>
      )}
      <div className="mt-12">
        <h2 className="font-serif text-2xl mb-4">Spice guides</h2>
        <div className="flex flex-wrap gap-3">
          {spices.filter((s) => s.featuredKnowledge).map((s) => (
            <Link key={s.id} href={`/spice-guide/${s.slug}`} className="text-nav text-sm underline">
              {s.canonicalName}
            </Link>
          ))}
        </div>
      </div>
      <InternalLinksSection
        title="UK, wholesale and spice guides"
        groups={[
          {
            heading: "Shop",
            links: [
              { href: "/wholesale", label: "Indian spice wholesale" },
              { href: "/wholesale/uk", label: "Wholesale UK" },
              { href: "/spice-supplier", label: "Indian spice supplier" },
              { href: "/uk", label: "Indian spices UK" },
            ],
          },
          {
            heading: "Popular spices",
            links: [
              { href: "/spices/cumin", label: "Cumin (jeera)" },
              { href: "/spices/turmeric", label: "Turmeric" },
              { href: "/spices/black-pepper", label: "Black pepper" },
              { href: "/spice-guide/cumin", label: "Cumin guide" },
            ],
          },
        ]}
      />
    </div>
  );
}
