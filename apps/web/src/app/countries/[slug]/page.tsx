import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { allCountrySeoSlugs, getCountrySeoPage, storefrontCountrySeoPages } from "@/lib/content/country-pages";
import { geoCountries } from "@/lib/content/geo";
import { countryPageInlineLinks } from "@/lib/content/page-inline-links";
import { applyInlineLinks } from "@/lib/inline-links";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, canonical } from "@/lib/seo";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { site } from "@/lib/site";
import { getInternalLinkGroups } from "@spicycorner/shared";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return allCountrySeoSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getCountrySeoPage(slug);
  if (!page) return { title: "Country" };
  const languages: Record<string, string> = {
    "x-default": canonical("/"),
  };
  for (const p of storefrontCountrySeoPages()) {
    languages[p.hreflang] = canonical(`/countries/${p.slug}`);
  }
  const meta = pageMetadata({
    title: page.title,
    description: page.description,
    path: `/countries/${slug}`,
    keywords: page.keywords.join(", "),
    absoluteTitle: true,
  });
  return {
    ...meta,
    alternates: {
      canonical: canonical(`/countries/${slug}`),
      languages,
    },
    openGraph: {
      ...meta.openGraph,
      locale: page.locale,
    },
  };
}

export default async function CountryLandingPage({ params }: Props) {
  const { slug } = await params;
  const page = getCountrySeoPage(slug);
  if (!page) notFound();

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
    { label: page.name },
  ];
  const inlineLinks = countryPageInlineLinks[slug] ?? [];
  const spiceCountry = geoCountries().find((c) => c.legacyCountryPath === `/countries/${slug}`);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href ?? `/countries/${slug}` }))),
          faqJsonLd(page.faqs),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: page.h1,
            description: page.description,
            url: canonical(`/countries/${slug}`),
            inLanguage: page.hreflang,
            isPartOf: { "@id": `${canonical("/")}#website` },
            about: { "@type": "Country", name: page.name },
          },
        ]}
      />
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-bold text-primary mb-3">{page.h1}</h1>
      <p className="text-slate-600 mb-6">{applyInlineLinks(page.intro, inlineLinks)}</p>
      <p className="text-slate-700 mb-8">{page.fulfillment}</p>

      {spiceCountry && (
        <p className="mb-8 text-sm">
          <Link href={spiceCountry.path} className="text-nav underline">
            Browse spice {page.name} by region and city
          </Link>
        </p>
      )}

      {page.sections.map((section) => (
        <section key={section.heading} className="mb-8">
          <h2 className="text-xl font-semibold text-primary mb-2">{section.heading}</h2>
          <p className="text-slate-600 leading-relaxed">{section.body}</p>
        </section>
      ))}

      <div className="flex flex-wrap gap-3 mb-10">
        <Link href="/products" className="rounded-lg bg-nav px-4 py-2 text-sm font-semibold text-white">
          Shop spices
        </Link>
        <Link href="/spices/whole-spices" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
          Whole spices
        </Link>
        <Link href="/shipping" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
          Shipping &amp; {page.postalLabel}
        </Link>
      </div>

      <h2 className="text-xl font-semibold text-primary mb-3">FAQ</h2>
      <dl className="space-y-4 mb-10">
        {page.faqs.map((f) => (
          <div key={f.q}>
            <dt className="font-semibold text-slate-800">{f.q}</dt>
            <dd className="text-slate-600 mt-1">{f.a}</dd>
          </div>
        ))}
      </dl>

      <h2 className="text-xl font-semibold text-primary mb-3">Other markets</h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-nav">
        {storefrontCountrySeoPages()
          .filter((p) => p.slug !== slug)
          .map((p) => (
            <li key={p.slug}>
              <Link href={`/countries/${p.slug}`} className="underline">
                {p.name}
              </Link>
            </li>
          ))}
      </ul>
      <p className="text-xs text-slate-500 mt-8">
        {site.name} does not redirect search engines by IP. Country selection is optional and always changeable.
      </p>

      <InternalLinksSection
        groups={getInternalLinkGroups({ type: "country", countrySlug: slug })}
        title="Related spice pages"
        intro="Shop categories, other destinations, and spice guides from this country page."
      />
    </div>
  );
}
