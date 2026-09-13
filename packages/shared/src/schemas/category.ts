import { z } from "zod";

export const categorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  image: z.string().url().optional(),
  parentSlug: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});

export const createCategorySchema = categorySchema.omit({ slug: true });

export const updateCategorySchema = categorySchema.partial().omit({ slug: true });

export type Category = z.infer<typeof categorySchema> & {
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
