import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { z } from "zod";
import {
  addressSchema,
  cartSubtotal,
  DEFAULT_USD_INR_RATE,
  orderKeys,
  productHasShippingDims,
  productKeys,
  shippingSettingsSchema,
  ensureVendorFulfillments,
  upsertVendorFulfillment,
  VENDOR_SPICYCORNER,
  orderHasVendor,
  type CartItem,
  type Order,
  type Product,
  type RateQuote,
  type ShopCurrency,
} from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE, ORDERS_TABLE, now } from "../lib/db";
import { ok, badRequest, forbidden, notFound, unauthorized } from "../lib/response";
import { getUserOrSessionKey, requireAdmin } from "../lib/auth";
import { getCartHandler } from "./cart";
import {
  estimatePackageForCartItems,
  purchaseLabelForOrder,
  resolveShippingForCheckout,
  shippingOriginConfigured,
  shippingOriginMissingMessage,
} from "../lib/shipping/checkout-shipping";
import { getShippingProvider, loadShippingSettings, saveShippingSettings } from "../lib/shipping";

const ratesQuerySchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(2).default("US"),
  shippingServiceCode: z.string().optional(),
  shippingRateId: z.string().optional(),
});

async function fetchOrder(orderId: string) {
  const result = await docClient.send(
    new GetCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
    })
  );
  return result.Item as (Order & { PK: string; SK: string }) | undefined;
}

function parseRatesInput(event: APIGatewayProxyEventV2) {
  if (event.body) {
    const body = JSON.parse(event.body);
    return ratesQuerySchema.safeParse(body);
  }
  const q = event.queryStringParameters ?? {};
  return ratesQuerySchema.safeParse({
    line1: q.line1,
    line2: q.line2,
    city: q.city,
    state: q.state,
    postalCode: q.postalCode,
    country: q.country ?? "US",
    shippingServiceCode: q.shippingServiceCode,
    shippingRateId: q.shippingRateId,
  });
}

/** GET /shipping/rates — session required; uses cart for package estimate. */
export async function getShippingRates(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const parsed = parseRatesInput(event);
  if (!parsed.success) return badRequest(parsed.error.message);

  const cartResponse = await getCartHandler(event);
  const cartBody = JSON.parse(
    typeof cartResponse === "string" ? cartResponse : (cartResponse.body ?? "{}")
  );
  const cart = cartBody.cart;
  if (!cart?.items?.length) return badRequest("Cart is empty");

  const items = cart.items as CartItem[];
  const currency = (items[0]?.currency ?? "USD") as ShopCurrency;
  const subtotal = cartSubtotal(items);

  const result = await resolveShippingForCheckout({
    destination: parsed.data,
    cartItems: items.map((i) => ({
      productSlug: i.productSlug,
      quantity: i.quantity,
    })),
    subtotal,
    currency,
    usdInrRate: DEFAULT_USD_INR_RATE,
    shippingServiceCode: parsed.data.shippingServiceCode,
    shippingRateId: parsed.data.shippingRateId,
  });

  return ok({
    rates: result.rates,
    selected: result.selected,
    customerShippingCharge: result.customerShippingCharge,
    settingsSnapshot: result.settingsSnapshot,
    fallbackUsed: result.fallbackUsed,
    warning: result.warning,
    packageDetails: result.packageDetails,
  });
}

export async function getAdminShippingSettings(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const settings = await loadShippingSettings();
  return ok({ settings });
}

export async function updateAdminShippingSettings(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = shippingSettingsSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const settings = await saveShippingSettings(parsed.data);
  return ok({ settings });
}

export async function buyLabelForOrder(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");

  if (order.labelStatus === "purchased" && order.trackingNumber) {
    return ok({
      order,
      message: "Label already purchased",
    });
  }

  const multiShipments = order.shipments?.filter((s) => s.items?.length) ?? [];
  if (multiShipments.length > 1) {
    try {
      const timestamp = now();
      let totalLabelCost = 0;
      const updatedShipments = [];
      for (const shipment of multiShipments) {
        if (shipment.labelStatus === "purchased" && shipment.trackingNumber) {
          updatedShipments.push(shipment);
          totalLabelCost += shipment.labelCost ?? 0;
          continue;
        }
        const label = await purchaseLabelForOrder({
          orderId: `${order.orderId}:${shipment.shipmentId}`,
          shippingAddress: shipment.shippingAddress,
          items: shipment.items,
          shippingRateId: shipment.shippingRateId ?? order.shippingRateId,
          shippingServiceCode: shipment.shippingServiceCode ?? order.shippingServiceCode,
        });
        totalLabelCost += label.labelCost ?? 0;
        updatedShipments.push({
          ...shipment,
          trackingNumber: label.trackingNumber,
          carrier: "USPS",
          labelPdfUrl: label.labelPdfUrl,
          labelCost: label.labelCost,
          labelStatus: "purchased" as const,
          labelError: undefined,
          shippingServiceName: label.shippingServiceName ?? shipment.shippingServiceName,
          shippingServiceCode: label.shippingServiceCode ?? shipment.shippingServiceCode,
        });
      }
      const first = updatedShipments[0];
      const updated = {
        ...order,
        shipments: updatedShipments,
        trackingNumber: first?.trackingNumber,
        carrier: "USPS",
        labelPdfUrl: first?.labelPdfUrl,
        labelCost: totalLabelCost || undefined,
        labelStatus: "purchased" as const,
        labelError: undefined,
        shippingServiceName: first?.shippingServiceName ?? order.shippingServiceName,
        shippingServiceCode: first?.shippingServiceCode ?? order.shippingServiceCode,
        updatedAt: timestamp,
      };
      await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
      return ok({ order: updated, message: `Purchased ${updatedShipments.length} USPS labels` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Label purchase failed";
      const timestamp = now();
      const updated = {
        ...order,
        labelStatus: "failed" as const,
        labelError: message,
        updatedAt: timestamp,
      };
      await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
      return badRequest(message);
    }
  }

  try {
    const label = await purchaseLabelForOrder({
      orderId: order.orderId,
      shippingAddress: order.shippingAddress,
      items: order.items,
      shippingRateId: order.shippingRateId,
      shippingServiceCode: order.shippingServiceCode,
    });

    const timestamp = now();
    let vendorFulfillments = ensureVendorFulfillments(order);
    // USPS labels are purchased by SpicyCorner for our own inventory lines.
    if (orderHasVendor(order, VENDOR_SPICYCORNER)) {
      vendorFulfillments = upsertVendorFulfillment(vendorFulfillments, {
        vendorSlug: VENDOR_SPICYCORNER,
        trackingNumber: label.trackingNumber,
        carrier: "USPS",
        status: "shipped",
        updatedAt: timestamp,
      });
    }
    const updated = {
      ...order,
      trackingNumber: label.trackingNumber,
      carrier: "USPS",
      labelPdfUrl: label.labelPdfUrl,
      labelCost: label.labelCost,
      labelStatus: "purchased" as const,
      labelError: undefined,
      shippingServiceName: label.shippingServiceName ?? order.shippingServiceName,
      shippingServiceCode: label.shippingServiceCode ?? order.shippingServiceCode,
      vendorFulfillments,
      updatedAt: timestamp,
    };

    await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
    return ok({ order: updated, label });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Label purchase failed";
    const timestamp = now();
    const updated = {
      ...order,
      labelStatus: "failed" as const,
      labelError: message,
      updatedAt: timestamp,
    };
    await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
    return badRequest(message);
  }
}

export async function getOrderShippingRates(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");

  const settings = await loadShippingSettings();
  if (!shippingOriginConfigured(settings)) {
    return badRequest(shippingOriginMissingMessage());
  }

  const pkg = await estimatePackageForCartItems(order.items);
  const destination = {
    name: order.shippingAddress.name,
    line1: order.shippingAddress.line1,
    line2: order.shippingAddress.line2,
    city: order.shippingAddress.city,
    state: order.shippingAddress.state,
    postalCode: order.shippingAddress.postalCode,
    country: order.shippingAddress.country,
    phone: order.shippingAddress.phone,
    email: order.shippingAddress.email,
  };

  try {
    const provider = await getShippingProvider(settings);
    const rates: RateQuote[] = await provider.getRates(
      pkg,
      settings.originAddress,
      destination
    );
    if (!rates.length) {
      return badRequest(
        "USPS returned no rates for this package/destination. Check product weights and the ship-to address, then try again."
      );
    }
    return ok({ rates, packageDetails: pkg });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rate lookup failed";
    return badRequest(message);
  }
}

export async function listProductsMissingDims(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const missing: Array<{ slug: string; name: string }> = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        ExclusiveStartKey: lastKey,
        FilterExpression: "SK = :sk",
        ExpressionAttributeValues: { ":sk": productKeys.sk() },
      })
    );

    for (const item of result.Items ?? []) {
      const product = item as Product;
      if (!product.slug || !product.name) continue;
      if (!productHasShippingDims(product)) {
        missing.push({ slug: product.slug, name: product.name });
      }
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return ok({ count: missing.length, products: missing });
}

/** Validate address via USPS (admin utility). */
export async function validateShippingAddress(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const settings = await loadShippingSettings();
  const provider = await getShippingProvider(settings);
  const result = await provider.validateAddress(parsed.data);
  return ok(result);
}
