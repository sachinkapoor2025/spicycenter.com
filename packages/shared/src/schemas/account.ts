import { z } from "zod";
import { shippingAddressSchema } from "./order";

export const accountAddressSchema = shippingAddressSchema.extend({
  id: z.string(),
  label: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const accountProfileSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  preferredPaymentMethod: z.enum(["stripe", "razorpay"]).optional(),
});

export const accountProfileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(30).optional(),
  preferredPaymentMethod: z.enum(["stripe", "razorpay"]).optional(),
});

export const accountAddressInputSchema = shippingAddressSchema.extend({
  label: z.string().max(80).optional(),
  isDefault: z.boolean().optional(),
});

export const accountAddressUpdateSchema = accountAddressInputSchema.partial().extend({
  label: z.string().max(80).optional(),
  isDefault: z.boolean().optional(),
});

export type AccountAddress = z.infer<typeof accountAddressSchema>;
export type AccountProfile = z.infer<typeof accountProfileSchema> & {
  createdAt: string;
  updatedAt: string;
};
