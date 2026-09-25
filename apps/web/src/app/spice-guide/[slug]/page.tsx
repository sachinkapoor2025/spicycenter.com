import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, faqJsonLd, spiceGuideArticleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import {
  getSpiceBySlug,
  isPublishedSpice,
  loadMarketPrices,
  loadPublishedSpiceEntities,
  loadSpiceEntities,
} from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { spiceHubLinks } from "@/lib/seo/spice-hub-links";
import { recipesForSpice } from "@/lib/recipes";
import { nutritionDisclaimer, wholeVsGroundCopy } from "@/lib/content/spice-display";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return loadPublishedSpiceEntities().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const spice = getSpiceBySlug(slug);
  if (!spice) return pageMetadata({ title: "Spice guide", description: "Indian spice encyclopaedia", path: `/spice-guide/${slug}` });
  return pageMetadata({
    title: spice.seoTitle ?? `What is ${spice.canonicalName}? Names, origin, uses and buying`,
    description: spice.metaDescription ?? spice.shortDescription,
    path: `/spice-guide/${spice.slug}`,
  });
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl text-primary">{title}</h2>
      <div className="mt-3 prose prose-neutral max-w-none text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export default async function SpiceGuidePage({ params }: Props) {
  const { slug } = await params;
  const spice = getSpiceBySlug(slug);
  if (!spice || !isPublishedSpice(spice)) notFound();
  const related = loadSpiceEntities().filter((s) => spice.relatedSpiceIds.includes(s.id));
  const products = getCatalogProducts().filter((p) => p.tags?.includes(`spice:${spice.id}`)).slice(0, 12);
  const price = loadMarketPrices().find((p) => p.spiceId === spice.id);
  const recipes = recipesForSpice(spice.id).slice(0, 8);

  const facts = [
    ["Common name", spice.canonicalName],
    ["Hindi", spice.hindiName ?? "—"],
    ["Sanskrit", spice.sanskritName ?? "—"],
    ["Botanical name", spice.botanicalName ?? "—"],
    ["Family", spice.botanicalFamily ?? "—"],
    ["Origin", spice.origin],
    ["Main producing regions", spice.growingRegions.join(", ") || "—"],
    ["Flavour", spice.flavourProfile ?? "—"],
    ["Aroma", spice.aromaProfile ?? "—"],
    ["Forms", spice.forms.join(", ")],
    ["Retail packs", "100g–5kg (typical; see products)"],
    ["Bulk", "10kg+"],
  ];

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd
        data={[
          spiceGuideArticleJsonLd({
            slug: spice.slug,
            title: `What is ${spice.canonicalName}?`,
            description: spice.metaDescription ?? spice.shortDescription,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Spice guide", path: "/spice-guide" },
            { name: spice.canonicalName, path: `/spice-guide/${spice.slug}` },
          ]),
          ...(spice.faqs?.length ? [faqJsonLd(spice.faqs)] : []),
        ]}
      />
      <p className="text-sm text-muted"><Link href="/spice-guide">Spice guide</Link> / {spice.canonicalName}</p>
      <h1 className="spice-heading text-4xl mt-2">What is {spice.canonicalName}?</h1>
      <p className="mt-3 text-lg text-muted">{spice.shortDescription}</p>
      <p className="mt-4 text-[15px] leading-relaxed">
        <strong>Short answer:</strong> {spice.canonicalName}
        {spice.hindiName ? ` (Hindi: ${spice.hindiName})` : ""}
        {spice.botanicalName ? ` is ${spice.botanicalName}` : ""}. {spice.flavourProfile}. Culinary use only — not a medicine.
      </p>

      <div className="mt-8 overflow-x-auto card-spice">
        <table className="w-full text-sm">
          <tbody>
            {facts.map(([k, v]) => (
              <tr key={k} className="border-b border-[#eadfce]">
                <th className="text-left p-3 w-48 text-earth">{k}</th>
                <td className="p-3">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Block title={`What is ${spice.canonicalName}?`}><p>{spice.description}</p></Block>
      <Block title={`History of ${spice.canonicalName}`}><p>{spice.history}</p></Block>
      <Block title="Origin"><p>{spice.origin}{spice.originRegion ? ` — ${spice.originRegion}` : ""}</p></Block>
      <Block title="Growing regions"><p>{spice.growingRegions.join(", ")}</p></Block>
      <Block title="How it is grown"><p>{spice.cultivation}</p></Block>
      <Block title="Harvest"><p>{spice.harvestSeason}</p></Block>
      <Block title="Processing"><p>{spice.processing}</p></Block>
      <Block title="Grades">
        <ul>
          {spice.grades.filter((g) => g.applies).map((g) => (
            <li key={g.gradeName}><strong>{g.gradeName}:</strong> {g.description}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">Only grades that apply to a lot should be shown at purchase. These are templates, not invented industry certificates.</p>
      </Block>
      <Block title="Flavour, aroma and colour">
        <p>{spice.flavourProfile}. {spice.aromaProfile}. Colour: {spice.colour}. Heat: {spice.heatLevel ?? "n/a"}.</p>
      </Block>
      <Block title="Whole vs ground">
        <p>{wholeVsGroundCopy(spice)}</p>
        <p className="mt-2 text-sm">
          <Link className="text-nav" href="/spice-guide/comparisons/whole-spices-vs-ground-spices">
            Whole spices vs ground spices →
          </Link>
        </p>
      </Block>
      <Block title="Culinary uses">
        <ul>{spice.culinaryUses.map((u) => <li key={u}>{u}</li>)}</ul>
      </Block>
      <Block title="Traditional uses">
        <p>{spice.traditionalUses || "Recorded in culinary tradition. Traditional use is not scientific evidence of a medical effect."}</p>
        <p className="text-sm text-muted mt-2">SpicyCenter does not claim that spices cure, treat or prevent disease.</p>
      </Block>
      <Block title="Storage and shelf life">
        <p>{spice.storage} {spice.shelfLife}</p>
      </Block>
      <Block title="Nutrition">
        <p>{nutritionDisclaimer(spice)}</p>
      </Block>
      <Block title="Buying guide">
        <p>Available pack sizes are 100 gm, 200 gm, 500 gm, 1 kg, 5 kg, 10 kg, 15 kg, 20 kg and 25 kg. They are quantities, not prices. Indian market figures, when present, are reference only.</p>
        <FreeEnquiryCtas productName={spice.canonicalName} spiceQuery={spice.slug} />
      </Block>
      {price && (
        <Block title="Indicative Indian market price">
          <p>
            {price.averagePrice == null
              ? "No dated market print has been imported yet. Admin must enter min/max/average with market, grade, date and source."
              : `Indicative Indian mandi ${price.currency === "INR" ? "₹" : ""}${price.averagePrice}/${price.unit} (${price.market}, ${price.grade}, ${price.priceDate}) — market reference only, not a catalogue price.`}
          </p>
          <p className="text-sm text-muted">{price.notes}</p>
          <Link href="/spice-market-prices" className="text-nav text-sm">Market prices →</Link>
        </Block>
      )}
      {spice.faqs?.length ? (
        <Block title="FAQs">
          {spice.faqs.map((f) => (
            <div key={f.q} className="mb-4">
              <p className="font-semibold">{f.q}</p>
              <p>{f.a}</p>
            </div>
          ))}
        </Block>
      ) : null}

      {recipes.length > 0 ? (
        <Block title="Recipes using this spice">
          <ul>
            {recipes.map((r) => (
              <li key={r.slug}>
                <Link className="text-nav" href={`/recipes/${r.slug}`}>{r.title}</Link>
                <span className="text-sm text-muted"> — {r.summary}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="Related spices">
        <div className="flex flex-wrap gap-2">
          {related.map((r) => (
            <Link key={r.id} href={`/spice-guide/${r.slug}`} className="rounded-full border px-3 py-1 text-sm">{r.canonicalName}</Link>
          ))}
        </div>
      </Block>

      <Block title="Catalogue">
        <div className="grid gap-2">
          {products.map((p) => (
            <Link key={p.slug} href={`/products/${p.slug}`} className="text-nav text-sm">
              {p.name} — view and enquire
            </Link>
          ))}
        </div>
        <Link href={`/bulk-spices/${spice.slug}`} className="inline-block mt-3 font-semibold text-nav">Bulk {spice.canonicalName} →</Link>
      </Block>
      <InternalLinksSection groups={spiceHubLinks(spice.slug, spice.canonicalName)} title={`${spice.canonicalName} — shop, wholesale and UK`} />
    </article>
  );
}
