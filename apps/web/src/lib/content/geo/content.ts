import { isQuoteableStorefrontCountry } from "@spicycorner/shared";
import { ADMIN_KIND_LABEL, type GeoLocation } from "./types";
import { getGeoChildren, getGeoCountry, getGeoParent, getGeoSiblings } from "./catalog";

export type LocationFaq = { q: string; a: string };

export type LocationPageContent = {
  title: string;
  description: string;
  h1: string;
  keywords: string;
  intro: string;
  hierarchyNote: string;
  spiceContext: string;
  shipping: string;
  planning: string;
  childHeading: string | null;
  siblingHeading: string | null;
  faqs: LocationFaq[];
  quoteable: boolean;
};

const COUNTRY_CONTEXT: Record<
  string,
  { spice: string; planning: string }
> = {
  IN: {
    spice:
      "India is the origin market for the spices we sell. Pages for Indian cities describe growing regions and culinary use, not a festival calendar.",
    planning:
      "Use this page to browse Indian spices. Confirm whether a product can be quoted to an Indian address before you treat it as deliverable.",
  },
  US: {
    spice:
      "This page is for buying Indian spices for a US address when a product quote exists. It is a catalog hub, not a local events calendar.",
    planning:
      "Open a product page to request a shipping quote for a US ZIP code. Transit varies by item.",
  },
  GB: {
    spice:
      "The United Kingdom is SpicyCenter’s primary destination market for Indian spices. England, Scotland, Wales, and Northern Ireland are constituent countries, not US-style states.",
    planning:
      "UK shipping is a configurable per-kilogram rate. Confirm the quote on the product page. Duty and VAT are separate unless a shipping rule includes them.",
  },
  CA: {
    spice:
      "Canadian shoppers can browse Indian spices when a product supports a Canadian quote. Provinces and territories are not interchangeable.",
    planning:
      "Product pages can request a shipping quote for a Canadian destination when the item supports it.",
  },
  AU: {
    spice:
      "Australian shoppers can browse Indian spices when a product supports an Australian quote.",
    planning:
      "Product pages can request a shipping quote for an Australian address when the item supports it.",
  },
  JP: {
    spice:
      "This is a shopping page for Indian spices. We do not sell event tickets.",
    planning:
      "Live storefront freight quotes may not be offered for Japan; confirm destination support on the product page before checkout.",
  },
  HK: {
    spice:
      "Hong Kong is not divided into states. Districts below sit under Hong Kong in this URL tree.",
    planning:
      "Confirm shipping on each product before checkout.",
  },
  AE: {
    spice:
      "The UAE is seven emirates. Dubai is an emirate, not a country.",
    planning:
      "Confirm destination support on the product page before checkout.",
  },
  DE: {
    spice:
      "Germany is organised as 16 Länder (federal states). EU food-information rules apply when EU checkout is enabled.",
    planning:
      "Product pages can request a shipping quote for Germany when the item supports it.",
  },
};

const DEFAULT_CONTEXT = {
  spice:
    "SpicyCenter sells Indian spices for cooking — whole spices, powders, chillies, masalas, and 10kg+ wholesale. This is not a medical or festival site.",
  planning:
    "This page exists so shoppers can browse by geography. Shipping is confirmed per product — we do not assume every SKU reaches every country listed in this directory.",
};

function placeLabel(loc: GeoLocation): string {
  const country = getGeoCountry(loc);
  if (loc.kind === "country") return loc.name;
  if (loc.kind === "city") {
    const parent = getGeoParent(loc);
    return parent ? `${loc.name}, ${parent.name}` : `${loc.name}, ${country.name}`;
  }
  return `${loc.name}, ${country.name}`;
}

function kindPhrase(loc: GeoLocation): string {
  if (loc.kind === "country") return `${loc.name} is listed as a country in the SpicyCenter location directory.`;
  const country = getGeoCountry(loc);
  const parent = getGeoParent(loc);
  const label = ADMIN_KIND_LABEL[loc.adminKind];
  if (parent && parent.kind !== "country") {
    return `${loc.name} is classified as a ${label} in ${parent.name}, ${country.name} — not as a country and not as a generic “state.”`;
  }
  return `${loc.name} is classified as a ${label} of ${country.name} — not as a country and not forced into a US-style state label.`;
}

function shippingCopy(loc: GeoLocation, quoteable: boolean): string {
  const country = getGeoCountry(loc);
  if (quoteable) {
    return `SpicyCenter can request a live shipping quote on product pages for destinations in ${country.name} (${loc.isoCountry}). Quotes are per item, not a blanket nationwide SLA. Catalog goods are fulfilled through international dropshipping partners — we do not claim a local warehouse in ${loc.name}.`;
  }
  return `SpicyCenter does not currently publish a live storefront freight quote for ${country.name} (${loc.isoCountry}). This is a shopping and planning page for spice ${loc.name}. Confirm destination support on the product page before checkout, and do not assume every SKU ships here.`;
}

function titleFor(loc: GeoLocation): string {
  if (loc.kind === "country") return `spice ${loc.name} | Spices, Decor & Spice packs`;
  if (loc.kind === "city") return `spice ${loc.name} | Shop Spices & Decor`;
  return `spice ${loc.name} | ${ADMIN_KIND_LABEL[loc.adminKind]} in ${getGeoCountry(loc).name}`;
}

function h1For(loc: GeoLocation): string {
  if (loc.kind === "country") return `spice in ${loc.name}`;
  if (loc.kind === "city") return `spice in ${loc.name}`;
  return `spice in ${loc.name}`;
}

function descriptionFor(loc: GeoLocation, quoteable: boolean): string {
  const place = placeLabel(loc);
  const kind = ADMIN_KIND_LABEL[loc.adminKind];
  if (quoteable) {
    return `Shop Indian spices, and wholesale packs for ${place}. ${loc.name} is a ${kind} in our location directory. Check the product shipping quote before you order.`;
  }
  return `spice shopping and planning for ${place}. ${loc.name} is listed as a ${kind}. Live freight quotes are not published for this destination — confirm shipping on each product.`;
}

export function buildLocationContent(loc: GeoLocation): LocationPageContent {
  const country = getGeoCountry(loc);
  const parent = getGeoParent(loc);
  const children = getGeoChildren(loc.id);
  const siblings = getGeoSiblings(loc).filter((s) => s.kind === loc.kind || s.adminKind === loc.adminKind);
  const quoteable = isQuoteableStorefrontCountry(loc.isoCountry);
  const ctx = COUNTRY_CONTEXT[loc.isoCountry] ?? DEFAULT_CONTEXT;
  const place = placeLabel(loc);

  const childHeading =
    children.length === 0
      ? null
      : loc.kind === "country"
        ? `Places in ${loc.name}`
        : `Places in ${loc.name}`;

  const siblingHeading =
    loc.kind === "country" || siblings.length === 0
      ? null
      : parent
        ? `Other ${ADMIN_KIND_LABEL[loc.adminKind]} pages in ${parent.name}`
        : `Related ${ADMIN_KIND_LABEL[loc.adminKind]} pages`;

  const hemisphereNote =
    loc.hemisphere === "south"
      ? " This location is in the Southern Hemisphere."
      : "";

  const intro = [
    `Shop Indian spices with a dedicated page for ${place}.`,
    kindPhrase(loc),
    loc.kind === "country"
      ? `${children.length} administrative and city pages sit under spice ${loc.name} in this directory.`
      : parent
        ? `This page sits under spice ${parent.name} in the ${country.name} location tree.`
        : "",
    hemisphereNote.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const faqs: LocationFaq[] = [
    {
      q: `Do you ship spice orders to ${loc.name}?`,
      a: quoteable
        ? `We can request a shipping quote on product pages for ${country.name}. Availability is per SKU and destination — this page does not mean every product ships to ${loc.name}.`
        : `We do not currently publish a live freight quote for ${country.name}. Use this page to plan a spice shop, then confirm destination support on the product page before checkout.`,
    },
    {
      q: `What kind of place is ${loc.name} in this directory?`,
      a: kindPhrase(loc),
    },
    {
      q: `Is spice a public holiday in ${country.name}?`,
      a: ctx.spice,
    },
    {
      q: `Are these local event or ticket pages?`,
      a: `No. SpicyCenter sells spices, and wholesale packs. We do not sell event tickets and we do not invent local event listings for ${loc.name}.`,
    },
  ];

  if (loc.adminKind === "emirate" || country.slug === "uae") {
    faqs.push({
      q: "Is Dubai a country on this site?",
      a: "No. Dubai is an emirate of the United Arab Emirates. The country page is spice UAE; Dubai, Abu Dhabi, and Sharjah sit underneath it.",
    });
  }

  return {
    title: titleFor(loc),
    description: descriptionFor(loc, quoteable),
    h1: h1For(loc),
    keywords: [
      `spice ${loc.name}`,
      `spice ${country.name}`,
      `Indian spices ${loc.name}`,
      `Indian spices ${loc.name}`,
    ].join(", "),
    intro,
    hierarchyNote: kindPhrase(loc),
    spiceContext: ctx.spice,
    shipping: shippingCopy(loc, quoteable),
    planning: ctx.planning,
    childHeading,
    siblingHeading,
    faqs,
    quoteable,
  };
}

export function locationBreadcrumbs(loc: GeoLocation): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [
    { label: "Home", href: "/" },
    { label: "spice", href: "/spices" },
  ];
  const chain: GeoLocation[] = [];
  let cur: GeoLocation | undefined = loc;
  while (cur) {
    chain.unshift(cur);
    cur = getGeoParent(cur);
  }
  for (let i = 0; i < chain.length; i++) {
    const node = chain[i];
    crumbs.push(i === chain.length - 1 ? { label: node.name } : { label: node.name, href: node.path });
  }
  return crumbs;
}

export function schemaPlaceType(loc: GeoLocation): string {
  if (loc.kind === "country") return "Country";
  if (loc.kind === "city") return loc.adminKind === "area" ? "Place" : "City";
  if (loc.adminKind === "constituent_country") return "Country";
  return "AdministrativeArea";
}
