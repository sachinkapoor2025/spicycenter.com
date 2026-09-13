import { z } from "zod";

export const blogImageMapSchema = z.record(z.string().min(1), z.string().url());

export const blogImageConfigSchema = z.object({
  images: blogImageMapSchema.default({}),
});

export type BlogImageMap = z.infer<typeof blogImageMapSchema>;
export type BlogImageConfig = z.infer<typeof blogImageConfigSchema>;
