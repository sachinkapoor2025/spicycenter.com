import type { Product, SpiceEntity } from "@spicycorner/shared";
import { displayArabicName } from "@/lib/arabic-spice-names";
import { spiceStockImagePath } from "@/lib/spice-stock-images";

const PREFERRED_SLUGS = ["cumin", "turmeric", "black-pepper", "green-cardamom", "saffron"] as const;

export type FeaturedHomepageSpice = {
  slug: string;
  englishName: string;
  arabicName: string;
  description: string;
  image: string;
  href: string;
};

function productForSpice(products: Product[], spiceId: string): Product | undefined {
  const tagged = products.filter((p) => p.tags?.includes(`spice:${spiceId}`) || p.slug.includes(spiceId));
  return tagged.find((p) => p.tags?.includes("channel:retail")) ?? tagged[0];
}

export function featuredHomepageSpices(spices: SpiceEntity[], products: Product[], limit = 5): FeaturedHomepageSpice[] {
  const bySlug = new Map(spices.map((s) => [s.slug, s]));
  const picked: SpiceEntity[] = [];
  for (const slug of PREFERRED_SLUGS) {
    const spice = bySlug.get(slug);
    if (spice) picked.push(spice);
  }
  for (const spice of spices) {
    if (picked.length >= limit) break;
    if ((spice.featured || spice.featuredKnowledge) && !picked.some((s) => s.slug === spice.slug)) {
      picked.push(spice);
    }
  }
  return picked.slice(0, limit).map((spice) => {
    const product = productForSpice(products, spice.id || spice.slug);
    const image = product?.images?.[0] || spiceStockImagePath(`${spice.slug} ${spice.canonicalName}`);
    return {
      slug: spice.slug,
      englishName: spice.canonicalName,
      arabicName: displayArabicName(spice.slug),
      description: spice.shortDescription,
      image,
      href: product ? `/products/${product.slug}` : `/spice-guide/${spice.slug}`,
    };
  });
}
