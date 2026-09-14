import { exploreCategories, regionLinks } from "@/lib/site";

export type ExploreMoreLink = {
  label: string;
  href: string;
};

export type ExploreMoreGroup = {
  heading: string;
  links: ExploreMoreLink[];
};

const REGION_LINKS: ExploreMoreLink[] = regionLinks.map((c) => ({
  label: c.label,
  href: `/indian-spice-regions/${c.slug}`,
}));

/** Explore More link groups for SpicyCenter product pages. */
export const EXPLORE_MORE_GROUPS: ExploreMoreGroup[] = [
  {
    heading: "Indian spice regions",
    links: REGION_LINKS,
  },
  {
    heading: "Shop by Category",
    links: exploreCategories.map((c) => ({ label: c.name, href: c.href })),
  },
  {
    heading: "Planning",
    links: [
      { label: "Spice guide", href: "/spice-guide" },
      { label: "All Products", href: "/products" },
      { label: "Blog", href: "/blog" },
      { label: "Shipping", href: "/shipping" },
    ],
  },
];
