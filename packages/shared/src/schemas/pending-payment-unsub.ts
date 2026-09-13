import { z } from "zod";

export const pendingPaymentUnsubscribeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export type PendingPaymentUnsubscribeInput = z.infer<typeof pendingPaymentUnsubscribeSchema>;

export type PendingPaymentUnsubRecord = {
  email: string;
  unsubscribedAt: string;
  source: "payment_reminder";
};
