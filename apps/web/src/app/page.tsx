import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { faqs, exploreCategories, packSizes, regionLinks, site, homeBanners } from "@/lib/site";
import { HomeBannerSlider } from "@/components/HomeBannerSlider";
import { loadMarketPrices, loadSpiceEntities } from "@/lib/spice-data";
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
  const prices = loadMarketPrices();
  const products = getCatalogProducts();
  const ukShip = DEFAULT_SHIPPING_RATES.find((r) => r.country === "GB");

  return (
    <div>
      <JsonLd data={faqJsonLd(faqs)} />

      <HomeBannerSlider banners={homeBanners} />

      <section className="border-b border-[#eadfce] bg-white/70">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm text-primary">
          {[
            ["100% Pure & Natural", "No filler blends sold as a single spice"],
            ["UK & EU Delivery", "Quotes for the United Kingdom and Europe"],
            ["Bulk & Wholesale", "10kg minimum on wholesale lines"],
            ["Sourced from India", "Growing regions named, lots labelled honestly"],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-semibold">{t}</p>
              <p className="text-muted text-xs mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {exploreCategories.map((c) => (
            <Link key={c.slug} href={c.href} className="flex flex-col items-center text-center group">
              <span className="relative h-16 w-16 md:h-[4.75rem] md:w-[4.75rem] rounded-full overflow-hidden border-2 border-white shadow-card ring-1 ring-[#eadfce] group-hover:ring-nav">
                <Image src={c.image} alt="" fill className="object-cover" sizes="76px" />
              </span>
              <span className="mt-2 text-[11px] md:text-xs font-semibold text-primary leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-14 grid md:grid-cols-3 gap-5">
        {[
          { href: "/spices/indian-masalas", img: "/images/promo-masalas.jpg", title: "Indian masalas", text: "Traditional blends for authentic taste.", cta: "Shop masalas →" },
          { href: "/wholesale", img: "/images/promo-bulk.jpg", title: "Buy in bulk. Save more.", text: "Ideal for restaurants, retailers and businesses.", cta: "Bulk enquiry →" },
          { href: "/recipes", img: "/images/promo-recipes.jpg", title: "Recipes with spices", text: "Turn everyday meals into something special.", cta: "View recipes →" },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="card-spice overflow-hidden group">
            <span className="relative block h-40">
              <Image src={card.img} alt="" fill className="object-cover group-hover:scale-[1.03] transition" sizes="(min-width: 768px) 33vw, 100vw" />
            </span>
            <span className="block p-5">
              <span className="font-serif text-2xl text-primary block">{card.title}</span>
              <span className="text-sm text-muted mt-2 block">{card.text}</span>
              <span className="text-nav font-semibold text-sm mt-3 inline-block">{card.cta}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="bg-white/60 border-y border-[#eadfce]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="spice-heading text-3xl mb-6">Shop by pack size</h2>
          <div className="flex flex-wrap gap-2">
            {packSizes.map((p) => (
              <Link key={p} href={`/spices?pack=${encodeURIComponent(p)}`} className="rounded-full border border-[#dcc9a8] bg-white px-4 py-2 text-sm font-semibold text-primary hover:border-nav hover:text-nav">
                {p}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-8">
        <div className="card-spice p-8">
          <p className="text-xs tracking-widest text-nav font-semibold">WHOLESALE</p>
          <h2 className="font-serif text-3xl mt-2">Buy Indian spices in bulk</h2>
          <p className="mt-3 text-muted">
            From 10kg to commercial quantities for restaurants, grocers, manufacturers and importers. Tell us the spice, grade you want (when it applies), and whether you need 10kg, 25kg or 50kg bags. We quote selling price separately from Indian market reference prices.
          </p>
          <p className="mt-4 font-semibold">Minimum bulk order: 10kg</p>
          <Link href="/wholesale" className="btn-primary mt-6">Request wholesale quote</Link>
        </div>
        <div className="card-spice p-8">
          <p className="text-xs tracking-widest text-nav font-semibold">UK / EU</p>
          <h2 className="font-serif text-3xl mt-2">Delivery information</h2>
          <p className="mt-3 text-muted">
            We currently take storefront orders for the United Kingdom and listed European countries. Default UK shipping rule: ₹{ukShip?.perKgCharge} per kg (configurable in admin), 1kg minimum chargeable weight.
            Shipping is shown separately from product price. Duty and VAT are not included unless configured. India is where the spices grow — not a delivery country on this shop.
          </p>
          <Link href="/legal/shipping" className="text-nav font-semibold mt-4 inline-block">Shipping details →</Link>
        </div>
      </section>

      <section className="bg-[#2c1810] text-[#f7f1e8] py-14">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-serif text-3xl">Today&apos;s Indian spice market</h2>
          <p className="mt-2 text-white/70 max-w-2xl">
            Indicative Indian market prices — not your purchase cost. Prices vary by origin, quality, grade, market and season. Rows stay empty until a dated source is imported.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-accent">
                <tr>
                  {["Spice", "Market", "Grade", "Avg ₹/kg", "Min", "Max", "Date", "Source"].map((h) => (
                    <th key={h} className="py-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => {
                  const spice = spices.find((s) => s.id === p.spiceId);
                  return (
                    <tr key={`${p.spiceId}-${p.market}`} className="border-t border-white/10">
                      <td className="py-2 pr-4">{spice?.canonicalName ?? p.spiceId}</td>
                      <td className="py-2 pr-4">{p.market}</td>
                      <td className="py-2 pr-4">{p.grade}</td>
                      <td className="py-2 pr-4">{p.averagePrice ?? "—"}</td>
                      <td className="py-2 pr-4">{p.minPrice ?? "—"}</td>
                      <td className="py-2 pr-4">{p.maxPrice ?? "—"}</td>
                      <td className="py-2 pr-4">{p.priceDate}</td>
                      <td className="py-2 pr-4 text-white/60">{p.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Link href="/spice-market-prices" className="inline-block mt-6 text-accent font-semibold">Full market prices →</Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <h2 className="spice-heading text-3xl">Explore 500+ Indian spice products</h2>
          <Link href="/spices" className="text-nav font-semibold">View catalogue →</Link>
        </div>
        <p className="text-muted mb-6">{products.length} SKUs generated from real varieties, forms and pack sizes — not 500 thin duplicate pages.</p>
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

      <section className="bg-white/60 border-y border-[#eadfce]">
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
        <h2 className="spice-heading text-3xl mb-6">Why SpicyCorner</h2>
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
