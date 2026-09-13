import { z } from "zod";
import { LEDGER_CURRENCIES, type LedgerCurrency } from "./expense";

export const PAYMENT_LEDGER_SOURCES = ["stripe", "razorpay", "other"] as const;

export type PaymentLedgerSource = (typeof PAYMENT_LEDGER_SOURCES)[number];

export const PAYMENT_LEDGER_SOURCE_LABELS: Record<PaymentLedgerSource, string> = {
  stripe: "Stripe",
  razorpay: "Razorpay",
  other: "Other",
};

/** Currency implied by payment source (Stripe→USD, Razorpay→INR). */
export function currencyForPaymentSource(
  source: PaymentLedgerSource,
  fallback: LedgerCurrency = "USD"
): LedgerCurrency {
  if (source === "stripe") return "USD";
  if (source === "razorpay") return "INR";
  return fallback;
}

export const createPaymentLedgerSchema = z
  .object({
    /** Net amount credited by the gateway (after fees), when known. */
    amount: z.number().positive(),
    /** Optional; overridden from paymentSource for stripe/razorpay. */
    currency: z.enum(LEDGER_CURRENCIES).optional(),
    receivedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "receivedDate must be YYYY-MM-DD"),
    paymentSource: z.enum(PAYMENT_LEDGER_SOURCES),
    /** Optional gateway fee deducted for this settlement (when known from payout). */
    gatewayFee: z.number().nonnegative().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .transform((data) => ({
    ...data,
    currency: currencyForPaymentSource(data.paymentSource, data.currency ?? "USD"),
  }));

export const updatePaymentLedgerSchema = z
  .object({
    amount: z.number().positive().optional(),
    currency: z.enum(LEDGER_CURRENCIES).optional(),
    receivedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "receivedDate must be YYYY-MM-DD")
      .optional(),
    paymentSource: z.enum(PAYMENT_LEDGER_SOURCES).optional(),
    gatewayFee: z.number().nonnegative().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .transform((data) => {
    if (!data.paymentSource) return data;
    return {
      ...data,
      currency: currencyForPaymentSource(data.paymentSource, data.currency ?? "USD"),
    };
  });

export type CreatePaymentLedgerInput = z.infer<typeof createPaymentLedgerSchema>;
export type UpdatePaymentLedgerInput = z.infer<typeof updatePaymentLedgerSchema>;

export type PaymentLedgerEntry = {
  paymentId: string;
  amount: number;
  currency: LedgerCurrency;
  receivedDate: string;
  paymentSource: PaymentLedgerSource;
  gatewayFee?: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

/** One row from a Stripe/Razorpay settlement export (client-parsed). */
export const bulkPaymentLedgerRowSchema = z.object({
  amount: z.number().positive(),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "receivedDate must be YYYY-MM-DD"),
  gatewayFee: z.number().nonnegative().optional(),
  notes: z.string().trim().max(2000).optional(),
  /** 1-based spreadsheet row for error reporting. */
  rowNumber: z.number().int().positive().optional(),
});

export const bulkCreatePaymentLedgerSchema = z.object({
  paymentSource: z.enum(PAYMENT_LEDGER_SOURCES),
  rows: z.array(bulkPaymentLedgerRowSchema).min(1).max(500),
});

export type BulkPaymentLedgerRow = z.infer<typeof bulkPaymentLedgerRowSchema>;
export type BulkCreatePaymentLedgerInput = z.infer<typeof bulkCreatePaymentLedgerSchema>;

/** Duplicate key: same calendar date + amount (+ currency). */
export function paymentLedgerDuplicateKey(
  receivedDate: string,
  amount: number,
  currency: LedgerCurrency
): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${receivedDate}|${currency}|${rounded.toFixed(2)}`;
}
