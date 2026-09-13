import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { loadSpiceEntities, searchSpices } from "@/lib/spice-data";
import { parseBulkHint } from "@spicycorner/shared";
import { exploreCategories } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Shop Indian spices — retail and bulk",
  description: "Browse whole spices, powders, Indian chillies, masalas and bulk packs. Search understands jeera, botanical names and 25kg.",
  path: "/spices",
});

export default async function SpicesIndex({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; pack?: string; category?: string; channel?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.search ?? "";
  const pack = sp.pack ?? "";
  const category = sp.category ?? "";
  const channel = sp.channel ?? "";
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
  if (pack) {
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
      <h1 className="spice-heading text-4xl mt-2">Shop Indian spices</h1>
      <p className="mt-3 text-muted max-w-2xl">
        Filters cover type, origin, pack and retail vs bulk. {products.length} matching SKUs.
        {q ? ` Search: “${q}”.` : ""}
      </p>
      <div className="flex flex-wrap gap-2 mt-6">
        {exploreCategories.map((c) => (
          <Link key={c.slug} href={`/spices/${c.slug}`} className="rounded-full border border-[#dcc9a8] px-3 py-1 text-sm hover:border-nav">
            {c.name}
          </Link>
        ))}
        <Link href="/spices?channel=retail" className="rounded-full border px-3 py-1 text-sm">Retail</Link>
        <Link href="/spices?channel=bulk" className="rounded-full border px-3 py-1 text-sm">Bulk</Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {shown.map((p) => (
          <Link key={p.slug} href={`/products/${p.slug}`} className="card-spice p-4">
            <div className="h-28 rounded-lg bg-gradient-to-br from-[#e8d7b8] to-[#c45c26]/40 mb-3" />
            <p className="font-semibold text-primary">{p.name}</p>
            <p className="text-sm text-muted mt-1">Draft selling price ₹{p.price} · not a market reference</p>
          </Link>
        ))}
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
    </div>
  );
}
