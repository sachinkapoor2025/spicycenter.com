import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { faqs, exploreCategories, packSizes, regionLinks, site, homeBanners } from "@/lib/site";
import { HomeBannerSlider } from "@/components/HomeBannerSlider";
import { ProductReviewsPreview } from "@/components/ProductReviewsPreview";
import { TrustBadges } from "@/components/TrustBadges";
import { loadSpiceEntities } from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { faqJsonLd } from "@/lib/seo";
import { featuredBilingualName } from "@/lib/catalogue";
import { api } from "@/lib/api";
import { LiveMandiPriceBoard } from "@/components/LiveMandiPriceBoard";
import type { LiveMandiBoard } from "@/lib/live-mandi-prices";

export const metadata: Metadata = pageMetadata({
  title: "Indian spice catalogue — worldwide business enquiries",
  description: site.description,
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const spices = loadSpiceEntities();
  const featured = spices.filter((s) => s.featured || s.featuredKnowledge).slice(0, 10);
  const products = getCatalogProducts();
  let mandi: LiveMandiBoard | null = null;
  try {
    mandi = await api<LiveMandiBoard>("/prices", { revalidate: 3600, timeoutMs: 8000 });
  } catch {
    mandi = null;
  }
  const livePrices = (mandi?.prices ?? []).filter((p) => p.available).slice(0, 6);

  return (
    <div>
      <JsonLd data={faqJsonLd(faqs)} />

      <HomeBannerSlider banners={homeBanners} />

      <section className="max-w-7xl mx-auto px-4 pt-8 pb-2 text-center md:text-left">
        <h1 className="spice-heading text-3xl sm:text-4xl">Indian spice catalogue for importers, distributors and kitchens worldwide</h1>
      </section>

      <section className="border-b border-[#e6d5bc] bg-beige/70">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center text-sm text-primary">
          {[
            ["100% Pure & Natural", "No filler blends sold as a single spice"],
            ["Worldwide delivery", "Timing is confirmed on your enquiry"],
            ["Bulk pack sizes", "100 gm to 25 kg — quantities, not prices"],
            ["Origin: India", "For importers, distributors and restaurants"],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-serif text-base md:text-lg leading-tight">{t}</p>
              <p className="text-muted text-xs mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <p className="spice-kicker">Spice-market collection</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-primary mt-2">Shop by spice type</h2>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 sm:gap-4">
          {exploreCategories.map((c) => (
            <Link key={c.slug} href={c.href} className="flex flex-col items-center text-center group min-w-0">
              <span className="relative h-14 w-14 sm:h-[4.25rem] sm:w-[4.25rem] md:h-24 md:w-24 rounded-full overflow-hidden border-[3px] border-paper shadow-card ring-1 ring-[#e6d5bc] group-hover:ring-nav">
                <Image src={c.image} alt="" fill className="object-cover" sizes="96px" />
              </span>
              <span className="mt-2 text-[10px] md:text-xs font-semibold text-primary leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-beige/50 border-y border-[#e6d5bc]">
        <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-5">
        {[
          { href: "/spices/indian-masalas", img: "/images/promo-masalas.jpg", title: "Indian masalas", text: "Traditional blends for authentic taste.", cta: "Shop masalas →" },
          { href: "/enquiry", img: "/images/promo-bulk.jpg", title: "Enquire for bulk packs", text: "For restaurants, importers, distributors and commercial kitchens.", cta: "Enquire Now →" },
          { href: "/recipes", img: "/images/promo-recipes.jpg", title: "Recipes with spices", text: "Turn everyday meals into something special.", cta: "View recipes →" },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="card-spice overflow-hidden group">
            <span className="relative block h-44 sm:h-56">
              <Image src={card.img} alt="" fill className="object-cover group-hover:scale-[1.03] transition" sizes="(max-width: 640px) 100vw, (min-width: 768px) 33vw, 100vw" />
              <span className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
              <span className="absolute bottom-3 left-4 right-4 font-serif text-2xl text-paper">{card.title}</span>
            </span>
            <span className="block p-5">
              <span className="text-sm text-muted block">{card.text}</span>
              <span className="text-nav font-semibold text-sm mt-3 inline-block">{card.cta}</span>
            </span>
          </Link>
        ))}
        </div>
      </section>

      <section className="bg-paper border-b border-[#e6d5bc]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="spice-heading text-3xl mb-6">Available bulk quantities</h2>
          <div className="flex flex-wrap gap-2">
            {packSizes.map((p) => (
              <Link key={p} href={`/spices?pack=${encodeURIComponent(p)}`} className="rounded-md border border-[#e6d5bc] bg-cream px-4 py-2 text-sm font-semibold text-primary hover:border-nav hover:text-nav">
                {p}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-8">
        <div className="card-spice p-8 spice-panel">
          <p className="spice-kicker">Wholesale</p>
          <h2 className="font-serif text-3xl mt-2">Browse the catalogue, then enquire</h2>
          <p className="mt-3 text-muted">
            Pack sizes run from 100 gm to 25 kg for importers, distributors, restaurants and other food businesses. Tell us the spice and the pack size. We reply with availability. This site does not take payment or show a delivery date.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/enquiry" className="btn-primary">Enquire Now</Link>
            <Link href="/markets" className="text-nav font-semibold inline-flex items-center">
              Export markets →
            </Link>
          </div>
        </div>
        <div className="card-spice p-8 spice-panel">
          <p className="spice-kicker">Worldwide</p>
          <h2 className="font-serif text-3xl mt-2">Global delivery</h2>
          <p className="mt-3 text-muted">
            SpicyCenter supplies worldwide. Choose your country in the header for local context, then send an enquiry.
            Delivery timing is handled in that conversation, not as a date on the product page.
          </p>
          <Link href="/legal/shipping" className="text-nav font-semibold mt-4 inline-block">Shipping details →</Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-14">
        <div className="card-spice p-8">
          <p className="spice-kicker">UAE and Middle East</p>
          <h2 className="font-serif text-3xl mt-2">Indian spices for Dubai, Abu Dhabi and the GCC</h2>
          <p className="mt-3 text-muted max-w-3xl">
            Importers and hotels in the UAE, Saudi Arabia, Qatar and nearby markets send a free bulk enquiry. We map
            the keyword workbook to country and city hubs — we do not invent a warehouse in every emirate.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/middle-east" className="btn-primary">Middle East hubs</Link>
            <Link href="/middle-east/dubai" className="text-nav font-semibold">Dubai</Link>
            <Link href="/middle-east/abu-dhabi" className="text-nav font-semibold">Abu Dhabi</Link>
            <Link href="/markets/uae" className="text-nav font-semibold">UAE keyword hub</Link>
          </div>
        </div>
      </section>

      {livePrices.length > 0 && (
        <section className="bg-paper border-y border-[#e6d5bc] py-14">
          <div className="max-w-7xl mx-auto px-4">
            <p className="spice-kicker">Live Agmarknet</p>
            <h2 className="font-serif text-3xl text-primary mt-2">Today&apos;s Indian spice market</h2>
            <p className="mt-2 text-muted max-w-2xl">
              Live mandi prints from India are market reference only. They are not catalogue prices. Ask for a quote on the enquiry form.
            </p>
            <LiveMandiPriceBoard prices={livePrices} compact />
            <Link href="/spice-market-prices" className="inline-block mt-6 text-nav font-semibold">
              Full live market board →
            </Link>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
          <div>
            <p className="spice-kicker">From the spice kitchen</p>
            <h2 className="spice-heading text-2xl sm:text-3xl mt-2">
              {products.length > 0
                ? `Explore ${products.length} Indian spice products`
                : "Explore Indian spices"}
            </h2>
          </div>
          <Link href="/spices" className="text-nav font-semibold shrink-0">View catalogue →</Link>
        </div>
        <p className="text-muted mb-6">
          {products.length > 0
            ? `${products.length} SKUs from real varieties, forms and pack sizes — not thin duplicate pages.`
            : "Open the catalogue to browse cumin, turmeric, pepper and masalas, then send an enquiry."}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((s) => {
            const bilingual = featuredBilingualName(s.canonicalName, s.slug);
            return (
            <Link key={s.id} href={`/spices/${s.slug}`} className="card-spice p-5">
              <p className="font-serif text-xl text-primary">{s.canonicalName}</p>
              {bilingual ? (
                <p className="text-sm text-muted" lang="ar" dir="rtl">
                  {bilingual.english} — {bilingual.arabic}
                </p>
              ) : null}
              <p className="text-sm text-muted">{s.hindiName} {s.botanicalName ? `· ${s.botanicalName}` : ""}</p>
              <p className="mt-2 text-sm">{s.shortDescription}</p>
              <p className="mt-2 text-xs text-muted">Origin: India · Enquire for 100 gm–25 kg packs</p>
            </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-beige/60 border-y border-[#e6d5bc]">
        <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-8">
          <div>
            <h2 className="spice-heading text-2xl mb-4">Spice knowledge</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-nav" href="/spice-guide">All 88 spice guides</Link></li>
              <li><Link className="text-nav" href="/spice-guide/comparisons">Spice comparisons</Link></li>
              <li><Link className="text-nav" href="/spice-guide/comparisons/kashmiri-chilli-vs-regular-chilli">Kashmiri vs regular chilli</Link></li>
              <li><Link className="text-nav" href="/spice-guide/comparisons/garam-masala-vs-curry-powder">Garam masala vs curry powder</Link></li>
              <li><Link className="text-nav" href="/spice-guide/comparisons/whole-spices-vs-ground-spices">Whole vs ground spices</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="spice-heading text-2xl mb-4">Recipes</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-nav" href="/recipes">Recipe hub</Link></li>
              <li><Link className="text-nav" href="/recipes/biryani">Biryani</Link></li>
              <li><Link className="text-nav" href="/recipes/dal-tadka">Dal tadka</Link></li>
              <li><Link className="text-nav" href="/journal">Spice journal</Link></li>
              <li><Link className="text-nav" href="/spice-finder">Which spice should I use?</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="spice-heading text-2xl mb-4">Indian spice regions</h2>
            <ul className="space-y-2 text-sm">
              {regionLinks.map((r) => (
                <li key={r.slug}><Link className="text-nav" href={`/indian-spice-regions/${r.slug}`}>{r.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14">
        <p className="spice-kicker">Quality you can taste</p>
        <h2 className="spice-heading text-3xl mt-2 mb-6">Why SpicyCenter</h2>
        <TrustBadges className="mb-8" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Indian origin", "Cumin from Rajasthan and Gujarat, pepper from the Ghats, chilli from Guntur or Kashmir — named when the lot supports it."],
            ["Grades when they apply", "We print a grade only if it belongs to that spice and lot, not as decoration."],
            ["Business buyers", "Importers, distributors, restaurants and commercial kitchens."],
            ["Worldwide delivery", "Any country can enquire. Timing is confirmed in the reply, not on the product page."],
            ["Food information", "Fields for ingredients, allergens and origin so UK/EU distance selling can be completed properly."],
            ["Spice encyclopaedia", "Guides, comparisons and recipes sit next to the shop so you know what you are buying."],
          ].map(([t, d]) => (
            <div key={t} className="card-spice p-5">
              <p className="font-semibold text-primary">{t}</p>
              <p className="text-sm text-muted mt-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-14">
        <h2 className="spice-heading text-2xl sm:text-3xl mb-4">Customer reviews</h2>
        <ProductReviewsPreview />
      </section>
    </div>
  );
}
