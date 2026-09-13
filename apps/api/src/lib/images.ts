import { resolveProductImageUrl, resolveProductImageUrls } from "@spicycorner/shared";

export function withResolvedProductImages<T extends { images?: string[]; cjVariants?: Array<{ image?: string }> }>(
  item: T
): T {
  const images = item.images?.length ? resolveProductImageUrls(item.images) : item.images;
  const cjVariants = item.cjVariants?.map((variant) =>
    variant.image ? { ...variant, image: resolveProductImageUrl(variant.image) } : variant
  );
  return {
    ...item,
    ...(images ? { images } : {}),
    ...(cjVariants ? { cjVariants } : {}),
  };
}

export { resolveProductImageUrl, resolveProductImageUrls };
