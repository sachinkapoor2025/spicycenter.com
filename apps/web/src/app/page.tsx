import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { exploreCategories, site, homeBanners } from "@/lib/site";
import { HomeBannerSlider } from "@/components/HomeBannerSlider";
import { ProductReviewsPreview } from "@/components/ProductReviewsPreview";
import { TrustBadges } from "@/components/TrustBadges";
import { loadSpiceEntities } from "@/lib/spice-data";
import { getCatalogProducts } from "@/lib/catalog-fallback";
import { faqJsonLd } from "@/lib/seo";
import { featuredBilingualName, PACK_SIZE_RANGE } from "@/lib/catalogue";
import { spiceStockImagePath } from "@/lib/spice-stock-images";
import { HOME_SUPPLIED_H1, HOME_SUPPLIED_INTRO, HOME_SUPPLIED_SECTIONS } from "@/lib/content/supplied-pages";
import { SuppliedPageCopy } from "@/components/SuppliedPageCopy";
import { RfqForm } from "@/components/RfqForm";

const HOME_H1 = HOME_SUPPLIED_H1;
const HOME_INTRO = [HOME_SUPPLIED_INTRO] as const;

const SHOP_TYPE_NOTES = [
  ["Whole Spices", "Cumin, cardamom, cloves, pepper and more, with their aroma intact."],
  ["Ground Spices", "Ready-to-use spices for kitchens that need consistency."],
  ["Blended Masalas", "Garam masala, sambar, chettinad and other traditional blends."],
  ["Herbs & Seasonings", "Including kasuri methi and other dried herbs."],
  ["Seeds & Grains", "Fenugreek, coriander, mustard and similar staples."],
  ["Dried Ingredients", "Dried chillies and other kitchen essentials."],
  ["Premium Range", "Selected spices for buyers looking for something special."],
  ["Bulk Spices", "Larger quantities for commercial supply."],
] as const;

const POPULAR_SPICES = [
  ["Cumin", "Warm and earthy"],
  ["Turmeric", "Available as dried fingers or powder"],
  ["Black Pepper", ""],
  ["Green Cardamom", "Sweet and aromatic"],
  ["Kashmiri Chilli", "Mild heat and deep red colour"],
  ["Clove", ""],
] as const;

const HOME_META_TITLE = "Your Sourcing Partner for Indian Spices | SpicyCenter";
const HOME_META_DESCRIPTION =
  "Share a spice sourcing requirement with SpicyCenter. We identify suitable independent Indian suppliers, compare available quotations and help connect you with the right option.";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: HOME_META_TITLE,
    description: HOME_META_DESCRIPTION,
    path: "/",
    absoluteTitle: true,
  }),
  HOME_META_TITLE,
);

export const dynamic = "force-dynamic";

/**
 * Subject center (0–1) of each 240×240 category photo, measured from non-background pixels.
 * The circle is the same aspect as the file, so object-position cannot move the subject.
 * These frames shift that subject to the circle center and scale just enough to stay covered.
 * cat-6 (premium) is already centered and keeps the default cover crop.
 */
const CATEGORY_IMAGE_FRAMES: Record<string, { x: number; y: number; scale: number }> = {
  "whole-spices": { x: 0.651, y: 0.48, scale: 1.55 },
  "ground-spices": { x: 0.606, y: 0.469, scale: 1.38 },
  "indian-masalas": { x: 0.596, y: 0.47, scale: 1.34 },
  herbs: { x: 0.586, y: 0.463, scale: 1.32 },
  seeds: { x: 0.586, y: 0.472, scale: 1.32 },
  "indian-chillies": { x: 0.546, y: 0.521, scale: 1.2 },
  "bulk-spices": { x: 0.389, y: 0.507, scale: 1.4 },
};

function categoryImageLayout(slug: string): { left: string; top: string; size: string } | null {
  const frame = CATEGORY_IMAGE_FRAMES[slug];
  if (!frame) return null;
  return {
    size: `${frame.scale * 100}%`,
    left: `${(0.5 - frame.x * frame.scale) * 100}%`,
    top: `${(0.5 - frame.y * frame.scale) * 100}%`,
  };
}

const SHIPPING_BENEFITS = [
  { label: "Worldwide delivery", icon: "globe" },
  { label: "Packaging confirmed per order", icon: "package" },
  { label: "Multiple shipping options", icon: "truck" },
  { label: "Guidance on duties and taxes", icon: "document" },
] as const;

function ShippingBenefitIcon({
  name,
  className = "h-5 w-5",
}: {
  name: (typeof SHIPPING_BENEFITS)[number]["icon"];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} text-nav shrink-0`}
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
  itemClassName = "",
  stacked = false,
  circled = false,
}: {
  className?: string;
  itemClassName?: string;
  stacked?: boolean;
  circled?: boolean;
}) {
  return (
    <ul className={className}>
      {SHIPPING_BENEFITS.map((item) => (
        <li
          key={item.label}
          className={
            stacked
              ? `flex flex-col items-center gap-1 md:gap-1.5 min-w-0 text-center ${itemClassName}`
              : `flex items-start gap-2 min-w-0 ${itemClassName}`
          }
        >
          {circled ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-nav/70">
              <ShippingBenefitIcon name={item.icon} className="h-[1.15rem] w-[1.15rem]" />
            </span>
          ) : (
            <ShippingBenefitIcon name={item.icon} />
          )}
          <span
            className={
              circled
                ? "text-[11px] font-semibold text-primary leading-tight"
                : "text-xs font-semibold text-primary leading-snug"
            }
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const spices = loadSpiceEntities();
  const featured = spices.filter((s) => s.featured || s.featuredKnowledge).slice(0, 10);
  const products = getCatalogProducts();
  const productCount = products.length;
  const homeFaqs = [
    {
      q: "What does SpicyCenter sell?",
      a: productCount > 0
        ? `Spices and masalas are the main catalogue: ${productCount} products, from whole and ground spices to traditional blended masalas. Rice and other food-ingredient enquiries may be discussed separately, subject to availability, and are not part of that catalogue.`
        : "Spices and masalas are the main catalogue, from whole and ground spices to traditional blended masalas. Rice and other food-ingredient enquiries may be discussed separately, subject to availability, and are not part of that catalogue.",
    },
    {
      q: "Who can buy from SpicyCenter?",
      a: "Businesses can send an enquiry. The form asks for your name, company, phone, email, destination and products, and the enquiry type: a commercial order, a sample request or a generic product enquiry. A commercial order also asks for the quantity. It does not ask you to select a buyer category.",
    },
    {
      q: "Why don’t you show prices on the website?",
      a: "Because the right price depends on the grade, crop, packaging, quantity and destination. A fixed price on a page rarely matches a real order. Send an enquiry and we will give you a quote based on what you actually need.",
    },
    {
      q: "What quantities can I order?",
      a: `Listed pack sizes range from ${PACK_SIZE_RANGE}. Tell us the quantity you need in the enquiry form and we will reply with the options. Larger requirements may be discussed separately, and are not a standard or guaranteed pack size.`,
    },
    {
      q: "Do you deliver to the UK and Europe?",
      a: "Yes. We deliver to the UK, Europe, the Middle East and other countries worldwide. Delivery timing and shipping cost are confirmed in your quote.",
    },
    {
      q: "Who pays customs duties and import taxes?",
      a: "Duties and taxes depend on your country and the type of product. We guide you through them when we send your quote.",
    },
    {
      q: "How are single spices and blends described?",
      a: "A single spice is sold as that spice. Traditional blends are named as blends. We do not describe a blend as a single spice.",
    },
    {
      q: "Where do your spices come from?",
      a: "Our spices are sourced from India. Where a lot supports it, we mention the growing region in the spice guides.",
    },
    {
      q: "Do you sell masala blends as well as single spices?",
      a: "Yes. Along with single spices, we supply traditional blends such as garam masala, sambar masala and chettinad masala.",
    },
    {
      q: "How do I request a quote?",
      a: `Fill out the enquiry form with the spices, quantity and destination, or message us on WhatsApp or at ${site.contactEmail}. Our team will reply with availability and details.`,
    },
  ];

  return (
    <div>
      <JsonLd data={faqJsonLd(homeFaqs)} />

      <section className="bg-primary text-paper">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div>
            <p className="text-xs tracking-[0.18em] uppercase text-[#f3d7b0]">Independent Indian spice sourcing</p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl mt-3 leading-tight">Your Sourcing Partner for Indian Spices</h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-paper/90">
              Share your spice sourcing requirements with us. We identify suitable Indian suppliers, compare available quotations and help connect you with the right sourcing options.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/80">
              SpicyCenter does not manufacture spices or hold them as its own stock. Availability, specifications, certificates and prices are confirmed with the selected supplier.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
              <a href="#requirement" className="btn-primary w-full sm:!w-auto justify-center bg-nav px-5 py-3 text-sm font-semibold">Submit Your Requirement</a>
              <Link href="/spices" className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-paper/40 px-5 py-3 text-sm font-semibold">Explore Our Products</Link>
            </div>
          </div>
          <div className="rounded-2xl bg-paper/10 p-5 text-sm leading-relaxed">
            <p className="font-serif text-xl">What you can expect</p>
            <ul className="mt-3 space-y-2 text-paper/90">
              <li>A written requirement, not a published list price.</li>
              <li>Supplier options compared only where quotations exist.</li>
              <li>Unknown details marked as pending confirmation.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="font-serif text-2xl sm:text-3xl text-primary">How sourcing works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            ["1", "Share Your Requirement", "Tell us the product, quantity and specification."],
            ["2", "Confirm Specifications", "We clarify grade, quality, packaging and destination."],
            ["3", "Find Suitable Vendors", "We look for relevant independent suppliers."],
            ["4", "Compare Available Quotations", "We compare price, MOQ, specifications and timelines that suppliers actually provide."],
            ["5", "Connect and Coordinate", "We connect you with the selected vendor and coordinate only the agreed scope."],
          ].map(([step, title, text]) => (
            <li key={step} className="card-spice p-4">
              <p className="font-serif text-2xl text-nav">{step}</p>
              <h3 className="mt-2 font-semibold text-primary">{title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="requirement" className="bg-beige/60 border-y border-[#e6d5bc]">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="font-serif text-2xl sm:text-3xl text-primary">Submit your requirement</h2>
          <p className="mt-3 text-muted leading-relaxed">Use this form or WhatsApp. We reply after the requirement is clear enough to approach suitable suppliers.</p>
          <div className="mt-6">
            <RfqForm products={spices.map((spice) => spice.canonicalName)} />
          </div>
        </div>
      </section>

      <HomeBannerSlider banners={homeBanners} />

      <section className="border-b border-[#e6d5bc] bg-beige/70">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 grid md:grid-cols-2 gap-6 md:gap-10">
          <div>
            <h2 className="font-serif text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] text-primary leading-snug">
              Single Spices and Traditional Blends
            </h2>
            <p className="mt-3 text-sm md:text-base text-primary leading-relaxed">
              When you buy a single spice from us, it is that spice and nothing else. We do not describe a blend as a single spice. Traditional blends, such as garam masala, are named and sold as blends. Spices in the catalogue are sourced from India.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] text-primary leading-snug">
              From 100 gm to 1 Metric Ton
            </h2>
            <p className="mt-3 text-sm md:text-base text-primary leading-relaxed">
              Some buyers start with a small trial pack. Others ask for a larger quantity. Listed pack sizes run from {PACK_SIZE_RANGE}. You can test a spice before a larger order inside that range. Requirements above 1 metric ton may be discussed separately, and are not a standard pack size.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-8">
          <p className="spice-kicker">Spice-market collection</p>
          <h2 className="font-serif text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] text-primary mt-2 leading-snug">Shop by Spice Type</h2>
          <p className="mt-3 text-sm md:text-base text-muted max-w-3xl mx-auto leading-relaxed">
            {productCount > 0
              ? `Our catalogue has ${productCount} Indian spice products, each a real variety, form or pack size and not a thin duplicate listing. Browse by category:`
              : "Browse the catalogue by category. Each listing is a real variety, form or pack size, not a thin duplicate."}
          </p>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 sm:gap-4">
          {exploreCategories.map((c) => {
            const frame = categoryImageLayout(c.slug);
            return (
            <Link key={c.slug} href={c.href} className="flex flex-col items-center text-center group min-w-0">
              <span className="relative h-14 w-14 sm:h-[4.25rem] sm:w-[4.25rem] md:h-24 md:w-24 rounded-full overflow-hidden border-[3px] border-paper shadow-card ring-1 ring-[#e6d5bc] group-hover:ring-nav">
                {frame ? (
                  <Image
                    src={c.image}
                    alt=""
                    width={240}
                    height={240}
                    sizes="96px"
                    className="absolute max-w-none"
                    style={{ width: frame.size, height: frame.size, left: frame.left, top: frame.top }}
                  />
                ) : (
                  <Image src={c.image} alt="" fill className="object-cover" sizes="96px" />
                )}
              </span>
              <span className="mt-2 text-[11px] md:text-xs font-semibold text-primary leading-tight break-words">{c.name}</span>
            </Link>
            );
          })}
        </div>
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {SHOP_TYPE_NOTES.map(([name, text]) => (
            <li key={name} className="min-w-0 rounded-lg border border-[#e6d5bc] bg-[#fbf6ee] px-3 py-3 sm:px-4 sm:py-4">
              <h3 className="font-serif text-base text-primary leading-snug">{name}</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <h3 className="font-serif text-xl sm:text-2xl text-primary leading-snug">Popular Spices</h3>
          <ul className="mt-4 grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {POPULAR_SPICES.map(([name, note]) => (
              <li key={name} className="min-w-0 rounded-lg border border-[#e6d5bc] bg-beige/50 px-3 py-2.5 text-sm leading-snug text-primary">
                <span className="font-semibold">{name}</span>
                {note ? <span className="text-muted"> — {note}</span> : null}
              </li>
            ))}
          </ul>
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

      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
          <div>
            <p className="spice-kicker">From the spice kitchen</p>
            <h2 className="spice-heading text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] mt-2 leading-snug">
              {productCount > 0
                ? `Explore ${productCount} Indian spice products`
                : "Explore Indian spices"}
            </h2>
          </div>
          <Link href="/spices" className="text-nav font-semibold shrink-0">View catalogue →</Link>
        </div>
        <p className="text-muted mb-6">
          {productCount > 0
            ? `${productCount} products from real varieties, forms and pack sizes — not thin duplicate listings.`
            : "Open the catalogue to browse cumin, turmeric, pepper and masalas, then send an enquiry."}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {featured.map((s) => {
            const bilingual = featuredBilingualName(s.canonicalName, s.slug);
            return (
            <Link key={s.id} href={`/spices/${s.slug}`} className="card-spice overflow-hidden">
              <span className="relative block aspect-[4/3] w-full bg-beige">
                <Image
                  src={spiceStockImagePath(`${s.slug} ${s.canonicalName}`)}
                  alt={s.canonicalName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
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

      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
        <p className="spice-kicker tracking-[0.14em] sm:tracking-[0.16em]">{site.tagline}</p>
        <h2 className="spice-heading text-[1.55rem] sm:text-[1.7rem] md:text-[2.05rem] lg:text-[2.15rem] mt-2 leading-[1.2] max-w-4xl mx-auto">
          {HOME_H1}
        </h2>
        {HOME_INTRO.map((paragraph) => (
          <p
            key={paragraph}
            className="mt-3 text-[0.9rem] sm:text-[0.95rem] md:text-[1.05rem] font-sans font-normal leading-relaxed text-primary max-w-3xl mx-auto"
          >
            {paragraph}
          </p>
        ))}
        <p className="mt-3 text-[0.95rem] sm:text-base text-primary">Indian spices sourced through independent suppliers.</p>
        <p className="mt-2 font-serif italic text-base sm:text-lg text-nav">{site.promise}</p>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-4">
        <SuppliedPageCopy sections={HOME_SUPPLIED_SECTIONS} />
        <Link href="/enquiry" className="btn-primary mt-8 inline-flex !w-auto px-5 py-2.5 text-sm font-semibold">
          Send an enquiry
        </Link>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="spice-heading text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] mt-2 mb-3 leading-snug">Why Buyers Enquire with Us</h2>
        <p className="text-muted max-w-3xl mb-6">
          Most spice websites show one price for one pack size and leave you to guess the rest. We do it differently, because real wholesale does not work that way.
        </p>
        <TrustBadges className="mb-8" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Tell us your quantity", `You do not pick from fixed pack buttons. Cumin is one product, and you tell us how much you need, from ${PACK_SIZE_RANGE}. Larger requirements may be discussed separately, and are not a standard or guaranteed pack size.`],
            ["Your price is for your order", "Grade, crop, packaging and destination all change the final number, so we confirm it in our reply instead of showing a list price that will not match your lot."],
            ["We know who we are talking to", "The enquiry asks for your company and the type of request — a commercial order, a sample request or a generic product enquiry — so the reply fits that enquiry."],
            ["Whole spices and masalas, one catalogue", "Single spices and traditional blends sit together, each with its own photograph."],
            ["Delivery is planned with you", "We do not print a delivery date on a product page. Timing is confirmed in your quote, for whichever country you name."],
          ].map(([t, d]) => (
            <div key={t} className="card-spice p-5">
              <h3 className="font-semibold text-primary">{t}</h3>
              <p className="text-sm text-muted mt-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="card-spice relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 z-0 md:hidden" aria-hidden="true">
            <Image
              src="/images/global-shipping-banner.jpg"
              alt=""
              fill
              className="object-cover object-[82%_center]"
              sizes="100vw"
            />
            <span className="absolute inset-0 bg-gradient-to-r from-[#fbf6ee] from-[40%] via-[#fbf6ee]/88 via-[62%] to-transparent to-[78%]" />
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] items-stretch">
            <div className="relative z-10 flex flex-col justify-center bg-transparent md:bg-[#fbf6ee] px-4 pt-5 pb-4 sm:px-5 sm:py-5 md:px-8 md:py-6 min-w-0">
              <p className="spice-kicker text-[11px] tracking-[0.16em] sm:tracking-[0.16em] flex items-center gap-3">
                Shipping & Delivery
                <span className="block h-px w-12 md:w-10 bg-nav" aria-hidden="true" />
              </p>
              <h2 className="font-serif text-[1.7rem] sm:text-[1.8rem] md:text-[1.5rem] text-primary mt-2 leading-[1.12] md:leading-snug max-w-[13.5rem] md:max-w-none">
                Global Shipping, Made Simple
              </h2>
              <p className="mt-3 md:mt-2.5 text-[0.92rem] md:text-[0.98rem] leading-[1.55] md:leading-relaxed text-primary max-w-[13.75rem] md:max-w-xl">
                We deliver spices, masalas and herbs to customers across India, the UK, Europe and worldwide.
              </p>
              <p className="mt-2.5 md:mt-2 text-[0.92rem] md:text-[0.98rem] leading-[1.55] md:leading-relaxed text-primary max-w-[13.75rem] md:max-w-xl">
                Shipping charges depend on your order quantity, destination and shipping method. Packaging options are confirmed according to the product and the order requirements. With your quote, our team will confirm the available options, the rates, and any duties or taxes that may apply.
              </p>
              <ShippingBenefitList stacked className="hidden md:grid grid-cols-4 gap-3 mt-4" />
              <ShippingBenefitList
                stacked
                circled
                itemClassName="border-r border-[#e6d5bc] last:border-r-0 px-0.5"
                className="grid grid-cols-4 gap-0 mt-4 w-[74%] md:hidden"
              />
            </div>
            <div className="relative hidden md:block md:h-auto md:min-h-[14rem] lg:min-h-[16rem] overflow-hidden bg-[#fbf6ee]">
              <Image
                src="/images/global-shipping-banner.jpg"
                alt=""
                fill
                className="object-cover object-[68%_center]"
                sizes="45vw"
              />
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-[38%] bg-gradient-to-r from-[#fbf6ee] via-[#fbf6ee]/50 to-transparent"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

      </section>

      <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="card-spice overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:grid-cols-2 items-stretch">
            <div className="relative z-10 flex flex-col items-start justify-center bg-[#fbf6ee] px-4 py-4 sm:px-5 sm:py-5 md:px-8 md:py-6 min-w-0">
              <h2 className="spice-heading text-[1.2rem] sm:text-[1.35rem] md:text-[1.5rem] leading-snug">Ready to Order? Tell Us What You Need</h2>
              <p className="mt-2.5 max-w-xl text-[0.9rem] md:text-[0.98rem] leading-[1.5] md:leading-relaxed text-primary">
                Send us your requirements: the spices you want, the quantity, and where it needs to go. Our team will get back to you with availability and details.
              </p>
              <Link href="/enquiry" className="btn-primary mt-3 md:mt-4 !w-auto px-4 py-2 md:px-5 md:py-2.5 text-sm font-semibold">Request a Wholesale Quote →</Link>
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
                Send us the spices you want, the quantity, and where it needs to go. Our team will reply with availability and details.
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
      </section>

      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="spice-heading text-[1.35rem] sm:text-[1.5rem] md:text-[1.7rem] leading-snug">Frequently Asked Questions</h2>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {homeFaqs.map((faq) => (
            <div key={faq.q} className="card-spice p-5">
              <h3 className="font-semibold text-primary">{faq.q}</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-14">
        <h2 className="spice-heading text-2xl sm:text-3xl mb-4">Customer reviews</h2>
        <ProductReviewsPreview />
      </section>
    </div>
  );
}
