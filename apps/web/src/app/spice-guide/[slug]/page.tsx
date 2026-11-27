import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, faqJsonLd, spiceGuideArticleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import {
  getSpiceBySlug,
  isPublishedSpice,
  loadPublishedSpiceEntities,
  loadSpiceEntities,
} from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { spiceHubLinks } from "@/lib/seo/spice-hub-links";
import { recipesForSpice } from "@/lib/recipes";
import { displayHindiName, wholeVsGroundCopy } from "@/lib/content/spice-display";

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
  const recipes = recipesForSpice(spice.id).slice(0, 8);

  const hindi = displayHindiName(spice);
  const alsoKnown = [...new Set([...spice.commonNames, ...spice.indianNames, ...spice.regionalNames])]
    .map((name) => name.trim())
    .filter((name) => name && name.toLowerCase() !== spice.canonicalName.toLowerCase());
  const heatLabel =
    spice.heatLevel && spice.heatLevel !== "none"
      ? { mild: "Mild", medium: "Medium", hot: "Hot", very_hot: "Very hot" }[spice.heatLevel]
      : undefined;
  const facts = [
    ["Hindi", hindi === "—" ? "" : hindi],
    ["Also known as", alsoKnown.join(", ")],
    ["Botanical name", spice.botanicalName ?? ""],
    ["Flavour", spice.flavourProfile ?? ""],
    ["Aroma", spice.aromaProfile ?? ""],
    ["Colour", spice.colour ?? ""],
    ["Heat", heatLabel ?? ""],
    ["Forms", spice.forms.join(", ")],
  ].filter(([, value]) => value);
  const regions = spice.growingRegions.filter(Boolean);
  const originBits = [spice.origin, spice.originRegion].filter(Boolean);
  const faqs = (spice.faqs ?? []).filter((faq) => !/^what is\b/i.test(faq.q.trim()));

  return (
    <article className="w-full px-4 py-10">
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
          ...(faqs.length ? [faqJsonLd(faqs)] : []),
        ]}
      />
      <p className="text-sm text-muted"><Link href="/spice-guide">Spice guide</Link> / {spice.canonicalName}</p>
      <h1 className="spice-heading text-4xl mt-2">What is {spice.canonicalName}?</h1>
      <p className="mt-4 text-[15px] leading-relaxed">{spice.description || spice.shortDescription}</p>

      {facts.length > 0 ? (
        <dl className="mt-8 card-spice divide-y divide-[#eadfce] text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-1 sm:gap-4 p-3">
              <dt className="text-earth">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {spice.culinaryUses.length > 0 ? (
        <Block title={`How ${spice.canonicalName} is used`}>
          <ul className="list-disc pl-5 space-y-1">
            {spice.culinaryUses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
        </Block>
      ) : null}

      {regions.length > 0 || originBits.length > 0 ? (
        <Block title={`Where ${spice.canonicalName} is grown and known`}>
          {regions.length > 0 ? <p>Main growing regions: {regions.join(", ")}.</p> : null}
          {originBits.length > 0 ? <p className={regions.length > 0 ? "mt-2" : ""}>{originBits.join(" — ")}</p> : null}
        </Block>
      ) : null}

      <Block title="Whole or ground">
        <p>{wholeVsGroundCopy(spice)}</p>
        <p className="mt-2 text-sm">
          <Link className="text-nav" href="/spice-guide/comparisons/whole-spices-vs-ground-spices">
            Whole spices vs ground spices →
          </Link>
        </p>
      </Block>

      {spice.storage || spice.shelfLife ? (
        <Block title="Storage">
          <p>{[spice.storage, spice.shelfLife].filter(Boolean).join(" ")}</p>
        </Block>
      ) : null}

      <Block title={`Buying ${spice.canonicalName}`}>
        <p>Tell us the quantity you need, from 100 gm to 1 metric ton. Prices are confirmed in the reply.</p>
        <FreeEnquiryCtas productName={spice.canonicalName} spiceQuery={spice.slug} />
      </Block>
      {faqs.length > 0 ? (
        <Block title="FAQs">
          {faqs.map((f) => (
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

      {related.length > 0 ? (
        <Block title="Related spices">
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link key={r.id} href={`/spice-guide/${r.slug}`} className="rounded-full border px-3 py-1 text-sm">{r.canonicalName}</Link>
            ))}
          </div>
        </Block>
      ) : null}

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
