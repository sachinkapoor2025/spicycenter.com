/**
 * Super-admin Vendor Management — order economics + vendor payout ledger.
 * Website admin API only (not the Orange County vendor API).
 */
import { v4 as uuidv4 } from "uuid";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { QueryCommand, ScanCommand, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import {
  VENDOR_ORANGE_COUNTY,
  VENDOR_PAYMENT_SLUGS,
  VENDOR_PAYMENT_SLUG_LABELS,
  createVendorPayoutSchema,
  updateVendorPayoutSchema,
  vendorPayoutKeys,
  orderKeys,
  isRevenueOrder,
  displayOrderRef,
  cartLineUnitTotal,
  convertCurrencyAmount,
  roundForCurrency,
  type Order,
  type CartItem,
  type VendorPayoutEntry,
  type VendorPaymentSlug,
  type VendorOrderPaymentRow,
  type VendorOrderLineSummary,
  type VendorManagementReport,
  type VendorManagementDailyPoint,
  type MoneyByCurrency,
  type LedgerCurrency,
} from "@spicycorner/shared";
import { requireSuperAdmin } from "../lib/auth";
import { docClient, ORDERS_TABLE, CONFIG_TABLE, now } from "../lib/db";
import { ok, created, badRequest, forbidden, notFound } from "../lib/response";
import { getBundledOrangeCountyProduct } from "../lib/orange-county-catalog";
import { getLiveUsdInrRate } from "../lib/exchange-rate";

type StoredOrder = Order & { PK: string; SK: string };
type StoredPayout = VendorPayoutEntry & { PK: string; SK: string };

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function emptyMoney(): MoneyByCurrency {
  return { USD: 0, INR: 0 };
}

function normalizeCurrency(value: unknown): LedgerCurrency {
  return value === "INR" ? "INR" : "USD";
}

function toPublicPayout(item: StoredPayout): VendorPayoutEntry {
  return {
    payoutId: item.payoutId,
    vendorSlug: item.vendorSlug,
    amount: item.amount,
    currency: normalizeCurrency(item.currency),
    paidDate: item.paidDate,
    paymentMethod: item.paymentMethod,
    orderIds: item.orderIds,
    notes: item.notes,
    reference: item.reference,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function parseVendorSlug(raw: string | undefined): VendorPaymentSlug {
  const v = (raw ?? VENDOR_ORANGE_COUNTY).trim();
  if ((VENDOR_PAYMENT_SLUGS as readonly string[]).includes(v)) {
    return v as VendorPaymentSlug;
  }
  return VENDOR_ORANGE_COUNTY;
}

function orderTouchesVendor(order: Order, vendorSlug: string): boolean {
  if (order.vendorSlugs?.includes(vendorSlug)) return true;
  return order.items.some((i) => i.vendorSlug === vendorSlug);
}

function resolveLineVendorCost(item: CartItem, vendorSlug: string): number | null {
  if (typeof item.vendorCost === "number" && item.vendorCost >= 0) {
    return item.vendorCost;
  }
  if (vendorSlug === VENDOR_ORANGE_COUNTY) {
    const bundled = getBundledOrangeCountyProduct(item.productSlug);
    const cost = bundled?.vendorCost;
    if (typeof cost === "number" && cost > 0) return cost;
  }
  return null;
}

function vendorLines(order: Order, vendorSlug: string): CartItem[] {
  return order.items.filter((i) => i.vendorSlug === vendorSlug);
}

function merchandiseTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + cartLineUnitTotal(item) * item.quantity, 0);
}

/**
 * Vendor cart sell = product + allocated shipping/tax/discount share of order.total.
 * Low-value orders often charge shipping; that shipping is part of what we "sold".
 */
function vendorCartSellNative(order: Order, vendorSlug: string): {
  sellNative: number;
  productOnly: number;
  shippingAllocated: number;
} {
  const lines = vendorLines(order, vendorSlug);
  const productOnly = roundMoney(merchandiseTotal(lines));
  const allMerch = merchandiseTotal(order.items);
  const share = allMerch > 0 ? productOnly / allMerch : lines.length === order.items.length ? 1 : 0;
  const orderTotal = Number(order.total) || 0;
  const shipping = Number(order.shipping) || 0;
  const sellNative =
    orderTotal > 0
      ? roundMoney(orderTotal * share)
      : roundMoney(productOnly + shipping * share);
  const shippingAllocated = roundMoney(Math.max(0, sellNative - productOnly));
  return { sellNative, productOnly, shippingAllocated };
}

function toUsd(amount: number, currency: LedgerCurrency, usdInrRate: number): number {
  return roundMoney(
    roundForCurrency(convertCurrencyAmount(amount, currency, "USD", usdInrRate), "USD")
  );
}

function buildOrderRow(
  order: Order,
  vendorSlug: string,
  paidToVendor: number,
  usdInrRate: number
): VendorOrderPaymentRow {
  const lines = vendorLines(order, vendorSlug);
  const currency = normalizeCurrency(order.currency);
  const items: VendorOrderLineSummary[] = lines.map((item) => {
    const unitCost = resolveLineVendorCost(item, vendorSlug);
    const qty = item.quantity;
    return {
      productSlug: item.productSlug,
      name: item.name,
      quantity: qty,
      sellUnitPrice: item.price,
      sellCurrency: currency,
      vendorUnitCost: unitCost,
      vendorCostCurrency: "USD",
      lineSellTotal: roundMoney(cartLineUnitTotal(item) * qty),
      lineVendorCostTotal: unitCost == null ? null : roundMoney(unitCost * qty),
    };
  });

  const { sellNative, productOnly, shippingAllocated } = vendorCartSellNative(order, vendorSlug);
  const sellTotalUsd = toUsd(sellNative, currency, usdInrRate);
  const sellTotalInr = currency === "INR" ? roundForCurrency(sellNative, "INR") : null;

  const missingCost = items.some((i) => i.lineVendorCostTotal == null);
  const vendorCostTotal = missingCost
    ? null
    : roundMoney(items.reduce((s, i) => s + (i.lineVendorCostTotal ?? 0), 0));

  const countsTowardPayable = isRevenueOrder(order.status);
  const pendingToVendor =
    countsTowardPayable && vendorCostTotal != null
      ? roundMoney(Math.max(0, vendorCostTotal - paidToVendor))
      : null;

  const profitEstimate =
    countsTowardPayable && vendorCostTotal != null
      ? roundMoney(sellTotalUsd - vendorCostTotal)
      : null;

  return {
    orderId: order.orderId,
    orderNumber: displayOrderRef(order),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: order.status,
    currency,
    paymentProvider: order.paymentProvider,
    trackingNumber: order.trackingNumber ?? null,
    recipientName: order.shippingAddress?.name,
    items,
    sellTotalNative: sellNative,
    sellTotalUsd,
    sellTotalInr,
    productSellNative: productOnly,
    shippingAllocatedNative: shippingAllocated,
    sellTotal: sellTotalUsd,
    vendorCostTotal,
    paidToVendor: roundMoney(paidToVendor),
    pendingToVendor,
    profitEstimate,
    countsTowardPayable,
  };
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

async function listPayoutItems(vendorSlug?: string): Promise<StoredPayout[]> {
  const items: StoredPayout[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: CONFIG_TABLE,
        FilterExpression: "begins_with(PK, :p) AND SK = :sk",
        ExpressionAttributeValues: {
          ":p": vendorPayoutKeys.pkPrefix(),
          ":sk": vendorPayoutKeys.sk(),
        },
        ExclusiveStartKey,
      })
    );
    items.push(...((result.Items ?? []) as StoredPayout[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);

  const filtered = vendorSlug
    ? items.filter((p) => (p.vendorSlug || VENDOR_ORANGE_COUNTY) === vendorSlug)
    : items;

  return filtered.sort((a, b) => {
    const byDate = (b.paidDate ?? "").localeCompare(a.paidDate ?? "");
    if (byDate !== 0) return byDate;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

function orderMatchesRef(order: Order, ref: string): boolean {
  const r = ref.trim();
  if (!r) return false;
  const human = displayOrderRef(order);
  return (
    r === order.orderId ||
    r === human ||
    r.toUpperCase() === human.toUpperCase()
  );
}

/** Allocate payout amounts to orders (proportional by vendor cost when multiple). */
function allocatePayouts(
  orders: Order[],
  payouts: VendorPayoutEntry[],
  vendorSlug: string
): { paidByOrderId: Map<string, number>; unallocatedPaid: number } {
  const paidByOrderId = new Map<string, number>();
  let unallocatedPaid = 0;

  const costByOrderId = new Map<string, number>();
  for (const order of orders) {
    const lines = vendorLines(order, vendorSlug);
    let total = 0;
    let ok = true;
    for (const item of lines) {
      const c = resolveLineVendorCost(item, vendorSlug);
      if (c == null) {
        ok = false;
        break;
      }
      total += c * item.quantity;
    }
    if (ok && total > 0) costByOrderId.set(order.orderId, roundMoney(total));
  }

  for (const payout of payouts) {
    const amount = Number(payout.amount) || 0;
    if (amount <= 0) continue;
    const refs = (payout.orderIds ?? []).map((x) => x.trim()).filter(Boolean);
    if (!refs.length) {
      unallocatedPaid = roundMoney(unallocatedPaid + amount);
      continue;
    }

    const matched = orders.filter((o) => refs.some((r) => orderMatchesRef(o, r)));
    if (!matched.length) {
      unallocatedPaid = roundMoney(unallocatedPaid + amount);
      continue;
    }

    const weights = matched.map((o) => costByOrderId.get(o.orderId) ?? 1);
    const weightSum = weights.reduce((s, w) => s + w, 0) || matched.length;
    matched.forEach((o, i) => {
      const share = roundMoney((amount * (weights[i] ?? 1)) / weightSum);
      paidByOrderId.set(o.orderId, roundMoney((paidByOrderId.get(o.orderId) ?? 0) + share));
    });
  }

  return { paidByOrderId, unallocatedPaid };
}

function buildDailySeries(
  orderRows: VendorOrderPaymentRow[],
  payouts: VendorPayoutEntry[],
  days = 30
): VendorManagementDailyPoint[] {
  const points: VendorManagementDailyPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({ date: key, sellUsd: 0, vendorCostUsd: 0, paidUsd: 0, orderCount: 0 });
  }
  const byDate = new Map(points.map((p) => [p.date, p]));

  for (const row of orderRows) {
    if (!row.countsTowardPayable) continue;
    const key = row.createdAt.slice(0, 10);
    const bucket = byDate.get(key);
    if (!bucket) continue;
    bucket.orderCount += 1;
    bucket.sellUsd = roundMoney(bucket.sellUsd + row.sellTotalUsd);
    if (row.vendorCostTotal != null) {
      bucket.vendorCostUsd = roundMoney(bucket.vendorCostUsd + row.vendorCostTotal);
    }
  }

  for (const p of payouts) {
    const bucket = byDate.get(p.paidDate);
    if (!bucket) continue;
    if (normalizeCurrency(p.currency) === "USD") {
      bucket.paidUsd = roundMoney(bucket.paidUsd + p.amount);
    }
  }

  return points;
}

export async function buildVendorManagementReport(
  vendorSlug: VendorPaymentSlug
): Promise<VendorManagementReport> {
  const [allOrders, payoutItems, fx] = await Promise.all([
    fetchAllOrdersNewestFirst(),
    listPayoutItems(vendorSlug),
    getLiveUsdInrRate(),
  ]);
  const usdInrRate = fx.rate;

  const vendorOrders = allOrders.filter(
    (o) => orderTouchesVendor(o, vendorSlug) && isRevenueOrder(o.status)
  );
  const payouts = payoutItems.map(toPublicPayout);
  const { paidByOrderId, unallocatedPaid } = allocatePayouts(vendorOrders, payouts, vendorSlug);

  const orders = vendorOrders.map((o) =>
    buildOrderRow(o, vendorSlug, paidByOrderId.get(o.orderId) ?? 0, usdInrRate)
  );

  const soldByCurrency = emptyMoney();
  let soldUsd = 0;
  let soldInr = 0;
  let vendorCostTotal = 0;
  let estimatedProfitUsd = 0;
  const byStatus: Record<string, number> = {};

  for (const row of orders) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    soldUsd = roundMoney(soldUsd + row.sellTotalUsd);
    soldByCurrency.USD = soldUsd;
    if (row.sellTotalInr != null) {
      soldInr = roundMoney(soldInr + row.sellTotalInr);
      soldByCurrency.INR = soldInr;
    }
    if (row.vendorCostTotal != null) {
      vendorCostTotal = roundMoney(vendorCostTotal + row.vendorCostTotal);
    }
    if (row.profitEstimate != null) {
      estimatedProfitUsd = roundMoney(estimatedProfitUsd + row.profitEstimate);
    }
  }

  const paidToVendor = roundMoney(
    payouts
      .filter((p) => normalizeCurrency(p.currency) === "USD")
      .reduce((s, p) => s + p.amount, 0)
  );

  const summary = {
    vendorSlug,
    vendorLabel: VENDOR_PAYMENT_SLUG_LABELS[vendorSlug],
    orderCount: orders.length,
    payableOrderCount: orders.length,
    soldUsd,
    soldInr,
    soldByCurrency,
    usdInrRate,
    vendorCostTotal,
    paidToVendor,
    unallocatedPaid,
    pendingToVendor: roundMoney(Math.max(0, vendorCostTotal - paidToVendor)),
    estimatedProfitUsd,
    byStatus,
  };

  return {
    generatedAt: now(),
    summary,
    orders,
    payouts,
    daily: buildDailySeries(orders, payouts, 30),
  };
}

export async function getVendorManagement(event: APIGatewayProxyEventV2) {
  if (!requireSuperAdmin(event)) return forbidden("Super admin access required");
  const vendorSlug = parseVendorSlug(event.queryStringParameters?.vendor);
  const report = await buildVendorManagementReport(vendorSlug);
  return ok({ report });
}

export async function listVendorPayouts(event: APIGatewayProxyEventV2) {
  if (!requireSuperAdmin(event)) return forbidden("Super admin access required");
  const vendorSlug = parseVendorSlug(event.queryStringParameters?.vendor);
  const payouts = (await listPayoutItems(vendorSlug)).map(toPublicPayout);
  const totalAmount = roundMoney(
    payouts
      .filter((p) => normalizeCurrency(p.currency) === "USD")
      .reduce((s, p) => s + p.amount, 0)
  );
  return ok({ payouts, count: payouts.length, totalAmount, currency: "USD", vendorSlug });
}

export async function createVendorPayout(event: APIGatewayProxyEventV2) {
  const auth = requireSuperAdmin(event);
  if (!auth) return forbidden("Super admin access required");

  const parsed = createVendorPayoutSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);

  const payoutId = uuidv4();
  const timestamp = now();
  const item: StoredPayout = {
    PK: vendorPayoutKeys.pk(payoutId),
    SK: vendorPayoutKeys.sk(),
    payoutId,
    vendorSlug: parsed.data.vendorSlug,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    paidDate: parsed.data.paidDate,
    paymentMethod: parsed.data.paymentMethod,
    ...(parsed.data.orderIds?.length
      ? { orderIds: [...new Set(parsed.data.orderIds.map((x) => x.trim()).filter(Boolean))] }
      : {}),
    notes: parsed.data.notes?.trim() || undefined,
    reference: parsed.data.reference?.trim() || undefined,
    createdBy: auth.email || auth.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: CONFIG_TABLE, Item: item }));
  console.info("vendor-payout.create", {
    payoutId,
    vendorSlug: item.vendorSlug,
    amount: item.amount,
    orderIds: item.orderIds?.length ?? 0,
    createdBy: item.createdBy,
  });
  return created({ payout: toPublicPayout(item) });
}

export async function updateVendorPayout(event: APIGatewayProxyEventV2) {
  const auth = requireSuperAdmin(event);
  if (!auth) return forbidden("Super admin access required");

  const payoutId = event.pathParameters?.payoutId?.trim();
  if (!payoutId) return badRequest("payoutId required");

  const parsed = updateVendorPayoutSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);

  const existing = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: vendorPayoutKeys.pk(payoutId), SK: vendorPayoutKeys.sk() },
    })
  );
  if (!existing.Item) return notFound("Payout not found");

  const prev = existing.Item as StoredPayout;
  const updated: StoredPayout = {
    ...prev,
    ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
    ...(parsed.data.currency !== undefined ? { currency: parsed.data.currency } : {}),
    ...(parsed.data.paidDate !== undefined ? { paidDate: parsed.data.paidDate } : {}),
    ...(parsed.data.paymentMethod !== undefined
      ? { paymentMethod: parsed.data.paymentMethod }
      : {}),
    ...(parsed.data.orderIds !== undefined
      ? {
          orderIds: [
            ...new Set(parsed.data.orderIds.map((x) => x.trim()).filter(Boolean)),
          ],
        }
      : {}),
    ...(parsed.data.notes !== undefined
      ? { notes: parsed.data.notes.trim() || undefined }
      : {}),
    ...(parsed.data.reference !== undefined
      ? { reference: parsed.data.reference.trim() || undefined }
      : {}),
    updatedAt: now(),
  };

  await docClient.send(new PutCommand({ TableName: CONFIG_TABLE, Item: updated }));
  return ok({ payout: toPublicPayout(updated) });
}

export async function deleteVendorPayout(event: APIGatewayProxyEventV2) {
  if (!requireSuperAdmin(event)) return forbidden("Super admin access required");
  const payoutId = event.pathParameters?.payoutId?.trim();
  if (!payoutId) return badRequest("payoutId required");

  await docClient.send(
    new DeleteCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: vendorPayoutKeys.pk(payoutId), SK: vendorPayoutKeys.sk() },
    })
  );
  return ok({ deleted: true, payoutId });
}
