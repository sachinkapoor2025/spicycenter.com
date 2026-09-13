import { z } from "zod";
import { VENDOR_ORANGE_COUNTY } from "../constants";
import { LEDGER_CURRENCIES, type LedgerCurrency } from "./expense";
import type { MoneyByCurrency } from "./payment-reconciliation";

/** Vendors we track payouts for (extend as new vendors onboard). */
export const VENDOR_PAYMENT_SLUGS = [VENDOR_ORANGE_COUNTY] as const;
export type VendorPaymentSlug = (typeof VENDOR_PAYMENT_SLUGS)[number];

export const VENDOR_PAYMENT_SLUG_LABELS: Record<VendorPaymentSlug, string> = {
  [VENDOR_ORANGE_COUNTY]: "Orange County",
};

export const VENDOR_PAYOUT_METHODS = [
  "bank_transfer",
  "wire",
  "zelle",
  "venmo",
  "upi",
  "cash",
  "other",
] as const;
export type VendorPayoutMethod = (typeof VENDOR_PAYOUT_METHODS)[number];

export const VENDOR_PAYOUT_METHOD_LABELS: Record<VendorPayoutMethod, string> = {
  bank_transfer: "Bank transfer",
  wire: "Wire",
  zelle: "Zelle",
  venmo: "Venmo",
  upi: "UPI",
  cash: "Cash",
  other: "Other",
};

export const createVendorPayoutSchema = z.object({
  vendorSlug: z.enum(VENDOR_PAYMENT_SLUGS).default(VENDOR_ORANGE_COUNTY),
  amount: z.number().positive(),
  currency: z.enum(LEDGER_CURRENCIES).default("USD"),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "paidDate must be YYYY-MM-DD"),
  paymentMethod: z.enum(VENDOR_PAYOUT_METHODS).default("bank_transfer"),
  /** Optional human order numbers / UUIDs this payment covers. */
  orderIds: z.array(z.string().min(1).max(80)).max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  reference: z.string().trim().max(120).optional(),
});

export const updateVendorPayoutSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.enum(LEDGER_CURRENCIES).optional(),
  paidDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "paidDate must be YYYY-MM-DD")
    .optional(),
  paymentMethod: z.enum(VENDOR_PAYOUT_METHODS).optional(),
  orderIds: z.array(z.string().min(1).max(80)).max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  reference: z.string().trim().max(120).optional(),
});

export type CreateVendorPayoutInput = z.infer<typeof createVendorPayoutSchema>;
export type UpdateVendorPayoutInput = z.infer<typeof updateVendorPayoutSchema>;

export type VendorPayoutEntry = {
  payoutId: string;
  vendorSlug: VendorPaymentSlug;
  amount: number;
  currency: LedgerCurrency;
  paidDate: string;
  paymentMethod: VendorPayoutMethod;
  orderIds?: string[];
  notes?: string;
  reference?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type VendorOrderLineSummary = {
  productSlug: string;
  name: string;
  quantity: number;
  /** Retail unit price (what we sold for). */
  sellUnitPrice: number;
  sellCurrency: LedgerCurrency;
  /** Wholesale unit cost we owe the vendor (USD for OC). */
  vendorUnitCost: number | null;
  vendorCostCurrency: LedgerCurrency;
  lineSellTotal: number;
  lineVendorCostTotal: number | null;
};

export type VendorOrderPaymentRow = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  /** Customer payment currency for the order. */
  currency: LedgerCurrency;
  paymentProvider?: string;
  trackingNumber?: string | null;
  recipientName?: string;
  items: VendorOrderLineSummary[];
  /**
   * Cart value for vendor share: merchandise + allocated shipping/tax/discount
   * (order.total × vendor merchandise share), in checkout currency.
   */
  sellTotalNative: number;
  /** Always USD (converted when checkout was INR). */
  sellTotalUsd: number;
  /** Checkout INR amount when currency is INR; else null. */
  sellTotalInr: number | null;
  /** Vendor merchandise only (no shipping), checkout currency. */
  productSellNative: number;
  /** Shipping (+ tax share) allocated to vendor lines, checkout currency. */
  shippingAllocatedNative: number;
  /** @deprecated Prefer sellTotalUsd — kept for older clients. */
  sellTotal: number;
  /** Sum of vendorCost × qty (USD). Null if any line missing cost. */
  vendorCostTotal: number | null;
  /** Amount from payouts allocated to this order (USD). */
  paidToVendor: number;
  /** max(0, vendorCostTotal - paidToVendor) when cost known. */
  pendingToVendor: number | null;
  /** sellTotalUsd − vendorCostTotal when cost known. */
  profitEstimate: number | null;
  countsTowardPayable: boolean;
};

export type VendorManagementSummary = {
  vendorSlug: VendorPaymentSlug;
  vendorLabel: string;
  /** Payable (paid→complete) vendor orders only. */
  orderCount: number;
  payableOrderCount: number;
  /** Total sold in USD (cart value, converted). */
  soldUsd: number;
  /** Sum of INR checkout amounts (hint only). */
  soldInr: number;
  /** @deprecated Prefer soldUsd */
  soldByCurrency: MoneyByCurrency;
  usdInrRate: number;
  /** Total we owe vendor for payable orders (USD). */
  vendorCostTotal: number;
  /** Total recorded payouts (USD). */
  paidToVendor: number;
  /** Unallocated portion of payouts (not tied to specific orders). */
  unallocatedPaid: number;
  /** vendorCostTotal - paidToVendor */
  pendingToVendor: number;
  /** soldUsd − vendorCostTotal */
  estimatedProfitUsd: number;
  byStatus: Record<string, number>;
};

export type VendorManagementDailyPoint = {
  date: string;
  sellUsd: number;
  vendorCostUsd: number;
  paidUsd: number;
  orderCount: number;
};

export type VendorManagementReport = {
  generatedAt: string;
  summary: VendorManagementSummary;
  orders: VendorOrderPaymentRow[];
  payouts: VendorPayoutEntry[];
  daily: VendorManagementDailyPoint[];
};
