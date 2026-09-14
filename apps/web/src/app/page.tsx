import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { faqs, exploreCategories, packSizes, regionLinks, site, homeBanners } from "@/lib/site";
import { HomeBannerSlider } from "@/components/HomeBannerSlider";
import { loadImportedMarketPrices, loadSpiceEntities } from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { faqJsonLd } from "@/lib/seo";
import { DEFAULT_SHIPPING_RATES } from "@spicycorner/shared";

export const metadata: Metadata = pageMetadata({
  title: "The world of Indian spices — retail packs and 10kg+ bulk",
  description: site.description,
  path: "/",
});

export const dynamic = "force-dynamic";

export default function HomePage() {
  const spices = loadSpiceEntities();
  const featured = spices.filter((s) => s.featured || s.featuredKnowledge).slice(0, 10);
  const prices = loadImportedMarketPrices();
  const products = getCatalogProducts();
  const ukShip = DEFAULT_SHIPPING_RATES.find((r) => r.country === "GB");

  return (
    <div>
      <JsonLd data={faqJsonLd(faqs)} />

      <HomeBannerSlider banners={homeBanners} />

      <section className="border-b border-[#e6d5bc] bg-beige/70">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center text-sm text-primary">
          {[
            ["100% Pure & Natural", "No filler blends sold as a single spice"],
            ["UK & EU Delivery", "Quotes for the United Kingdom and Europe"],
            ["Bulk & Wholesale", "10kg minimum on wholesale lines"],
            ["Sourced from India", "Growing regions named, lots labelled honestly"],
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
          { href: "/wholesale", img: "/images/promo-bulk.jpg", title: "Buy in bulk. Save more.", text: "Ideal for restaurants, retailers and businesses.", cta: "Bulk enquiry →" },
          { href: "/recipes", img: "/images/promo-recipes.jpg", title: "Recipes with spices", text: "Turn everyday meals into something special.", cta: "View recipes →" },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="card-spice overflow-hidden group">
            <span className="relative block h-44 sm:h-56">
              <Image src={card.img} alt="" fill className="object-cover group-hover:scale-[1.03] transition" sizes="(min-width: 768px) 33vw, 100vw" />
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
          <h2 className="spice-heading text-3xl mb-6">Shop by pack size</h2>
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
          <h2 className="font-serif text-3xl mt-2">Buy Indian spices in bulk</h2>
          <p className="mt-3 text-muted">
            From 10kg to commercial quantities for restaurants, grocers, manufacturers and importers. Tell us the spice, grade you want (when it applies), and whether you need 10kg, 25kg or 50kg bags. We quote selling price separately from Indian market reference prices.
          </p>
          <p className="mt-4 font-semibold">Minimum bulk order: 10kg</p>
          <Link href="/wholesale" className="btn-primary mt-6">Request wholesale quote</Link>
        </div>
        <div className="card-spice p-8 spice-panel">
          <p className="spice-kicker">UK / EU</p>
          <h2 className="font-serif text-3xl mt-2">Delivery information</h2>
          <p className="mt-3 text-muted">
            We currently take storefront orders for the United Kingdom and listed European countries. Default UK shipping rule: ₹{ukShip?.perKgCharge} per kg (configurable in admin), 1kg minimum chargeable weight.
            Shipping is shown separately from product price. Duty and VAT are not included unless configured. India is where the spices grow — not a delivery country on this shop.
          </p>
          <Link href="/legal/shipping" className="text-nav font-semibold mt-4 inline-block">Shipping details →</Link>
        </div>
      </section>

      {prices.length > 0 && (
        <section className="bg-paper border-y border-[#e6d5bc] py-14">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="font-serif text-3xl text-primary">Today&apos;s Indian spice market</h2>
            <p className="mt-2 text-muted max-w-2xl">
              Indicative Indian market prices — not your purchase cost. Prices vary by origin, quality, grade, market and season.
            </p>
            <div className="mt-6 overflow-x-auto card-spice">
              <table className="w-full text-sm">
                <thead className="text-left text-earth">
                  <tr>
                    {["Spice", "Market", "Grade", "Avg ₹/kg", "Min", "Max", "Date", "Source"].map((h) => (
                      <th key={h} className="p-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p) => {
                    const spice = spices.find((s) => s.id === p.spiceId);
                    return (
                      <tr key={`${p.spiceId}-${p.market}-${p.grade}-${p.priceDate}`} className="border-t border-[#e6d5bc]">
                        <td className="p-3">{spice?.canonicalName ?? p.spiceId}</td>
                        <td className="p-3">{p.market}</td>
                        <td className="p-3">{p.grade}</td>
                        <td className="p-3">{p.averagePrice}</td>
                        <td className="p-3">{p.minPrice ?? "—"}</td>
                        <td className="p-3">{p.maxPrice ?? "—"}</td>
                        <td className="p-3">{p.priceDate}</td>
                        <td className="p-3 text-muted">{p.source}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Link href="/spice-market-prices" className="inline-block mt-6 text-nav font-semibold">Full market prices →</Link>
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
            : "Retail packs and 10kg+ wholesale bags. Open the catalogue to browse cumin, turmeric, pepper and masalas."}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((s) => (
            <Link key={s.id} href={`/spice-guide/${s.slug}`} className="card-spice p-5">
              <p className="font-serif text-xl text-primary">{s.canonicalName}</p>
              <p className="text-sm text-muted">{s.hindiName} {s.botanicalName ? `· ${s.botanicalName}` : ""}</p>
              <p className="mt-2 text-sm">{s.shortDescription}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-beige/60 border-y border-[#e6d5bc]">
        <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-8">
          <div>
            <h2 className="spice-heading text-2xl mb-4">Spice knowledge</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-nav" href="/spice-guide/cumin">What is cumin?</Link></li>
              <li><Link className="text-nav" href="/spice-guide/turmeric">History of turmeric</Link></li>
              <li><Link className="text-nav" href="/spices/indian-chillies">Best Indian chillies</Link></li>
              <li><Link className="text-nav" href="/indian-spice-regions">Indian spice regions</Link></li>
              <li><Link className="text-nav" href="/spice-guide/comparisons/whole-spices-vs-ground-spices">Whole vs ground spices</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="spice-heading text-2xl mb-4">Recipes</h2>
            <ul className="space-y-2 text-sm">
              <li><Link className="text-nav" href="/recipes/biryani">Biryani</Link></li>
              <li><Link className="text-nav" href="/recipes/jeera-rice">Jeera rice</Link></li>
              <li><Link className="text-nav" href="/recipes/dal-tadka">Dal tadka</Link></li>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Indian origin", "Cumin from Rajasthan and Gujarat, pepper from the Ghats, chilli from Guntur or Kashmir — named when the lot supports it."],
            ["Grades when they apply", "We print a grade only if it belongs to that spice and lot, not as decoration."],
            ["Retail and wholesale", "100g for the kitchen drawer, 10kg+ for the restaurant store."],
            ["UK and Europe only", "Delivery quotes for the United Kingdom and listed EU/EEA countries — not a worldwide doorway map."],
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
    </div>
  );
}
