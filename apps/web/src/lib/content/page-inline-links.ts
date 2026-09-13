/** Phrase → URL maps for SEO internal linking. */

export type InlineLink = { phrase: string; href: string };

const SPICE_LINKS: readonly InlineLink[] = [
  { phrase: "whole spices", href: "/spices/whole-spices" },
  { phrase: "ground spices", href: "/spices/ground-spices" },
  { phrase: "Indian chillies", href: "/spices/indian-chillies" },
  { phrase: "masalas", href: "/spices/indian-masalas" },
  { phrase: "wholesale", href: "/wholesale" },
  { phrase: "spice guide", href: "/spice-guide" },
];

export const homepageInlineLinks: readonly InlineLink[] = SPICE_LINKS;

export const countryPageInlineLinks: Record<string, readonly InlineLink[]> = {
  us: SPICE_LINKS,
  uk: SPICE_LINKS,
  ca: SPICE_LINKS,
  au: SPICE_LINKS,
  de: SPICE_LINKS,
};

export const spiceGuideInlineLinks: readonly InlineLink[] = SPICE_LINKS;

export const categoryPageInlineLinks: Record<string, readonly InlineLink[]> = {
  "whole-spices": SPICE_LINKS,
  "ground-spices": SPICE_LINKS,
  "indian-chillies": SPICE_LINKS,
  "indian-masalas": SPICE_LINKS,
  "bulk-spices": SPICE_LINKS,
};

export const blogPostInlineLinks: Record<string, readonly InlineLink[]> = {
  "indian-spices-for-curry": SPICE_LINKS,
  "whole-spices-vs-ground-spices": SPICE_LINKS,
  "buy-indian-spices-in-bulk-uk": SPICE_LINKS,
};
