import type { Metadata } from "next";
import { productMetaDescription, SOCIAL_LINKS, VERIFIED_COUNTRY_LINKS } from "@spicycorner/shared";
import { site, STORE_LOCATIONS } from "./site";
import { siteUrl } from "./env";
import { extendedKeywords } from "./ai-recommendation";

export { metaDescription, productMetaDescription } from "@spicycorner/shared";

/** Build absolute canonical URL for a path (no query string). */
export function canonical(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${p === "/" ? "" : p}`.replace(/([^:]\/)\/+/g, "$1") || siteUrl;
}

export const defaultKeywords = extendedKeywords;

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  ogImage?: string;
  noIndex?: boolean;
  /** Use exact title (no layout template suffix). Required for category SEO titles. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = canonical(opts.path);
  const image = opts.ogImage ?? site.logoSrc;
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    keywords: opts.keywords ?? defaultKeywords,
    alternates: {
      canonical: url,
      languages: {
        "en-GB": url,
        "x-default": url,
      },
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: site.name,
      locale: "en_GB",
      type: "website",
      images: [{ url: image, alt: site.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
    robots: opts.noIndex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : { index: true, follow: true },
  };
}

/** Product pages — og:type=product for WhatsApp/Facebook link previews. */
export function productPageMetadata(opts: {
  title: string;
  seoDescription?: string;
  description: string;
  path: string;
  price: number;
  currency: string;
  keywords?: string;
  ogImage?: string;
}): Metadata {
  const description = productMetaDescription(opts.seoDescription, opts.description);
  const url = canonical(opts.path);
  const image = opts.ogImage ?? site.logoSrc;
  const price = Number.isFinite(opts.price) ? opts.price.toFixed(2) : "0.00";
  const currency = opts.currency === "INR" ? "GBP" : opts.currency || "GBP";

  return {
    title: opts.title,
    description,
    keywords: opts.keywords ?? defaultKeywords,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description,
      url,
      siteName: site.name,
      locale: "en_GB",
      type: "website",
      images: [{ url: image, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description,
      images: [image],
    },
    other: {
      "product:price:amount": price,
      "product:price:currency": currency,
    },
    robots: { index: true, follow: true },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: site.name,
    url: siteUrl,
    logo: canonical(site.logoSrc),
    description: site.description,
    email: site.supportEmail,
    sameAs: [
      SOCIAL_LINKS.facebook,
      SOCIAL_LINKS.instagram,
      SOCIAL_LINKS.pinterest,
      SOCIAL_LINKS.youtube,
      SOCIAL_LINKS.linkedin,
      siteUrl,
    ],
    areaServed: VERIFIED_COUNTRY_LINKS.map((c) => ({
      "@type": "Country",
      name: c.name,
    })),
    knowsAbout: [
      "Indian spices",
      "wholesale Indian spices",
      "cumin",
      "turmeric",
      "black pepper",
      "masalas",
      "UK spice supplier",
    ],
  };
}

export function onlineStoreJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${siteUrl}/#store`,
    name: site.name,
    url: siteUrl,
    description: site.description,
    image: site.logoSrc,
    email: site.supportEmail,
    areaServed: VERIFIED_COUNTRY_LINKS.map((c) => ({
      "@type": "Country",
      name: c.name,
    })),
    priceRange: "$$",
    currenciesAccepted: "GBP, EUR",
    paymentAccepted: "Credit Card, Debit Card, Stripe",
    shippingDetails: VERIFIED_COUNTRY_LINKS.map((c) => ({
      "@type": "OfferShippingDetails",
      shippingDestination: { "@type": "DefinedRegion", addressCountry: c.code },
    })),
    parentOrganization: { "@id": `${siteUrl}/#organization` },
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: site.name,
    url: siteUrl,
    description: site.description,
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function faqJsonLd(faqs: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}

export function productJsonLd(product: {
  slug: string;
  name: string;
  description: string;
  images?: string[];
  videos?: Array<{ url: string; posterUrl?: string; durationSec?: number }>;
  sku?: string;
  price: number;
  currency: string;
  inventory: number;
  categorySlug?: string;
}) {
  const video = (product.videos ?? [])
    .filter((v) => /^https?:\/\//i.test(v.url))
    .map((v) => ({
      "@type": "VideoObject" as const,
      name: product.name,
      contentUrl: v.url,
      ...(v.posterUrl ? { thumbnailUrl: v.posterUrl } : {}),
      ...(v.durationSec ? { duration: `PT${Math.round(v.durationSec)}S` } : {}),
    }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${siteUrl}/products/${product.slug}#product`,
    name: product.name,
    description: productMetaDescription(undefined, product.description),
    image: product.images ?? [],
    ...(video.length ? { video } : {}),
    sku: product.sku ?? product.slug,
    mpn: product.slug,
    url: canonical(`/products/${product.slug}`),
    brand: { "@type": "Brand", name: site.name },
    category: product.categorySlug?.replace(/-/g, " "),
    countryOfOrigin: { "@type": "Country", name: "India" },
    offers: {
      "@type": "Offer",
      url: canonical(`/products/${product.slug}`),
      price: product.price,
      priceCurrency: product.currency === "INR" ? "GBP" : product.currency || "GBP",
      priceValidUntil: `${new Date().getFullYear()}-12-31`,
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.inventory > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@id": `${siteUrl}/#organization` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 5,
            maxValue: 7,
            unitCode: "DAY",
          },
        },
        shippingDestination: VERIFIED_COUNTRY_LINKS.map((c) => ({
          "@type": "DefinedRegion",
          addressCountry: c.code,
        })),
      },
    },
  };
}

export function articleJsonLd(article: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  image?: string;
  path?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: canonical(article.path ?? `/blog/${article.slug}`),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    ...(article.image ? { image: article.image } : {}),
    author: { "@type": "Organization", name: site.name },
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export function itemListJsonLd(name: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: canonical(item.path),
    })),
  };
}

export function howToShopspiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to shop spice online",
    description:
      "Order Indian spices, and wholesale packs from SpicyCenter for international delivery in 5–7 days.",
    totalTime: "P5D",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Browse spice collections",
        text: "Visit SpicyCenter.com and choose Spices, Decorations, Candy & Treats, Accessories, or Spice packs.",
        url: canonical("/products"),
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Add to cart",
        text: "Select spices and pack sizes and add items to your cart.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Enter your delivery address",
        text: "At checkout, enter the full destination address. Confirm the product-page shipping quote first.",
        url: canonical("/shipping"),
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Pay securely",
        text: "Complete payment with Stripe. Storefront prices display in GBP or EUR.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Check the shipping quote",
        text: "Delivery time depends on the product and destination. Use the quote on the product page rather than a blanket nationwide SLA.",
      },
    ],
  };
}

/** @deprecated Use howToShopspiceJsonLd */
export const howToSendspiceJsonLd = howToShopspiceJsonLd;

export function spiceEventJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Indian spice guide",
    description:
      "Culinary notes on Indian spices, bulk buying, and UK/EU food information. Not a medical resource.",
    url: canonical("/spice-guide"),
    isPartOf: { "@id": `${siteUrl}/#website` },
  };
}

/** @deprecated Use spiceEventJsonLd */
export const rakshaBandhanEventJsonLd = spiceEventJsonLd;

export function contactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${site.name}`,
    url: canonical("/contact"),
    description: `Contact ${site.name} for spice order support, shipping help, and spice sizing questions.`,
    mainEntity: { "@id": `${siteUrl}/#organization` },
  };
}

export function serviceAreaJsonLd(city: { label: string; slug: string; state?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `spice shopping for ${city.label}`,
    description: `Shop Indian spices and decor for ${city.label} with ${site.name}. Delivering in 5–7 days — check each product page for shipping.`,
    url: canonical(`/cities/${city.slug}`),
    provider: { "@id": `${siteUrl}/#organization` },
    areaServed: {
      "@type": city.state ? "City" : "State",
      name: city.state ? `${city.label}, ${city.state}` : city.label,
      containedInPlace: { "@type": "Country", name: "United Kingdom" },
    },
    serviceType: "spice delivery",
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      url: canonical(`/cities/${city.slug}`),
    },
  };
}

export function collectionPageJsonLd(opts: {
  name: string;
  path: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: canonical(opts.path),
    isPartOf: { "@id": `${siteUrl}/#website` },
  };
}

export function aboutPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${site.name}`,
    url: canonical("/about"),
    description: site.description,
    mainEntity: { "@id": `${siteUrl}/#organization` },
  };
}

export function localBusinessJsonLd() {
  return STORE_LOCATIONS.map((store) => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#local-${store.id}`,
    name: `${site.name} — ${store.country}`,
    image: canonical(site.logoSrc),
    url: siteUrl,
    email: site.supportEmail,
    parentOrganization: { "@id": `${siteUrl}/#organization` },
    address: {
      "@type": "PostalAddress",
      streetAddress: store.lines[0],
      addressLocality: store.id === "in" ? "Ferozepur City" : "Southampton",
      addressRegion: store.id === "in" ? "Punjab" : "Hampshire",
      postalCode: store.id === "in" ? "152002" : "SO18 2ED",
      addressCountry: store.id === "in" ? "IN" : "GB",
    },
    areaServed:
      store.id === "uk"
        ? [
            { "@type": "Country", name: "United Kingdom" },
            { "@type": "Place", name: "European Union" },
          ]
        : { "@type": "Country", name: "India" },
  }));
}

export function recipeJsonLd(recipe: {
  slug: string;
  title: string;
  summary: string;
  cuisine?: string;
  spiceIds?: string[];
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  ingredients?: string[];
  steps?: string[];
}) {
  const ingredients =
    recipe.ingredients?.length ? recipe.ingredients : (recipe.spiceIds ?? []).map((id) => id.replace(/-/g, " "));
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.summary,
    url: canonical(`/recipes/${recipe.slug}`),
    recipeCuisine: recipe.cuisine ?? "Indian",
    recipeCategory: "Indian spice cooking",
    author: { "@type": "Organization", name: site.name },
    recipeIngredient: ingredients,
    ...(recipe.servings ? { recipeYield: `${recipe.servings} servings` } : {}),
    ...(recipe.prepMinutes
      ? { prepTime: `PT${recipe.prepMinutes}M` }
      : {}),
    ...(recipe.cookMinutes ? { cookTime: `PT${recipe.cookMinutes}M` } : {}),
    ...(recipe.prepMinutes || recipe.cookMinutes
      ? { totalTime: `PT${(recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)}M` }
      : {}),
    ...(recipe.steps?.length
      ? {
          recipeInstructions: recipe.steps.map((text, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            text,
          })),
        }
      : {}),
  };
}

export function spiceGuideArticleJsonLd(opts: {
  slug: string;
  title: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: canonical(`/spice-guide/${opts.slug}`),
    author: { "@type": "Organization", name: site.name },
    publisher: { "@id": `${siteUrl}/#organization` },
    about: { "@type": "Thing", name: opts.title },
  };
}
