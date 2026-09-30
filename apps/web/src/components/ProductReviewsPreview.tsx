import { ApprovedReviewList } from "@/components/ApprovedReviewList";

/** Customer reviews — published records only. */
export function ProductReviewsPreview({
  productSlug,
  productName,
}: {
  productSlug?: string;
  productName?: string;
} = {}) {
  return <ApprovedReviewList productSlug={productSlug} productName={productName} />;
}
