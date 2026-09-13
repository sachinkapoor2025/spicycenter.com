import { isProductAvailableForCountry } from "./shipping-availability";

export type SeoLink = {
  href: string;
  label: string;
};

export type SeoLinkGroup = {
  heading: string;
  links: SeoLink[];
};

export type InternalLinkPage =
  | { type: "home" }
  | { type: "listing" }
  | { type: "category"; categorySlug: string }
  | {
      type: "product";
      categorySlug: string;
      productSlug: string;
      availableCountryCodes?: string[] | null;
    }
  | { type: "country"; countrySlug: string }
  | { type: "city"; citySlug: string }
  | { type: "guide" }
  | { type: "events" }
  | { type: "blog"; blogSlug: string; relatedCategory?: string }
  | { type: "shipping" };

export const SEO_CATEGORY_LINKS: readonly SeoLink[] = [
  { href: "/spices/whole-spices", label: "Whole spices" },
  { href: "/spices/ground-spices", label: "Ground spices" },
  { href: "/spices/indian-chillies", label: "Indian chillies" },
  { href: "/spices/indian-masalas", label: "Masalas" },
  { href: "/bulk-spices", label: "Bulk spices" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/spice-guide", label: "Spice guide" },
  { href: "/spice-market-prices", label: "Market prices" },
];

/** Countries we can quote CJ freight for — never market unquoted destinations as shippable. */
export const VERIFIED_COUNTRY_LINKS: readonly (SeoLink & { slug: string; code: string; name: string })[] = [
  { slug: "us", code: "US", href: "/countries/us", label: "spice in the USA", name: "United States" },
  { slug: "uk", code: "GB", href: "/countries/uk", label: "spice in the UK", name: "United Kingdom" },
  { slug: "ca", code: "CA", href: "/countries/ca", label: "spice in Canada", name: "Canada" },
  { slug: "au", code: "AU", href: "/countries/au", label: "spice in Australia", name: "Australia" },
  { slug: "de", code: "DE", href: "/countries/de", label: "spice in Germany", name: "Germany" },
];

/** High-value US metros/states already live at /cities/{slug}. */
export const PRIORITY_CITY_LINKS: readonly SeoLink[] = [
  { href: "/cities/new-york", label: "spice in New York" },
  { href: "/cities/los-angeles", label: "spice in Los Angeles" },
  { href: "/cities/chicago", label: "spice in Chicago" },
  { href: "/cities/houston", label: "spice in Houston" },
  { href: "/cities/miami", label: "spice in Miami" },
  { href: "/cities/dallas", label: "spice in Dallas" },
  { href: "/cities/seattle", label: "spice in Seattle" },
  { href: "/cities/boston", label: "spice in Boston" },
  { href: "/cities/california", label: "spice in California" },
  { href: "/cities/texas", label: "spice in Texas" },
];

export const PLANNING_LINKS: readonly SeoLink[] = [
  { href: "/spices", label: "spice by location" },
  { href: "/spice-guide", label: "spice planning guide" },
  { href: "/spice-guide/events", label: "spice events guide" },
  { href: "/blog", label: "spice blog" },
  { href: "/shipping", label: "Shipping & delivery" },
];

export const FEATURED_BLOG_LINKS: readonly SeoLink[] = [
  { href: "/blog/indian-spices-for-curry", label: "Indian spices for curry" },
  { href: "/blog/whole-spices-vs-ground-spices", label: "Whole vs ground spices" },
  { href: "/blog/buy-indian-spices-in-bulk-uk", label: "Bulk spices in the UK" },
];

const RELATED_CATEGORIES: Record<string, readonly string[]> = {
  "whole-spices": ["ground-spices", "indian-chillies"],
  "ground-spices": ["whole-spices", "indian-masalas"],
  "indian-chillies": ["indian-masalas", "whole-spices"],
  "indian-masalas": ["ground-spices", "indian-chillies"],
  "bulk-spices": ["whole-spices", "ground-spices"],
  seeds: ["whole-spices", "dried-herbs"],
};

const MAX_PER_GROUP = 8;

function pathFor(page: InternalLinkPage): string {
  switch (page.type) {
    case "home":
      return "/";
    case "listing":
      return "/products";
    case "category":
      return `/categories/${page.categorySlug}`;
    case "product":
      return `/products/${page.productSlug}`;
    case "country":
      return `/countries/${page.countrySlug}`;
    case "city":
      return `/cities/${page.citySlug}`;
    case "guide":
      return "/spice-guide";
    case "events":
      return "/spice-guide/events";
    case "blog":
      return `/blog/${page.blogSlug}`;
    case "shipping":
      return "/shipping";
  }
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return h;
}

export function pickStable<T>(items: readonly T[], seed: string, count: number): T[] {
  if (items.length === 0 || count <= 0) return [];
  const start = hashSeed(seed) % items.length;
  const out: T[] = [];
  const seen = new Set<T>();
  for (let i = 0; out.length < Math.min(count, items.length) && i < items.length * 2; i++) {
    const item = items[(start + i) % items.length];
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

function withoutPath(links: readonly SeoLink[], currentPath: string): SeoLink[] {
  return links.filter((l) => l.href !== currentPath);
}

function cap(links: readonly SeoLink[], n = MAX_PER_GROUP): SeoLink[] {
  const seen = new Set<string>();
  const out: SeoLink[] = [];
  for (const link of links) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    out.push(link);
    if (out.length >= n) break;
  }
  return out;
}

function group(heading: string, links: readonly SeoLink[], currentPath: string, n = MAX_PER_GROUP): SeoLinkGroup | null {
  const next = cap(withoutPath(links, currentPath), n);
  if (next.length === 0) return null;
  return { heading, links: next };
}

function relatedCategoryLinks(categorySlug: string): SeoLink[] {
  const related = RELATED_CATEGORIES[categorySlug] ?? [];
  const byHref = new Map(SEO_CATEGORY_LINKS.map((l) => [l.href, l]));
  return related
    .map((slug) => byHref.get(`/spices/${slug}`) ?? byHref.get(`/${slug}`))
    .filter((l): l is SeoLink => Boolean(l));
}

function countryLinksForProduct(availableCountryCodes?: string[] | null): SeoLink[] {
  return VERIFIED_COUNTRY_LINKS.filter((c) => {
    const status = isProductAvailableForCountry({ availableCountryCodes }, c.code);
    return status === "available" || status === "quoteable";
  }).map(({ href, label }) => ({ href, label }));
}

/**
 * Contextual internal links. Caps each group so pages do not become doorway blocks.
 * Location links never imply delivery unless the destination is quoteable.
 */
export function getInternalLinkGroups(page: InternalLinkPage): SeoLinkGroup[] {
  const current = pathFor(page);
  const groups: SeoLinkGroup[] = [];
  const push = (g: SeoLinkGroup | null) => {
    if (g) groups.push(g);
  };

  const shop = group("Shop spices", SEO_CATEGORY_LINKS, current, 6);
  const markets = group("Shop by country", VERIFIED_COUNTRY_LINKS, current, 5);
  const cities = group("Shop by city", PRIORITY_CITY_LINKS, current, 6);
  const planning = group("Guides", PLANNING_LINKS, current, 4);
  const articles = group("Popular articles", FEATURED_BLOG_LINKS, current, 4);

  switch (page.type) {
    case "home":
    case "listing":
      push(shop);
      push(markets);
      push(cities);
      push(planning);
      break;
    case "category": {
      push(group("Related categories", relatedCategoryLinks(page.categorySlug), current, 4));
      push(markets);
      push(group("spice near you", pickStable(PRIORITY_CITY_LINKS, page.categorySlug, 4), current, 4));
      push(planning);
      push(articles);
      break;
    }
    case "product": {
      const cat = SEO_CATEGORY_LINKS.find(
        (l) => l.href === `/spices/${page.categorySlug}` || l.href === `/${page.categorySlug}`
      );
      push(
        group(
          "This collection",
          [cat, ...relatedCategoryLinks(page.categorySlug)].filter((l): l is SeoLink => Boolean(l)),
          current,
          4
        )
      );
      push(group("Delivery destinations", countryLinksForProduct(page.availableCountryCodes), current, 4));
      push(group("spice near you", pickStable(PRIORITY_CITY_LINKS, page.productSlug, 4), current, 4));
      push(planning);
      break;
    }
    case "country": {
      push(shop);
      if (page.countrySlug === "us") push(cities);
      push(group("Other countries", VERIFIED_COUNTRY_LINKS, current, 4));
      push(planning);
      push(articles);
      break;
    }
    case "city": {
      push(group("United States", [{ href: "/countries/us", label: "spice in the USA" }], current, 1));
      push(shop);
      push(group("Nearby & popular cities", pickStable(PRIORITY_CITY_LINKS, page.citySlug, 5), current, 5));
      push(planning);
      break;
    }
    case "guide":
      push(shop);
      push(markets);
      push(cities);
      push(articles);
      push(group("More", [{ href: "/spice-guide/events", label: "spice events guide" }], current, 1));
      break;
    case "events":
      push(shop);
      push(cities);
      push(group("Guides", [{ href: "/spice-guide", label: "spice planning guide" }, ...FEATURED_BLOG_LINKS], current, 5));
      break;
    case "blog": {
      const related = page.relatedCategory
        ? SEO_CATEGORY_LINKS.filter(
            (l) =>
              l.href === `/spices/${page.relatedCategory}` || l.href === `/${page.relatedCategory}`
          )
        : [];
      push(group("Shop this topic", related, current, 2));
      push(shop);
      push(planning);
      push(articles);
      break;
    }
    case "shipping":
      push(markets);
      push(shop);
      push(planning);
      break;
  }

  return groups;
}
