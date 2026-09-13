import type { LedgerCurrency } from "./expense";

export type MoneyByCurrency = Record<LedgerCurrency, number>;

export type PaymentReconciliationSnapshot = {
  generatedAt: string;
  /** Sum of paid (non-refunded) order totals — source of truth. */
  expectedPayments: MoneyByCurrency;
  /** Manually recorded settlement net amounts. */
  recordedSettlements: MoneyByCurrency;
  /** Sum of optional gatewayFee on settlements (0 when not recorded). */
  gatewayCharges: MoneyByCurrency;
  /** Same as recordedSettlements (net credited). */
  netAmountReceived: MoneyByCurrency;
  /** expected − recorded settlements. */
  pendingSettlements: MoneyByCurrency;
  /** Expected revenue by payment provider (paid orders). */
  byProvider: {
    stripe: MoneyByCurrency;
    razorpay: MoneyByCurrency;
    other: MoneyByCurrency;
  };
  /** Recorded settlement nets by ledger paymentSource. */
  settlementsBySource: {
    stripe: MoneyByCurrency;
    razorpay: MoneyByCurrency;
    other: MoneyByCurrency;
  };
  overallExpected: MoneyByCurrency;
  orderCounts: {
    revenue: number;
    refundedExcluded: number;
    pendingExcluded: number;
    cancelledExcluded: number;
  };
  settlementCount: number;
};
