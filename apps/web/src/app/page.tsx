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
        <div className="absolute inset-0 opacity-30" aria-hidden
          style={{ background: "radial-gradient(circle at 20% 80%, #c45c26, transparent 40%), radial-gradient(circle at 80% 20%, #d4a017, transparent 35%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs tracking-[0.25em] text-accent mb-3">YOUR INDIAN SPICE CORNER</p>
            <h1 className="font-serif text-4xl md:text-6xl leading-tight">
              THE WORLD OF<br />INDIAN SPICES
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-xl">
              Authentic Indian spices sourced from India&apos;s spice-growing regions — available in retail packs and bulk quantities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/spices" className="btn-primary">Shop spices</Link>
              <Link href="/wholesale" className="btn-outline border-white text-white hover:bg-white hover:text-primary">Buy in bulk</Link>
            </div>
            <p className="mt-4 text-sm text-white/60">From whole spices to ground masalas. From 100g packs to 10kg+ bulk orders.</p>
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

      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="spice-heading text-3xl mb-8">Explore India&apos;s spices</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {exploreCategories.map((c) => (
            <Link key={c.slug} href={c.href} className="card-spice p-5 hover:-translate-y-0.5">
              <p className="font-serif text-lg text-primary">{c.name}</p>
              <p className="text-sm text-muted mt-1">Shop {c.name.toLowerCase()}</p>
            </Link>
          ))}
        </div>
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
          <p className="mt-3 text-muted">From 10kg to commercial quantities for restaurants, grocers, manufacturers and importers.</p>
          <p className="mt-4 font-semibold">Minimum bulk order: 10kg</p>
          <Link href="/wholesale" className="btn-primary mt-6">Request wholesale quote</Link>
        </div>
        <div className="card-spice p-8">
          <p className="text-xs tracking-widest text-nav font-semibold">UK / EU</p>
          <h2 className="font-serif text-3xl mt-2">Delivery information</h2>
          <p className="mt-3 text-muted">
            Default UK shipping rule: ₹{ukShip?.perKgCharge} per kg (configurable in admin), 1kg minimum chargeable weight.
            Shipping is shown separately from product price. Duty and VAT are not included unless configured.
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
            "Indian origin and regional sourcing stories",
            "Quality-focused grades (only when they apply to the lot)",
            "Retail and wholesale on one platform",
            "Configurable international shipping",
            "Food-information fields for UK/EU distance selling",
            "A spice encyclopaedia beside the shop counter",
          ].map((t) => (
            <div key={t} className="card-spice p-5 text-sm">{t}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
