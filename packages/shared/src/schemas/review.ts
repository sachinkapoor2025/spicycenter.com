import { z } from "zod";

/** Stored review attached to a product (self-hosted or imported from a widget). */
export const productReviewSchema = z.object({
  reviewId: z.string().min(1),
  productSlug: z.string().min(1),
  authorName: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().min(1).max(4000),
  source: z.enum(["site", "trustpilot", "judgeme", "yotpo", "import"]).default("site"),
  published: z.boolean().default(false),
  verifiedPurchase: z.boolean().optional(),
});

export type ProductReview = z.infer<typeof productReviewSchema> & {
  createdAt: string;
  updatedAt: string;
};

/** Aggregate denormalized on the product record for Product JSON-LD. */
export const productRatingAggregateSchema = z.object({
  ratingValue: z.number().min(1).max(5),
  reviewCount: z.number().int().min(0),
  bestRating: z.number().int().min(1).max(5).default(5),
  worstRating: z.number().int().min(1).max(5).default(1),
});

export type ProductRatingAggregate = z.infer<typeof productRatingAggregateSchema>;

export const createProductReviewSchema = productReviewSchema.omit({ reviewId: true });
export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>;
