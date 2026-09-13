/**
 * Payment reconciliation — expected (paid orders) vs recorded settlements.
 * Invoked via GET /admin/payment-reconciliation (super admin) or scheduled cron.
 */
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  ORDER_STATUS,
  orderKeys,
  paymentLedgerKeys,
  isRevenueOrder,
  type Order,
  type PaymentLedgerEntry,
  type PaymentReconciliationSnapshot,
  type MoneyByCurrency,
  type LedgerCurrency,
} from "@spicycorner/shared";
import { requireSuperAdmin } from "../lib/auth";
import { docClient, ORDERS_TABLE, CONFIG_TABLE, now } from "../lib/db";
import { ok, forbidden } from "../lib/response";

type StoredOrder = Order & { PK: string; SK: string };
type StoredPayment = PaymentLedgerEntry & { PK: string; SK: string };

function emptyMoney(): MoneyByCurrency {
  return { USD: 0, INR: 0 };
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function addMoney(target: MoneyByCurrency, currency: LedgerCurrency, amount: number) {
  target[currency] = roundMoney(target[currency] + amount);
}

async function fetchAllOrdersNewestFirst(maxPages = 200): Promise<StoredOrder[]> {
  const items: StoredOrder[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  let pages = 0;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
        ScanIndexForward: false,
        ExclusiveStartKey,
        Limit: 100,
      })
    );
    items.push(...((res.Items ?? []) as StoredOrder[]));
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    pages += 1;
  } while (ExclusiveStartKey && pages < maxPages);
  return items;
}

async function fetchSettlements(): Promise<StoredPayment[]> {
  const items: StoredPayment[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new ScanCommand({
        TableName: CONFIG_TABLE,
        FilterExpression: "begins_with(PK, :p) AND SK = :sk",
        ExpressionAttributeValues: {
          ":p": paymentLedgerKeys.pkPrefix(),
          ":sk": paymentLedgerKeys.sk(),
        },
        ExclusiveStartKey,
      })
    );
    items.push(...((res.Items ?? []) as StoredPayment[]));
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

export async function buildPaymentReconciliationSnapshot(): Promise<PaymentReconciliationSnapshot> {
  const [orders, settlements] = await Promise.all([fetchAllOrdersNewestFirst(), fetchSettlements()]);

  const expectedPayments = emptyMoney();
  const byProvider = {
    stripe: emptyMoney(),
    razorpay: emptyMoney(),
    other: emptyMoney(),
  };
  let revenue = 0;
  let refundedExcluded = 0;
  let pendingExcluded = 0;
  let cancelledExcluded = 0;

  for (const order of orders) {
    if (order.status === ORDER_STATUS.REFUNDED) {
      refundedExcluded += 1;
      continue;
    }
    if (order.status === ORDER_STATUS.CANCELLED) {
      cancelledExcluded += 1;
      continue;
    }
    if (order.status === ORDER_STATUS.PENDING_PAYMENT) {
      pendingExcluded += 1;
      continue;
    }
    if (!isRevenueOrder(order.status)) continue;

    const currency: LedgerCurrency = order.currency === "INR" ? "INR" : "USD";
    const amount = Number(order.total) || 0;
    addMoney(expectedPayments, currency, amount);
    revenue += 1;

    const provider = order.paymentProvider;
    if (provider === "stripe") addMoney(byProvider.stripe, currency, amount);
    else if (provider === "razorpay") addMoney(byProvider.razorpay, currency, amount);
    else addMoney(byProvider.other, currency, amount);
  }

  const recordedSettlements = emptyMoney();
  const gatewayCharges = emptyMoney();
  const settlementsBySource = {
    stripe: emptyMoney(),
    razorpay: emptyMoney(),
    other: emptyMoney(),
  };
  for (const s of settlements) {
    const currency: LedgerCurrency = s.currency === "INR" ? "INR" : "USD";
    const amount = Number(s.amount) || 0;
    addMoney(recordedSettlements, currency, amount);
    if (s.paymentSource === "stripe") addMoney(settlementsBySource.stripe, currency, amount);
    else if (s.paymentSource === "razorpay") addMoney(settlementsBySource.razorpay, currency, amount);
    else addMoney(settlementsBySource.other, currency, amount);
    if (typeof s.gatewayFee === "number" && s.gatewayFee > 0) {
      addMoney(gatewayCharges, currency, s.gatewayFee);
    }
  }

  const pendingSettlements = emptyMoney();
  for (const c of ["USD", "INR"] as LedgerCurrency[]) {
    pendingSettlements[c] = roundMoney(expectedPayments[c] - recordedSettlements[c]);
  }

  const snapshot: PaymentReconciliationSnapshot = {
    generatedAt: now(),
    expectedPayments,
    recordedSettlements,
    gatewayCharges,
    netAmountReceived: { ...recordedSettlements },
    pendingSettlements,
    byProvider,
    settlementsBySource,
    overallExpected: { ...expectedPayments },
    orderCounts: {
      revenue,
      refundedExcluded,
      pendingExcluded,
      cancelledExcluded,
    },
    settlementCount: settlements.length,
  };

  console.info("payment-reconciliation", {
    revenueOrders: revenue,
    settlements: settlements.length,
    expectedUSD: expectedPayments.USD,
    expectedINR: expectedPayments.INR,
    pendingUSD: pendingSettlements.USD,
    pendingINR: pendingSettlements.INR,
  });

  return snapshot;
}

export async function getPaymentReconciliation(event: APIGatewayProxyEventV2) {
  if (!requireSuperAdmin(event)) return forbidden("Super admin access required");
  const snapshot = await buildPaymentReconciliationSnapshot();
  return ok({ reconciliation: snapshot });
}

/** Cron entry — compute + log (no Dynamo cache required for correctness). */
export async function runPaymentReconciliationJob(): Promise<PaymentReconciliationSnapshot> {
  return buildPaymentReconciliationSnapshot();
}
