export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  image: string;
  publishedAt: string;
  updatedAt: string;
  sections: { heading?: string; paragraphs: string[] }[];
  relatedCategory?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "indian-spices-for-curry",
    title: "Indian spices for curry",
    description: "Cumin, coriander, turmeric and chilli as a curry base — culinary guidance, not medical claims.",
    excerpt: "A practical spice list for everyday Indian curry, with retail and bulk pack notes.",
    publishedAt: "2026-09-13",
    updatedAt: "2026-09-13",
    image: "/logo.svg",
    relatedCategory: "ground-spices",
    sections: [
      {
        paragraphs: [
          "Most North Indian curry masalas start with cumin, coriander, turmeric and chilli. Whole spices go in the oil first; powders usually follow after onion or tomato.",
          "SpicyCorner sells the same spices in retail packs and from 10kg bulk. Indicative Indian market prices are not your checkout price.",
        ],
      },
    ],
  },
  {
    slug: "whole-spices-vs-ground-spices",
    title: "Whole spices vs ground spices",
    description: "When to buy whole cumin or coriander versus powder, including storage and aroma.",
    excerpt: "Whole spices keep aroma longer; powder is convenient. Buy the form that matches how you cook.",
    publishedAt: "2026-09-13",
    updatedAt: "2026-09-13",
    image: "/logo.svg",
    relatedCategory: "whole-spices",
    sections: [
      {
        paragraphs: [
          "Whole seeds and pods hold volatile oils longer than pre-ground powder. Grind what you need, or choose powder when you cook daily and will finish the pack quickly.",
          "This is culinary advice, not a health claim.",
        ],
      },
    ],
  },
  {
    slug: "buy-indian-spices-in-bulk-uk",
    title: "Buy Indian spices in bulk in the UK",
    description: "10kg minimum wholesale, configurable UK shipping, and food-information fields for distance selling.",
    excerpt: "How restaurants and grocers can order 10kg+ Indian spices for UK delivery.",
    publishedAt: "2026-09-13",
    updatedAt: "2026-09-13",
    image: "/logo.svg",
    relatedCategory: "bulk-spices",
    sections: [
      {
        paragraphs: [
          "Bulk orders start at 10kg. Request a wholesale quote when grade, origin or packaging will change the price.",
          "UK shipping is a configurable per-kg rule. Duty and VAT are separate unless a shipping rule says they are included.",
        ],
      },
    ],
  },
];
