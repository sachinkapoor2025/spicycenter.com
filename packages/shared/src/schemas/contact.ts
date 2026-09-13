import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  phone: z.string().min(6).max(30).optional(),
  message: z.string().min(1).max(5000),
  sessionId: z.string().max(64).optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
