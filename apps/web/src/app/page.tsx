import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { faqs, exploreCategories, regionLinks, site, homeBanners } from "@/lib/site";
import { HomeBannerSlider } from "@/components/HomeBannerSlider";
import { ProductReviewsPreview } from "@/components/ProductReviewsPreview";
import { TrustBadges } from "@/components/TrustBadges";
import { loadSpiceEntities } from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { faqJsonLd } from "@/lib/seo";
import { featuredBilingualName, PACK_SIZE_RANGE } from "@/lib/catalogue";
import { spiceStockImagePath } from "@/lib/spice-stock-images";

const HOME_H1 = "Indian Spices, Rice & Food Ingredients — Sourced from India to Worldwide";
const HOME_INTRO =
  "We supply Indian spices, rice and food ingredients to businesses worldwide. Explore our product range and send us your requirements for bulk quantities, wholesale supply and international enquiries.";

export const metadata: Metadata = pageMetadata({
  title: HOME_H1,
  description: HOME_INTRO,
  path: "/",
});

export const dynamic = "force-dynamic";

const SHIPPING_BENEFITS = [
  { label: "Worldwide Delivery", icon: "globe" },
  { label: "Safe & Secure Packaging", icon: "package" },
  { label: "Multiple Shipping Options", icon: "truck" },
  { label: "Duties & Taxes Guidance", icon: "document" },
] as const;

function ShippingBenefitIcon({ name }: { name: (typeof SHIPPING_BENEFITS)[number]["icon"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-nav shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {name === "globe" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M3 12h18" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
        </>
      ) : null}
      {name === "package" ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.5 12 3.5 3 8.5l9 5 9-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5v7l9 5 9-5v-7" />
          <path strokeLinecap="round" d="M12 13.5v7" />
        </>
      ) : null}
      {name === "truck" ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v10H3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h3.5L21 13.5V17h-7" />
          <circle cx="7" cy="18" r="1.4" />
          <circle cx="17" cy="18" r="1.4" />
        </>
      ) : null}
      {name === "document" ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7V3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
          <path strokeLinecap="round" d="M9 13h6M9 17h4" />
        </>
      ) : null}
    </svg>
  );
}

function ShippingBenefitList({
  className,
  stacked = false,
}: {
  className?: string;
  stacked?: boolean;
}) {
  return (
    <ul className={className}>
      {SHIPPING_BENEFITS.map((item) => (
        <li
          key={item.label}
          className={
            stacked
              ? "flex flex-col items-center gap-1.5 min-w-0 text-center"
              : "flex items-start gap-2 min-w-0"
          }
        >
          <ShippingBenefitIcon name={item.icon} />
          <span className="text-[11px] sm:text-xs font-semibold text-primary leading-snug">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const spices = loadSpiceEntities();
  const featured = spices.filter((s) => s.featured || s.featuredKnowledge).slice(0, 10);
  const products = getCatalogProducts();

  return (
    <div>
      <JsonLd data={faqJsonLd(faqs)} />

      <HomeBannerSlider banners={homeBanners} />

      <section className="max-w-7xl mx-auto px-4 pt-8 pb-2 text-center">
        <p className="spice-kicker tracking-[0.14em] sm:tracking-[0.16em]">{site.tagline}</p>
        <h1 className="spice-heading text-[1.55rem] sm:text-[1.7rem] md:text-[2.05rem] lg:text-[2.15rem] mt-2 leading-[1.2] max-w-4xl mx-auto">
          {HOME_H1}
        </h1>
        <h2 className="mt-3 text-[0.9rem] sm:text-[0.95rem] md:text-[1.05rem] font-sans font-normal leading-relaxed text-primary max-w-3xl mx-auto">
          {HOME_INTRO}
        </h2>
        <p className="mt-3 text-[0.95rem] sm:text-base text-primary">{site.homepageSubline}</p>
        <p className="mt-2 font-serif italic text-base sm:text-lg text-nav">{site.promise}</p>
      </section>

      <section className="border-b border-[#e6d5bc] bg-beige/70">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="font-serif text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] text-primary text-center mb-4 leading-snug">
            Pure spices, bulk packs and worldwide supply
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center text-sm text-primary">
          {[
            ["100% Pure & Natural", "No filler blends sold as a single spice"],
            ["Worldwide delivery", "Timing is confirmed on your enquiry"],
            ["Bulk pack sizes", `${PACK_SIZE_RANGE} — quantities, not prices`],
            ["Origin: India", "For importers, distributors and restaurants"],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-serif text-base md:text-lg font-normal leading-tight">{t}</h3>
              <p className="text-muted text-xs mt-1">{d}</p>
            </div>
          ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <p className="spice-kicker">Spice-market collection</p>
          <h2 className="font-serif text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] text-primary mt-2 leading-snug">Shop by spice type</h2>
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
        <div className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="font-serif text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] text-primary text-center mb-8 leading-snug">
          Indian masalas, bulk packs and recipes
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
        {[
          { href: "/spices/indian-masalas", img: "/images/promo-masalas.jpg", title: "Indian masalas", text: "Traditional blends for authentic taste.", cta: "Shop masalas →" },
          { href: "/enquiry", img: "/images/promo-bulk.jpg", title: "Enquire for bulk packs", text: "For restaurants, importers, distributors and commercial kitchens.", cta: "Enquire Now →" },
          { href: "/recipes", img: "/images/promo-recipes.jpg", title: "Recipes with spices", text: "Turn everyday meals into something special.", cta: "View recipes →" },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="card-spice overflow-hidden group">
            <span className="relative block h-44 sm:h-56">
              <Image src={card.img} alt="" fill className="object-cover group-hover:scale-[1.03] transition" sizes="(max-width: 640px) 100vw, (min-width: 768px) 33vw, 100vw" />
              <span className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
              <h3 className="absolute bottom-3 left-4 right-4 font-serif text-2xl font-normal text-paper">{card.title}</h3>
            </span>
            <span className="block p-5">
              <span className="text-sm text-muted block">{card.text}</span>
              <span className="text-nav font-semibold text-sm mt-3 inline-block">{card.cta}</span>
            </span>
          </Link>
        ))}
        </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-6 md:py-8 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-10">
        <div className="card-spice overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:grid-cols-2 items-stretch">
            <div className="relative z-10 flex flex-col items-start justify-center bg-[#fbf6ee] px-4 py-4 sm:px-5 sm:py-5 md:px-8 md:py-6 min-w-0">
              <h2 className="spice-heading text-[1.2rem] sm:text-[1.35rem] md:text-[1.5rem] leading-snug">Tell Us What You Need</h2>
              <p className="mt-2.5 max-w-xl text-[0.9rem] md:text-[0.98rem] leading-[1.5] md:leading-relaxed text-primary">
                Looking for spices, masalas, herbs or food ingredients? Fill out our enquiry form with your requirements, and our team will get back to you with availability and details.
              </p>
              <Link href="/enquiry" className="btn-primary mt-3 md:mt-4 !w-auto px-4 py-2 md:px-5 md:py-2.5 text-sm font-semibold">Enquire Now</Link>
            </div>
            <div className="relative min-h-[11rem] md:min-h-[13.5rem] lg:min-h-[15rem] overflow-hidden bg-[#fbf6ee]">
              <Image
                src="/images/tell-us-what-you-need-spices.png"
                alt=""
                fill
                className="object-cover object-[80%_center] md:object-[82%_center]"
                sizes="(max-width: 768px) 45vw, 50vw"
              />
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-[#fbf6ee] via-[#fbf6ee]/70 to-transparent md:hidden"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute inset-y-0 left-0 hidden w-[42%] bg-gradient-to-r from-[#fbf6ee] via-[#fbf6ee]/55 to-transparent md:block"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <div className="card-spice overflow-hidden mt-4 md:mt-5">
          <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:grid-cols-2 items-stretch">
            <div className="relative z-10 flex flex-col justify-center bg-[#fbf6ee] px-4 py-4 sm:px-5 sm:py-5 md:px-8 md:py-6 min-w-0">
              <p className="spice-kicker tracking-[0.14em] sm:tracking-[0.16em] flex items-center gap-3">
                Wholesale Enquiries
                <span className="hidden sm:block h-px w-10 bg-nav" aria-hidden="true" />
              </p>
              <h2 className="font-serif text-[1.2rem] sm:text-[1.35rem] md:text-[1.5rem] text-primary mt-2 leading-snug">
                Request a Wholesale Quote
              </h2>
              <p className="mt-2.5 text-[0.9rem] md:text-[0.98rem] leading-[1.5] md:leading-relaxed text-primary max-w-md">
                Looking for spices, masalas or herbs for your business? Fill out our enquiry form with your requirements, and our team will get back to you with availability and details.
              </p>
              <Link href="/enquiry" className="btn-primary mt-3 md:mt-4 self-start !w-auto rounded-xl px-4 py-2 md:px-5 md:py-2.5 text-sm font-semibold">
                Enquire Now →
              </Link>
              <Link href="/markets" className="text-nav font-semibold mt-2.5 self-start inline-flex items-center text-sm leading-snug">
                Explore Export Markets →
              </Link>
            </div>
            <div className="relative min-h-[11rem] md:min-h-[13.5rem] lg:min-h-[15rem] overflow-hidden bg-[#fbf6ee]">
              <Image
                src="/images/wholesale-enquiries-card.png"
                alt=""
                fill
                className="object-cover object-[72%_center] md:object-[center_52%]"
                sizes="(max-width: 768px) 45vw, 50vw"
              />
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-[48%] bg-gradient-to-r from-[#fbf6ee] via-[#fbf6ee]/65 to-transparent md:hidden"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute inset-y-0 left-0 hidden w-[38%] bg-gradient-to-r from-[#fbf6ee] via-[#fbf6ee]/50 to-transparent md:block"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <div className="card-spice overflow-hidden mt-4 md:mt-5">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] items-stretch">
            <div className="relative z-10 flex flex-col justify-center bg-[#fbf6ee] px-4 py-4 sm:px-5 sm:py-5 md:px-8 md:py-6 min-w-0">
              <p className="spice-kicker tracking-[0.14em] sm:tracking-[0.16em] flex items-center gap-3">
                Shipping & Delivery
                <span className="hidden sm:block h-px w-10 bg-nav" aria-hidden="true" />
              </p>
              <h2 className="font-serif text-[1.2rem] sm:text-[1.35rem] md:text-[1.5rem] text-primary mt-2 leading-snug">
                Global Shipping Made Simple
              </h2>
              <p className="mt-2.5 text-[0.9rem] md:text-[0.98rem] leading-[1.5] md:leading-relaxed text-primary max-w-xl">
                We deliver spices, masalas and herbs to customers across India, the UK, Europe and worldwide.
              </p>
              <p className="mt-2 text-[0.9rem] md:text-[0.98rem] leading-[1.5] md:leading-relaxed text-primary max-w-xl">
                Shipping charges are calculated as per your required order quantity, destination and shipping method. Our team will confirm the best available options, rates and applicable duties or taxes with your quote.
              </p>
              <ShippingBenefitList stacked className="hidden md:grid grid-cols-4 gap-3 mt-4" />
            </div>
            <div className="relative h-[9.75rem] sm:h-[11rem] md:h-auto md:min-h-[14rem] lg:min-h-[16rem] overflow-hidden bg-[#fbf6ee]">
              <Image
                src="/images/global-shipping-banner.jpg"
                alt=""
                fill
                className="object-cover object-[80%_center] md:object-[68%_center]"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#fbf6ee] via-[#fbf6ee]/70 to-transparent md:hidden"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute inset-y-0 left-0 hidden w-[38%] bg-gradient-to-r from-[#fbf6ee] via-[#fbf6ee]/50 to-transparent md:block"
                aria-hidden="true"
              />
            </div>
          </div>
          <ShippingBenefitList className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 pb-4 pt-2 sm:px-5 md:hidden" />
        </div>

        <div className="mt-4 md:mt-5 rounded-lg border border-[#e6d5bc] bg-beige/50 p-4 sm:p-5 md:p-6">
          <p className="spice-kicker tracking-[0.14em] sm:tracking-[0.16em]">UAE and Middle East</p>
          <h2 className="font-serif text-[1.2rem] sm:text-[1.35rem] md:text-[1.5rem] mt-2 text-primary leading-snug">Indian spices for Dubai, Abu Dhabi and the GCC</h2>
          <p className="mt-2.5 text-[0.9rem] md:text-[0.98rem] leading-relaxed text-muted max-w-3xl">
            Importers and hotels in the UAE, Saudi Arabia, Qatar and nearby markets send a free bulk enquiry. We map
            the keyword workbook to country and city hubs — we do not invent a warehouse in every emirate.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/middle-east" className="btn-primary shrink-0 !w-auto px-5 py-2.5 text-sm font-semibold">Middle East hubs</Link>
            <Link href="/middle-east/dubai" className="text-nav font-semibold whitespace-nowrap text-sm leading-none">Dubai</Link>
            <Link href="/middle-east/abu-dhabi" className="text-nav font-semibold whitespace-nowrap text-sm leading-none">Abu Dhabi</Link>
            <Link href="/markets/uae" className="text-nav font-semibold whitespace-nowrap text-sm leading-none">UAE keyword hub</Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14">
        <p className="spice-kicker">Why enquire with SpicyCenter</p>
        <h2 className="spice-heading text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] mt-2 mb-3 leading-snug">A catalogue built for a conversation, not a checkout</h2>
        <p className="text-muted max-w-3xl mb-6">
          Other spice sites publish a price for one pack size and leave the rest as a guess. SpicyCenter lists the spice once. You tell us the quantity, the destination and how you buy, and the reply is for that enquiry.
        </p>
        <TrustBadges className="mb-8" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["One product, your quantity", "Cumin is one enquiry, not a separate button for 100 gm, 1 kg and 25 kg. You type the amount you actually need."],
            ["No list price on the site", "Grade, crop, packaging and destination change the number. We confirm it in the reply instead of showing a figure that will not match your lot."],
            ["Named for the buyer", "The form asks whether you are a wholesaler, retailer, restaurant, foodservice distributor or a private-label buyer."],
            ["Origin stated as India", "Growing-region notes stay on the spice guides when the lot supports them. The catalogue itself is open to buyers worldwide."],
            ["Whole spices and masala blends", "Single spices and dish blends such as garam masala, sambar and chettinad sit in the same catalogue, each with its own photograph."],
            ["Delivery arranged in the reply", "We do not print a delivery date on the product page. Timing is part of the enquiry, for any country you name."],
          ].map(([t, d]) => (
            <div key={t} className="card-spice p-5">
              <h3 className="font-semibold text-primary">{t}</h3>
              <p className="text-sm text-muted mt-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
          <div>
            <p className="spice-kicker">From the spice kitchen</p>
            <h2 className="spice-heading text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] mt-2 leading-snug">
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
            <Link key={s.id} href={`/spices/${s.slug}`} className="card-spice overflow-hidden">
              <span className="relative block h-40 w-full bg-beige">
                <Image
                  src={spiceStockImagePath(`${s.slug} ${s.canonicalName}`)}
                  alt={s.canonicalName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </span>
              <span className="block p-5">
              <h3 className="font-serif text-xl font-normal text-primary">{s.canonicalName}</h3>
              {bilingual ? (
                <p className="text-sm text-muted" lang="ar" dir="rtl">
                  {bilingual.english} — {bilingual.arabic}
                </p>
              ) : null}
              <p className="text-sm text-muted">{s.hindiName} {s.botanicalName ? `· ${s.botanicalName}` : ""}</p>
              <p className="mt-2 text-sm">{s.shortDescription}</p>
              <p className="mt-2 text-xs text-muted">Origin: India</p>
              </span>
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

      <section className="max-w-7xl mx-auto px-4 pb-14">
        <h2 className="spice-heading text-2xl sm:text-3xl mb-4">Customer reviews</h2>
        <ProductReviewsPreview />
      </section>
    </div>
  );
}
