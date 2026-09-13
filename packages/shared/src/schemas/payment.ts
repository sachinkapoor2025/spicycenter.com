import { z } from "zod";
import { PAYMENT_PROVIDERS, PAYMENT_REGIONS } from "../constants";

export const paymentConfigSchema = z.object({
  defaultRegion: z.enum([PAYMENT_REGIONS.US, PAYMENT_REGIONS.IN]),
  regions: z.object({
    US: z.object({
      provider: z.literal(PAYMENT_PROVIDERS.STRIPE),
      currency: z.literal("USD"),
      enabled: z.boolean().default(true),
    }),
    IN: z.object({
      provider: z.literal(PAYMENT_PROVIDERS.RAZORPAY),
      currency: z.literal("INR"),
      enabled: z.boolean().default(true),
    }),
  }),
});

export type PaymentConfig = z.infer<typeof paymentConfigSchema>;

export const defaultPaymentConfig: PaymentConfig = {
  defaultRegion: "US",
  regions: {
    US: { provider: "stripe", currency: "USD", enabled: true },
    IN: { provider: "razorpay", currency: "INR", enabled: true },
  },
};
