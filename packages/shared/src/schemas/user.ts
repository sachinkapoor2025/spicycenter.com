import { z } from "zod";
import { USER_ROLES } from "../constants";

export const userProfileSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum([USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]).default(USER_ROLES.CUSTOMER),
});

export type UserProfile = z.infer<typeof userProfileSchema> & {
  createdAt: string;
  updatedAt: string;
};
