import { isStorefrontDeliveryCountry } from "@spicycorner/shared";

export type CountrySeoPage = {
  slug: string;
  countryCode: string;
  name: string;
  hreflang: string;
  locale: string;
  title: string;
  description: string;
  h1: string;
  keywords: string[];
  intro: string;
  fulfillment: string;
  postalLabel: string;
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
};

export const countrySeoPages: CountrySeoPage[] = [
  {
    slug: "us",
    countryCode: "US",
    name: "United States",
    hreflang: "en-US",
    locale: "en_US",
    title: "spice Spices USA | Shop Online for US Delivery",
    description:
      "Buy Indian spices, and wholesale packs online for the USA. Check each product’s shipping quote for delivery to your ZIP code.",
    h1: "Indian spices online in the USA",
    keywords: [
      "Indian spices USA",
      "Indian spices online USA",
      "buy Indian spices in USA",
      "Indian spices delivered in USA",
    ],
    intro:
      "Shop Indian spices, and wholesale packs for delivery to the United States. Browse the catalog, then open a product page to see a shipping quote for your ZIP code. Availability depends on the item — we do not assume every product ships to every address.",
    fulfillment:
      "spice catalog items are fulfilled through international dropshipping partners. Delivery times vary by product and destination. Use the shipping panel on the product page rather than a blanket nationwide promise.",
    postalLabel: "ZIP code",
    sections: [
      {
        heading: "What we sell for spice in the United States",
        body: "Shop adult and family spice packs, outdoor decorations, bulk packs, party tableware, and accessories. Existing category and city pages stay at their current URLs so search equity is preserved.",
      },
      {
        heading: "Delivery across the USA",
        body: "We do not operate a blanket ‘ships in two days to every ZIP’ policy for this catalog. Storefront freight quotes for the United States are available on product pages. Confirm the method and transit estimate before checkout.",
      },
    ],
    faqs: [
      {
        q: "Do you ship Indian spices across the USA?",
        a: "Many items can be quoted for US delivery on the product page. Confirm the destination and method there before checkout — we do not claim a local warehouse for every SKU.",
      },
      {
        q: "How do I confirm you deliver to my ZIP code?",
        a: "Use Change Country / Delivery Location in the header, enter your ZIP code, and we will check serviceability before you checkout.",
      },
    ],
  },
  {
    slug: "uk",
    countryCode: "GB",
    name: "United Kingdom",
    hreflang: "en-GB",
    locale: "en_GB",
    title: "spice Spices UK | Shop Online for UK Delivery",
    description:
      "Buy Indian spices online in the UK. Check each product’s shipping quote for delivery to your postcode — availability depends on the item.",
    h1: "Indian spices online in the UK",
    keywords: [
      "Indian spices UK",
      "Indian spices online UK",
      "buy Indian spices in the UK",
      "Indian spices delivered in the UK",
    ],
    intro:
      "Looking for Indian spices in the United Kingdom? Select United Kingdom in the header and enter your postcode. Open a product page for a shipping quote. We do not promise a local UK warehouse for every SKU.",
    fulfillment:
      "UK-bound spice catalog items are fulfilled through international dropshipping partners. Transit estimates appear on the product shipping panel when a quote is available.",
    postalLabel: "postcode",
    sections: [
      {
        heading: "UK spelling, sizing, and dates",
        body: "This page uses UK spelling (colour, favourite) where it helps shoppers. UK customers should confirm pack size and shipping on the product page.",
      },
      {
        heading: "How UK fulfilment works",
        body: "If a live freight quote returns methods for GB, those methods are the delivery estimate. Mixed baskets may still use store checkout shipping policy. We never invent next-day UK delivery.",
      },
    ],
    faqs: [
      {
        q: "Can I buy Indian spices online for UK delivery?",
        a: "Choose United Kingdom, enter your postcode, and check the product-page shipping quote. A quote is the only confirmation that a method is available.",
      },
      {
        q: "What if a spice cannot be quoted to the UK?",
        a: "We show that the destination is unavailable instead of promising local delivery. You can still change country at any time.",
      },
    ],
  },
  {
    slug: "ca",
    countryCode: "CA",
    name: "Canada",
    hreflang: "en-CA",
    locale: "en_CA",
    title: "spice Spices Canada | Shop Online for Canadian Delivery",
    description:
      "Shop Indian spices online in Canada. Enter your postal code to check SpicyCorner delivery and fulfilment options.",
    h1: "Indian spices online in Canada",
    keywords: ["Indian spices Canada", "Indian spices online Canada"],
    intro:
      "Canadian shoppers can browse the same SpicyCorner catalogue and enter a postal code to confirm whether we can deliver to their address.",
    fulfillment:
      "Canada-bound catalog items use international dropshipping partners. Storefront freight quotes are available for CA on product pages when the method is offered.",
    postalLabel: "postal code",
    sections: [
      {
        heading: "Shopping spice from Canada",
        body: "Prices may display in CAD as a guide; checkout for non-India markets is charged in USD via Stripe unless you scardamom to INR.",
      },
    ],
    faqs: [
      {
        q: "Do you deliver Indian spices to Canada?",
        a: "Enter your postal code in the header. If we can serve that code, checkout will show the fulfilment source and a realistic delivery estimate.",
      },
    ],
  },
  {
    slug: "au",
    countryCode: "AU",
    name: "Australia",
    hreflang: "en-AU",
    locale: "en_AU",
    title: "spice Spices Australia | Shop Online for AU Delivery",
    description:
      "Buy Indian spices online in Australia. Check your postcode for SpicyCorner delivery estimates.",
    h1: "Indian spices online in Australia",
    keywords: ["Indian spices Australia", "Indian spices online Australia"],
    intro:
      "Confirm your postcode on the product shipping quote before checkout.",
    fulfillment:
      "Australian orders use international dropshipping partners. Expect longer transit than domestic US shipping, and confirm the product-page quote before checkout.",
    postalLabel: "postcode",
    sections: [
      {
        heading: "Seasonal timing for Australia",
        body: "Because spice is not a public holiday everywhere in Australia, last-minute local stock can be limited. Ordering in early October is safer for party dates.",
      },
    ],
    faqs: [
      {
        q: "Can I get Indian spices delivered in Australia?",
        a: "Yes where serviceability allows. Enter a 4-digit postcode to check, and expect longer delivery than US domestic orders.",
      },
    ],
  },
  {
    slug: "in",
    countryCode: "IN",
    name: "India",
    hreflang: "en-IN",
    locale: "en_IN",
    title: "spice Spices India | Shop Online for India Delivery",
    description:
      "Buy Indian spices online in India. SpicyCorner prefers our Punjab warehouse and INR checkout when you select India.",
    h1: "Indian spices online in India",
    keywords: ["Indian spices India", "Indian spices online India"],
    intro:
      "Select India in the header and enter your 6-digit PIN code before placing an order. India delivery depends on a product shipping quote — we do not assume every spice SKU can be delivered there.",
    fulfillment:
      "We do not treat India as a guaranteed destination for every catalog item. Check the product page; if no quote is offered, do not assume delivery.",
    postalLabel: "PIN code",
    sections: [
      {
        heading: "India checkout and support",
        body: "India market checkout uses INR and Razorpay. Support contact for India is the India warehouse number, not the US warehouse line.",
      },
    ],
    faqs: [
      {
        q: "Do you deliver Indian spices in India?",
        a: "Choose India, enter your PIN code, and check whether a shipping quote is offered on the product. We do not promise Punjab warehouse fulfilment for every SKU.",
      },
    ],
  },
  {
    slug: "ae",
    countryCode: "AE",
    name: "United Arab Emirates",
    hreflang: "en-AE",
    locale: "en_AE",
    title: "spice Spices UAE | Dubai & Abu Dhabi Delivery",
    description:
      "Shop Indian spices online in the UAE, including Dubai and Abu Dhabi. Confirm delivery with your address details at checkout.",
    h1: "Indian spices online in the UAE",
    keywords: ["Indian spices UAE", "Indian spices Dubai", "Indian spices Abu Dhabi"],
    intro:
      "UAE shoppers can order spices and spice packs for Dubai, Abu Dhabi, and other emirates. Delivery depends on international fulfilment capacity — we never promise local stock we do not have.",
    fulfillment:
      "UAE orders currently ship from an international-capable warehouse with a realistic transit estimate at checkout.",
    postalLabel: "postal code",
    sections: [
      {
        heading: "Dubai and Abu Dhabi shopping notes",
        body: "Indoor events and hotel parties are common. Focus on spices, accessories, and compact decor that travel well. Confirm the shipping address in English at checkout.",
      },
    ],
    faqs: [
      {
        q: "Do you deliver Indian spices to Dubai or Abu Dhabi?",
        a: "Select United Arab Emirates, enter your postal or area details, and checkout will confirm whether we can deliver.",
      },
    ],
  },
  {
    slug: "de",
    countryCode: "DE",
    name: "Germany",
    hreflang: "de-DE",
    locale: "en_DE",
    title: "spice Spices Germany | Online Delivery",
    description:
      "Buy Indian spices online in Germany. SpicyCorner prefers UK/EU warehouse fulfilment when inventory allows.",
    h1: "Indian spices online in Germany",
    keywords: ["Indian spices Germany", "Indian spices online Germany"],
    intro:
      "German shoppers get a dedicated country page — not a generic Europe URL. Select Germany and enter your postcode, then confirm a product-page freight quote. We do not assume UK-warehouse stock for every item.",
    fulfillment: "Germany is a quoteable storefront destination. Use the product shipping panel rather than a local-warehouse promise.",
    postalLabel: "postcode",
    sections: [
      {
        heading: "Why this is not an EU doorway page",
        body: "We publish Germany-specific copy because fulfilment, language, and delivery expectations differ from France or Spain. Thin city pages are not generated.",
      },
    ],
    faqs: [
      {
        q: "Can I order Indian spices to Germany?",
        a: "Enter your postcode and check the product-page quote. A successful quote is the only confirmation that a method is available.",
      },
    ],
  },
  {
    slug: "fr",
    countryCode: "FR",
    name: "France",
    hreflang: "fr-FR",
    locale: "en_FR",
    title: "spice Spices France | Online Delivery",
    description:
      "Shop Indian spices online in France with postcode serviceability and UK-warehouse preference when stock allows.",
    h1: "Indian spices online in France",
    keywords: ["Indian spices France", "Indian spices online France"],
    intro:
      "spice is growing in France for parties and kids’ events. Choose France in the header so we do not treat Europe as a single country.",
    fulfillment: "France is in the UK warehouse European service area when that warehouse is active.",
    postalLabel: "code postal",
    sections: [
      {
        heading: "Delivery in France",
        body: "Enter a French postal code before checkout. If UK stock cannot cover the item, we show international shipping instead of hiding the product without explanation.",
      },
    ],
    faqs: [
      {
        q: "Livrez-vous des spices d’spice en France?",
        a: "Select France, enter your code postal, and we confirm warehouse eligibility before payment.",
      },
    ],
  },
  {
    slug: "es",
    countryCode: "ES",
    name: "Spain",
    hreflang: "es-ES",
    locale: "en_ES",
    title: "spice Spices Spain | Online Delivery",
    description:
      "Buy Indian spices online in Spain. Confirm your código postal for SpicyCorner European fulfilment.",
    h1: "Indian spices online in Spain",
    keywords: ["Indian spices Spain", "Indian spices online Spain"],
    intro:
      "Spain celebrates spice alongside All Saints’ traditions. This page is for Spanish delivery — not a duplicate of the UK or US homepage.",
    fulfillment: "Spain is served from the UK warehouse European service area when active.",
    postalLabel: "código postal",
    sections: [
      {
        heading: "Ordering for Spain",
        body: "Use the country selector, enter a código postal, and complete checkout only after serviceability is confirmed.",
      },
    ],
    faqs: [
      {
        q: "Do you ship Indian spices to Spain?",
        a: "Yes when the European service area includes your código postal. The header selector lets you scardamom away from an auto-detected country.",
      },
    ],
  },
  {
    slug: "it",
    countryCode: "IT",
    name: "Italy",
    hreflang: "it-IT",
    locale: "en_IT",
    title: "spice Spices Italy | Online Delivery",
    description:
      "Shop Indian spices online in Italy. Enter your CAP to check SpicyCorner European delivery.",
    h1: "Indian spices online in Italy",
    keywords: ["Indian spices Italy", "Indian spices online Italy"],
    intro:
      "Italian customers get country-specific fulfilment routing. Select Italy rather than a generic Europe option.",
    fulfillment: "Italy is included in the UK warehouse European service area.",
    postalLabel: "CAP",
    sections: [
      {
        heading: "Italian delivery",
        body: "Enter a CAP (postal code) to check serviceability. Checkout shipping address remains the source of truth for fulfilment.",
      },
    ],
    faqs: [
      {
        q: "Spedite costumi di spice in Italia?",
        a: "Sì, quando il magazzino UK copre il tuo CAP. Puoi cambiare paese dal selettore in testata.",
      },
    ],
  },
  {
    slug: "nl",
    countryCode: "NL",
    name: "Netherlands",
    hreflang: "nl-NL",
    locale: "en_NL",
    title: "spice Spices Netherlands | Online Delivery",
    description:
      "Buy Indian spices online in the Netherlands. Check your postcode for European warehouse fulfilment.",
    h1: "Indian spices online in the Netherlands",
    keywords: ["Indian spices Netherlands", "Indian spices online Netherlands"],
    intro:
      "We store NL as its own country code, not as “Europe”.",
    fulfillment: "The UK warehouse service area includes the Netherlands.",
    postalLabel: "postcode",
    sections: [
      {
        heading: "Netherlands delivery",
        body: "Enter a Dutch postcode in the header. If local/EU stock is unavailable, we disclose international shipping instead of blocking browsing.",
      },
    ],
    faqs: [
      {
        q: "Do you deliver Indian spices to the Netherlands?",
        a: "Yes when your postcode is serviceable. Change country any time — automatic detection is never a trap.",
      },
    ],
  },
  {
    slug: "ie",
    countryCode: "IE",
    name: "Ireland",
    hreflang: "en-IE",
    locale: "en_IE",
    title: "spice Spices Ireland | Online Delivery",
    description:
      "Shop Indian spices online in Ireland. SpicyCorner prefers UK warehouse fulfilment for Irish eircodes when stock allows.",
    h1: "Indian spices online in Ireland",
    keywords: ["Indian spices Ireland", "Indian spices online Ireland"],
    intro:
      "Ireland has deep spice roots. Select Ireland and enter your Eircode so we can prefer the Southampton warehouse.",
    fulfillment: "Ireland is in the UK warehouse service area.",
    postalLabel: "Eircode",
    sections: [
      {
        heading: "Ordering in Ireland",
        body: "Use an Eircode at checkout. Irish delivery is routed separately from US ZIP fulfilment.",
      },
    ],
    faqs: [
      {
        q: "Can I get Indian spices delivered in Ireland?",
        a: "Yes. Choose Ireland, enter your Eircode, and we assign the UK warehouse when it can fulfil the order.",
      },
    ],
  },
  {
    slug: "be",
    countryCode: "BE",
    name: "Belgium",
    hreflang: "nl-BE",
    locale: "en_BE",
    title: "spice Spices Belgium | Online Delivery",
    description:
      "Buy Indian spices online in Belgium. Confirm your postcode for SpicyCorner European fulfilment.",
    h1: "Indian spices online in Belgium",
    keywords: ["Indian spices Belgium", "Indian spices online Belgium"],
    intro:
      "Belgium is stored as BE, not as part of a fake EU country. Enter your postcode to check warehouse eligibility.",
    fulfillment: "Belgium is included in the UK warehouse European service area.",
    postalLabel: "postcode",
    sections: [
      {
        heading: "Belgian delivery",
        body: "Checkout uses the shipping address as the final fulfilment truth, even if geo-detection first guessed another country.",
      },
    ],
    faqs: [
      {
        q: "Do you ship Indian spices to Belgium?",
        a: "When the UK warehouse serves your postcode, yes. You can override auto-detected country in the header.",
      },
    ],
  },
];

export function storefrontCountrySeoPages(): CountrySeoPage[] {
  return countrySeoPages.filter((p) => isStorefrontDeliveryCountry(p.countryCode));
}

export function getCountrySeoPage(slug: string): CountrySeoPage | undefined {
  const page = countrySeoPages.find((p) => p.slug === slug);
  if (!page || !isStorefrontDeliveryCountry(page.countryCode)) return undefined;
  return page;
}

export function allCountrySeoSlugs(): string[] {
  return storefrontCountrySeoPages().map((p) => p.slug);
}
