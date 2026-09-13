import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  VENDOR_CJ_DROPSHIPPING,
  isCjDropshippingProduct,
  orderKeys,
  productKeys,
  upsertVendorFulfillment,
  getspiceHamperDef,
  resolvedHamperContentSlugs,
  type Order,
  type CartItem,
} from "@spicycorner/shared";
import { docClient, ORDERS_TABLE, PRODUCTS_TABLE, now } from "./db";
import { CjApiError, cjAddToMyProduct, cjCreateOrderV2, cjFreightCalculate } from "./cj-dropshipping";

type StoredOrder = Order & Record<string, unknown>;

type ProductRecord = {
  vendorSlug?: string;
  cjPid?: string;
  cjVid?: string;
  sku?: string;
  name?: string;
  cjVariants?: Array<{ vid?: string; sku?: string; name?: string; key?: string }>;
};

function cheapestLogistic(data: unknown): string | undefined {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)
      ? ((data as { data: unknown[] }).data)
      : data && typeof data === "object" && Array.isArray((data as { list?: unknown[] }).list)
        ? (data as { list: unknown[] }).list
        : [];
  let best: { name: string; price: number } | undefined;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const name = String(rec.logisticName ?? rec.logisticsName ?? rec.channel ?? "");
    const price = Number(rec.logisticPrice ?? rec.price ?? rec.postage ?? rec.totalPrice);
    if (!name) continue;
    if (!best || (Number.isFinite(price) && price < best.price)) {
      best = { name, price: Number.isFinite(price) ? price : Number.POSITIVE_INFINITY };
    }
  }
  return best?.name;
}

function errorMessage(err: unknown): string {
  if (err instanceof CjApiError) return err.message;
  return err instanceof Error ? err.message : String(err);
}

async function loadProduct(slug: string): Promise<ProductRecord | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  return result.Item as ProductRecord | undefined;
}

async function expandHamperItemsToCjLines(order: Order): Promise<CartItem[]> {
  const extra: CartItem[] = [];
  for (const item of order.items ?? []) {
    const def = getspiceHamperDef(item.productSlug);
    if (!def) continue;
    const slugs = resolvedHamperContentSlugs(def.contents, item.hamperCustomization);
    for (const slug of slugs) {
      extra.push({
        productSlug: slug,
        name: slug,
        price: 0,
        currency: item.currency,
        quantity: item.quantity,
        lineId: `${item.lineId || item.productSlug}:${slug}`,
      });
    }
  }
  return extra;
}

/**
 * Resolve CJ shopping lines from the order + Dynamo products.
 * Cart rows may omit vendorSlug (stripped on the storefront) or vid if the shopper
 * did not pick a variant — look those up so paid orders still push to CJ.
 */
export async function resolveCjFulfillmentLines(order: Order): Promise<CartItem[]> {
  const hamperLines = await expandHamperItemsToCjLines(order);
  const source = [...(order.items ?? []), ...hamperLines];
  const lines: CartItem[] = [];
  const seen = new Set<string>();

  for (const item of source) {
    const product = await loadProduct(item.productSlug);
    const pid = item.cjPid || product?.cjPid;
    const vendorSlug = item.vendorSlug || product?.vendorSlug;
    if (!isCjDropshippingProduct({ vendorSlug, cjPid: pid })) continue;

    const variants = product?.cjVariants ?? [];
    const vidFromSku = item.sku
      ? variants.find((v) => v.sku && v.sku === item.sku)?.vid
      : undefined;
    const vid = item.cjVid || product?.cjVid || vidFromSku || variants[0]?.vid;
    const sku =
      item.sku ||
      product?.sku ||
      variants.find((v) => v.vid && v.vid === vid)?.sku;
    if (!vid && !sku) continue;

    const key = `${vid || sku}:${item.lineId || item.productSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push({
      ...item,
      name: item.name || product?.name || item.productSlug,
      vendorSlug: VENDOR_CJ_DROPSHIPPING,
      ...(pid ? { cjPid: pid } : {}),
      ...(vid ? { cjVid: vid } : {}),
      ...(sku ? { sku } : {}),
    });
  }
  return lines;
}

async function persistOrder(order: StoredOrder, patch: Record<string, unknown>) {
  const timestamp = now();
  await docClient.send(
    new PutCommand({
      TableName: ORDERS_TABLE,
      Item: {
        ...order,
        ...patch,
        updatedAt: timestamp,
      },
    })
  );
}

async function createCjShoppingOrder(
  body: Record<string, unknown>,
  preferredPayType?: 1 | 2 | 3
) {
  // 2 = wallet (auto-process). 1 = create + pay URL so the order appears in CJ even with $0 balance.
  // Do not use 3 (draft only) — those often never show under Shopping → Orders.
  const sequence: Array<1 | 2 | 3> = preferredPayType ? [preferredPayType] : [2, 1];
  let lastError: unknown;
  for (const payType of sequence) {
    try {
      const created = await cjCreateOrderV2({ ...body, payType });
      return { created, payType };
    } catch (err) {
      lastError = err;
      console.warn("CJ createOrderV2 failed", { payType, err: errorMessage(err) });
    }
  }
  throw lastError instanceof Error ? lastError : new Error("CJ createOrderV2 failed");
}

export async function fulfillOrderWithCj(
  orderId: string,
  options: {
    payType?: 1 | 2 | 3;
    logisticName?: string;
    fromCountryCode?: string;
  } = {}
): Promise<{
  ok: boolean;
  skipped?: boolean;
  message: string;
  cjOrderId?: string;
  cjPayUrl?: string;
}> {
  const result = await docClient.send(
    new GetCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
    })
  );
  const order = result.Item as StoredOrder | undefined;
  if (!order) return { ok: false, message: "Order not found" };

  const existing = (order.vendorFulfillments ?? []).find(
    (f) => f.vendorSlug === VENDOR_CJ_DROPSHIPPING && f.cjOrderId
  );
  if (existing?.cjOrderId) {
    return {
      ok: true,
      skipped: true,
      message: "CJ order already created",
      cjOrderId: existing.cjOrderId,
      cjPayUrl: existing.cjPayUrl,
    };
  }

  const lines = await resolveCjFulfillmentLines(order);
  if (!lines.length) {
    return { ok: true, skipped: true, message: "No CJ Dropshipping lines on this order" };
  }

  const addr = order.shippingAddress;
  if (!addr?.name || !addr.line1 || !addr.city || !addr.country) {
    const message = "Shipping address is incomplete — cannot create a CJ order";
    await persistOrder(order, { cjFulfillError: message, cjFulfillAttemptedAt: now() });
    return { ok: false, message };
  }

  const products = lines.map((item) => ({
    vid: item.cjVid,
    sku: item.cjVid ? undefined : item.sku,
    quantity: item.quantity,
    storeLineItemId: item.lineId || item.productSlug,
    storeSku: item.sku,
    variantOptions: item.variantKey,
  }));

  const dest = (addr.country || "US").toUpperCase();
  const fromCountryCode = (options.fromCountryCode || "CN").toUpperCase();
  let logisticName = options.logisticName;
  if (!logisticName) {
    try {
      const freight = await cjFreightCalculate({
        startCountryCode: fromCountryCode,
        endCountryCode: dest,
        zip: addr.postalCode,
        products: lines
          .filter((l) => l.cjVid)
          .map((l) => ({ vid: l.cjVid as string, quantity: l.quantity })),
      });
      logisticName = cheapestLogistic(freight);
    } catch (err) {
      console.warn("CJ freight quote failed", err);
    }
  }
  if (!logisticName) logisticName = "CJPacket Ordinary";

  const pids = [...new Set(lines.map((item) => item.cjPid).filter((id): id is string => Boolean(id)))];
  for (const pid of pids) {
    try {
      await cjAddToMyProduct(pid);
    } catch (err) {
      console.warn("CJ addToMyProduct before fulfill failed", pid, err);
    }
  }

  try {
    const { created } = await createCjShoppingOrder(
      {
        orderNumber: order.orderNumber || order.orderId,
        shippingZip: addr.postalCode,
        shippingCountry: dest,
        shippingCountryCode: dest,
        shippingProvince: addr.state,
        shippingCity: addr.city,
        shippingPhone: addr.phone,
        shippingCustomerName: addr.name,
        shippingAddress: addr.line1,
        shippingAddress2: addr.line2 || "",
        email: addr.email,
        remark: `SpicyCorner ${order.orderNumber || order.orderId}`,
        logisticName,
        fromCountryCode,
        platform: "API",
        shopLogisticsType: 2,
        products,
      },
      options.payType
    );

    const cjOrderId = created?.orderId;
    if (!cjOrderId) {
      const message = "CJ created an order but did not return an order id";
      await persistOrder(order, { cjFulfillError: message, cjFulfillAttemptedAt: now() });
      return { ok: false, message };
    }

    const timestamp = now();
    const fulfillments = upsertVendorFulfillment(order.vendorFulfillments ?? [], {
      vendorSlug: VENDOR_CJ_DROPSHIPPING,
      status: "processing",
      updatedAt: timestamp,
      cjOrderId,
      cjOrderNumber: created?.orderNumber,
      cjPayUrl: created?.cjPayUrl,
    });

    await persistOrder(order, {
      vendorFulfillments: fulfillments,
      cjFulfillAttemptedAt: timestamp,
      cjFulfillError: undefined,
    });

    return {
      ok: true,
      message: created?.cjPayUrl
        ? "CJ order created — pay it in CJ Dropshipping (wallet was empty)"
        : "CJ order created",
      cjOrderId,
      cjPayUrl: created?.cjPayUrl,
    };
  } catch (err) {
    const message = errorMessage(err);
    await persistOrder(order, { cjFulfillError: message, cjFulfillAttemptedAt: now() });
    return { ok: false, message };
  }
}
