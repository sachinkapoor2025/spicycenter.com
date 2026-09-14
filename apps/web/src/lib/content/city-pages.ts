/** SEO copy for USA city/state spice delivery landing pages. */

import { seoLocations, type SeoLocation } from "./seo-data";

export interface CityPageContent {
  slug: string;
  label: string;
  region: "state" | "city";
  state?: string;
  headline: string;
  metaExtra: string;
  intro: string[];
  delivery: { heading: string; paragraphs: string[] };
  areas: { heading: string; items: string[] };
  whyUs: { heading: string; bullets: string[] };
  howTo: { heading: string; steps: string[] };
  faqs: { q: string; a: string }[];
  relatedCategories: { label: string; href: string; text: string }[];
}

const sharedCategories: CityPageContent["relatedCategories"] = [
  {
    label: "Spices & Accessories",
    href: "/categories/indian-chillies",
    text: "Adult, teen, and kids Indian spices with destination shipping quotes.",
  },
  {
    label: "Home Decorations",
    href: "/categories/whole-spices",
    text: "Whole spices, ground masalas, chillies, and bulk packs.",
  },
  {
    label: "Spice packs",
    href: "/categories/indian-masalas",
    text: "Plates, banners, balloons, and themed tableware.",
  },
  {
    label: "Toys & Novelty",
    href: "/categories/seeds",
    text: "Novelty toys, favor bags, and fun spice add-ons.",
  },
];

function spiceCityContent(loc: SeoLocation): CityPageContent {
  const { slug, label, region, areas, seasonalNote, h1, description } = loc;
  const state = loc.state ?? undefined;
  const place = state ? `${label}, ${state}` : label;

  return {
    slug,
    label,
    region,
    state,
    headline: h1,
    metaExtra: description,
    intro: [
      `Getting ready for spice in ${place}? SpicyCenter offers spices, decorations, spice packs, and novelty items with shopping pages for ${label}. Confirm delivery on each product — we do not assume every SKU ships to every address.`,
      seasonalNote,
      `Order from the catalog and enter your ${place} delivery address at checkout. Transit time comes from the product shipping quote, not a blanket nationwide SLA.`,
    ],
    delivery: {
      heading: `spice shopping in ${label}`,
      paragraphs: [
        `Delivery to ${place} depends on the item and destination. Open a product page to request a shipping quote before you rely on a spice arrival date.`,
        `Popular orders include family spice packs, yard bulk packs, party supply bundles, and novelty add-ons — geared for ${label} shoppers. ${seasonalNote}`,
      ],
    },
    areas: {
      heading: `${label} Areas We Serve`,
      items: areas,
    },
    whyUs: {
      heading: `Why ${label} Shoppers Choose SpicyCenter`,
      bullets: [
        "Check the product shipping quote for your destination",
        "Spices, decor, spice packs, and novelty in one store",
        "Secure Stripe (USD) and Razorpay (INR) checkout",
        "Plan early — transit varies by item, so we do not guarantee your requested date arrival",
        "WhatsApp and email customer support",
      ],
    },
    howTo: {
      heading: `How to Order spice Supplies for ${place}`,
      steps: [
        "Browse spices, decor, spice packs, or toys & novelty.",
        `Enter your ${place} address at checkout.`,
        "Pay securely online.",
        "Confirm the product-page shipping quote for that destination.",
        "Track the order using the method shown after checkout.",
      ],
    },
    faqs: [
      {
        q: `Do you deliver spice orders to ${label}?`,
        a: `We publish a shopping page for ${place}. Confirm whether a product can be quoted to your address on the product page — we do not assume every SKU ships there.`,
      },
      {
        q: "Can I order from outside the USA?",
        a: `Yes. Order on SpicyCenter.com, enter the ${place} delivery address, and pay in USD or INR. Confirm shipping on the product page.`,
      },
      {
        q: `What should I know about spice in ${label}?`,
        a: seasonalNote,
      },
    ],
    relatedCategories: [...sharedCategories],
  };
}

export const cityPages: CityPageContent[] = seoLocations.map(spiceCityContent);

const cityMap = new Map(cityPages.map((c) => [c.slug, c]));

export function getCityContent(slug: string): CityPageContent | undefined {
  return cityMap.get(slug);
}

export function allCityContent(): CityPageContent[] {
  return cityPages;
}
