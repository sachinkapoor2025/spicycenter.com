import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { faqs, exploreCategories, packSizes, regionLinks, site } from "@/lib/site";
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

function SpiceSwatch({ name }: { name: string }) {
  const hues: Record<string, string> = {
    Cumin: "#8b6914",
    Turmeric: "#e0a100",
    Cardamom: "#3f6b3a",
    Chilli: "#b42318",
    Coriander: "#c4b48a",
    Pepper: "#2c1810",
    Cinnamon: "#8a4b28",
    Clove: "#4a2010",
    Saffron: "#d97706",
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="h-16 w-16 rounded-full shadow-inner border border-white/40" style={{ background: hues[name] }} />
      <span className="text-xs text-earth">{name}</span>
    </div>
  );
}

export default function HomePage() {
  const spices = loadSpiceEntities();
  const featured = spices.filter((s) => s.featured || s.featuredKnowledge).slice(0, 10);
  const prices = loadMarketPrices();
  const products = getCatalogProducts();
  const ukShip = DEFAULT_SHIPPING_RATES.find((r) => r.country === "GB");

  return (
    <div>
      <JsonLd data={faqJsonLd(faqs)} />

      <section className="relative overflow-hidden border-b border-[#eadfce] bg-[#2c1810] text-[#f7f1e8]">
        <div className="absolute inset-0 opacity-40" aria-hidden
          style={{ background: "radial-gradient(circle at 18% 80%, #c45c26, transparent 42%), radial-gradient(circle at 88% 18%, #d4a017, transparent 38%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs tracking-[0.25em] text-accent mb-3">AUTHENTIC INDIAN SPICES</p>
            <h1 className="font-serif text-4xl md:text-6xl leading-tight">
              From India<br /><span className="text-accent">to your kitchen</span>
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-xl">
              Pure spices. Richer flavours. Retail packs for home cooks and 10kg+ bags for restaurants, grocers and importers in the UK and Europe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/spices" className="btn-primary">Shop spices</Link>
              <Link href="/wholesale" className="btn-outline border-white text-white hover:bg-white hover:text-primary">Buy in bulk</Link>
            </div>
            <p className="mt-4 text-sm text-white/60">Whole spices, ground masalas, Indian chillies — 100g to 50kg+.</p>
          </div>
          <div className="rounded-2xl bg-[#3a2418]/80 border border-white/10 p-8">
            <p className="text-sm uppercase tracking-widest text-accent mb-6">Spice counter</p>
            <div className="grid grid-cols-3 gap-4">
              {["Cumin", "Turmeric", "Cardamom", "Chilli", "Coriander", "Pepper", "Cinnamon", "Clove", "Saffron"].map((n) => (
                <SpiceSwatch key={n} name={n} />
              ))}
            </div>
          </div>
        </div>
      </section>

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

      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="spice-heading text-3xl mb-8">Explore India&apos;s spices</h2>
        <p className="text-muted mb-8 max-w-3xl">
          Shop by how you cook: whole seeds for tadka, ground spices for everyday masala, chillies for heat and colour, and bulk sacks when a kitchen or shop needs 10kg or more. Every category page explains origin, packing and what the name on the bag should mean.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {exploreCategories.map((c) => (
            <Link key={c.slug} href={c.href} className="card-spice p-5 hover:-translate-y-0.5">
              <p className="font-serif text-lg text-primary">{c.name}</p>
              <p className="text-sm text-muted mt-1">Shop {c.name.toLowerCase()}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-14 grid md:grid-cols-3 gap-5">
        <Link href="/spices/indian-masalas" className="card-spice overflow-hidden p-6 bg-gradient-to-br from-[#fff7ea] to-[#f3d7a3]">
          <p className="font-serif text-2xl text-primary">Indian masalas</p>
          <p className="text-sm text-muted mt-2">Garam masala, sambar powder, kitchen blends — recipes, not mystery dust. See what goes in the tin.</p>
          <span className="text-nav font-semibold text-sm mt-4 inline-block">Shop masalas →</span>
        </Link>
        <Link href="/wholesale" className="card-spice overflow-hidden p-6 bg-gradient-to-br from-[#2c1810] to-[#5a3218] text-white">
          <p className="font-serif text-2xl">Buy in bulk. Save more.</p>
          <p className="text-sm text-white/75 mt-2">Restaurants, retailers and manufacturers from 10kg. Quote by grade, origin and bag size.</p>
          <span className="text-accent font-semibold text-sm mt-4 inline-block">Bulk enquiry →</span>
        </Link>
        <Link href="/recipes" className="card-spice overflow-hidden p-6 bg-gradient-to-br from-[#fff1e8] to-[#f0c4a8]">
          <p className="font-serif text-2xl text-primary">Recipes with spices</p>
          <p className="text-sm text-muted mt-2">Jeera rice, dal tadka, biryani — how to use the jar, not medical claims.</p>
          <span className="text-nav font-semibold text-sm mt-4 inline-block">View recipes →</span>
        </Link>
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

      <section className="bg-[#2c1810] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <p className="font-serif text-2xl">Join the SpicyCorner kitchen list</p>
            <p className="text-white/70 text-sm mt-2 max-w-xl">Harvest notes, new packs and wholesale windows — no fake reviews, no medical claims, no spin-the-wheel popups.</p>
          </div>
          <form action="/contact" className="flex w-full md:w-auto gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="Enter your email address"
              className="flex-1 md:w-72 rounded-full px-4 py-2.5 text-sm text-primary"
            />
            <button type="submit" className="rounded-full bg-nav px-5 py-2.5 text-sm font-semibold hover:bg-[#a74c1e]">Subscribe</button>
          </form>
        </div>
      </section>
    </div>
  );
}
