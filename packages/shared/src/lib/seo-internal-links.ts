
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
/** Countries this storefront actually quotes — United Kingdom and listed Europe. */
export const VERIFIED_COUNTRY_LINKS: readonly (SeoLink & { slug: string; code: string; name: string })[] = [
  { slug: "uk", code: "GB", href: "/uk", label: "Indian spices UK", name: "United Kingdom" },
  { slug: "de", code: "DE", href: "/countries/de", label: "Indian spices Germany", name: "Germany" },
  { slug: "fr", code: "FR", href: "/countries/fr", label: "Indian spices France", name: "France" },
  { slug: "ie", code: "IE", href: "/countries/ie", label: "Indian spices Ireland", name: "Ireland" },
  { slug: "nl", code: "NL", href: "/countries/nl", label: "Indian spices Netherlands", name: "Netherlands" },
  { slug: "be", code: "BE", href: "/countries/be", label: "Indian spices Belgium", name: "Belgium" },
  { slug: "es", code: "ES", href: "/countries/es", label: "Indian spices Spain", name: "Spain" },
  { slug: "it", code: "IT", href: "/countries/it", label: "Indian spices Italy", name: "Italy" },
];

/** High-value US metros/states already live at /cities/{slug}. */
export const PRIORITY_CITY_LINKS: readonly SeoLink[] = [
  { href: "/uk", label: "Indian spices for the UK" },
  { href: "/eu", label: "Indian spices for Europe" },
  { href: "/wholesale", label: "Wholesale Indian spices" },
  { href: "/spice-supplier", label: "Indian spice supplier" },
];

export const PLANNING_LINKS: readonly SeoLink[] = [
  { href: "/spices", label: "Shop Indian spices" },
  { href: "/spice-guide", label: "Indian spice encyclopaedia" },
  { href: "/recipes", label: "Spice recipes" },
  { href: "/blog", label: "Spice notes" },
  { href: "/legal/shipping", label: "Shipping & delivery" },
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

/** In-content / related-page SEO links per URL (nav, breadcrumbs and listing grids excluded). */
export const PAGE_MAX_INTERNAL_LINKS = 3;

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

/** Unique href + unique anchor text, capped at PAGE_MAX_INTERNAL_LINKS. */
export function flattenInternalLinks(groups: readonly SeoLinkGroup[], currentPath = ""): SeoLink[] {
  const seenHref = new Set<string>();
  const seenLabel = new Set<string>();
  const out: SeoLink[] = [];
  for (const g of groups) {
    for (const link of g.links) {
      if (!link.href || link.href === currentPath) continue;
      const labelKey = link.label.trim().toLowerCase();
      if (!labelKey || seenHref.has(link.href) || seenLabel.has(labelKey)) continue;
      seenHref.add(link.href);
      seenLabel.add(labelKey);
      out.push({ href: link.href, label: link.label.trim() });
      if (out.length >= PAGE_MAX_INTERNAL_LINKS) return out;
    }
  }
  return out;
}

function relatedOnly(links: readonly SeoLink[], currentPath: string): SeoLinkGroup[] {
  const next = flattenInternalLinks([{ heading: "Related pages", links: [...links] }], currentPath);
  return next.length ? [{ heading: "Related pages", links: next }] : [];
}

function relatedCategoryLinks(categorySlug: string): SeoLink[] {
  const related = RELATED_CATEGORIES[categorySlug] ?? [];
  const byHref = new Map(SEO_CATEGORY_LINKS.map((l) => [l.href, l]));
  return related
    .map((slug) => byHref.get(`/spices/${slug}`) ?? byHref.get(`/${slug}`))
    .filter((l): l is SeoLink => Boolean(l));
}

/**
 * Contextual internal links. At most PAGE_MAX_INTERNAL_LINKS unique anchors per page.
 * Location links never imply delivery unless the destination is quoteable.
 */
export function getInternalLinkGroups(page: InternalLinkPage): SeoLinkGroup[] {
  const current = pathFor(page);
  const cat = page.type === "category" || page.type === "product"
    ? SEO_CATEGORY_LINKS.find(
        (l) =>
          l.href === `/spices/${page.categorySlug}` || l.href === `/${page.categorySlug}`
      )
    : undefined;

  switch (page.type) {
    case "home":
    case "listing":
      return relatedOnly(
        [
          { href: "/spices", label: "Indian spice catalogue" },
          { href: "/spice-guide", label: "Indian spice guide" },
          { href: "/wholesale", label: "wholesale Indian spices" },
        ],
        current
      );
    case "category":
      return relatedOnly(
        [
          ...relatedCategoryLinks(page.categorySlug),
          { href: "/spice-guide", label: "Indian spice guide" },
          { href: "/uk", label: "Indian spices UK" },
        ],
        current
      );
    case "product":
      return relatedOnly(
        [
          cat ?? { href: "/spices", label: "Indian spice catalogue" },
          { href: "/spice-guide", label: "Indian spice guide" },
          { href: "/enquiry", label: "free spice enquiry" },
        ],
        current
      );
    case "country":
      return relatedOnly(
        [
          { href: "/spices", label: "Indian spice catalogue" },
          { href: "/wholesale", label: "wholesale Indian spices" },
          { href: "/spice-guide", label: "Indian spice guide" },
        ],
        current
      );
    case "city":
      return relatedOnly(
        [
          { href: "/uk", label: "Indian spices UK" },
          { href: "/spices", label: "Indian spice catalogue" },
          { href: "/spice-guide", label: "Indian spice guide" },
        ],
        current
      );
    case "guide":
      return relatedOnly(
        [
          { href: "/spices", label: "Indian spice catalogue" },
          { href: "/recipes", label: "Indian spice recipes" },
          { href: "/wholesale", label: "wholesale Indian spices" },
        ],
        current
      );
    case "events":
      return relatedOnly(
        [
          { href: "/spice-guide", label: "Indian spice guide" },
          { href: "/spices", label: "Indian spice catalogue" },
          { href: "/uk", label: "Indian spices UK" },
        ],
        current
      );
    case "blog": {
      const related = page.relatedCategory
        ? SEO_CATEGORY_LINKS.filter(
            (l) =>
              l.href === `/spices/${page.relatedCategory}` || l.href === `/${page.relatedCategory}`
          )
        : [];
      return relatedOnly(
        [
          ...related,
          { href: "/spice-guide", label: "Indian spice guide" },
          { href: "/recipes", label: "Indian spice recipes" },
          { href: "/spices", label: "Indian spice catalogue" },
        ],
        current
      );
    }
    case "shipping":
      return relatedOnly(
        [
          { href: "/uk", label: "Indian spices UK" },
          { href: "/spices", label: "Indian spice catalogue" },
          { href: "/enquiry", label: "free spice enquiry" },
        ],
        current
      );
  }
}
