import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  checkoutSchema,
  leadCaptureSchema,
  updateLeadSchema,
  orderStatusUpdateSchema,
  orderKeys,
  customerKeys,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  convertCartItemsToCurrency,
  cartSubtotal,
  couponEligibleSubtotal,
  applyCouponToOrderTotals,
  isTestOrderCoupon,
  buildOrderShipments,
  singleCheckoutShipment,
  isValidScheduleDeliveryDate,
  preferredDeliveryDateToIso,
  buildInitialVendorFulfillments,
  ensureVendorFulfillments,
  upsertVendorFulfillment,
  primaryTrackingFromFulfillments,
  allVendorsHaveTracking,
  anyVendorHasTracking,
  isMultiVendorOrder,
  assignFulfillment,
  orderVisibleToActor,
  redactOrderForVendor,
  productAvailableInCountry,
  type Order,
  type OrderStatusHistoryEntry,
  type CartItem,
  type VendorFulfillment,
} from "@spicycorner/shared";
import { resolveCheckoutUsdInrRate } from "../lib/exchange-rate";
import { docClient, ORDERS_TABLE, CUSTOMERS_TABLE, now } from "../lib/db";
import { ok, created, badRequest, unauthorized, forbidden, notFound } from "../lib/response";
import { getAuth, getSessionId, getUserOrSessionKey, requireAdmin, resolveStaffActor } from "../lib/auth";
import { getNetworkSnapshot } from "../lib/markets-store";
import { getCartHandler, clearCartForUser } from "./cart";
import {
  notifyAdminLead,
  notifyAdminOrderPaid,
  notifyAdminOrderPlaced,
  notifyAdminOrderPaymentFailed,
  notifyCustomerOrderStatusChange,
} from "../lib/email";
import { decrementInventoryForOrder, validateOrderInventory } from "../lib/inventory";
import { applyDeliveryReviewSchedule } from "./review-emails";
import { markCartConverted } from "./abandoned-cart-emails";
import { upsertSessionProfile } from "../lib/customer-profile";
import {
  allocateOrderNumberForCart,
  putOrderNumberPointer,
  resolveOrderByIdOrNumber,
} from "../lib/order-numbers";
import {
  issueWelcomeCoupon,
  markCouponUsed,
  validateCouponRecord,
} from "./coupons";
import { resolveShippingForCheckout, purchaseLabelForOrder } from "../lib/shipping/checkout-shipping";
import { loadShippingSettings } from "../lib/shipping";

type StoredOrder = Order & {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  GSI3PK: string;
  GSI3SK: string;
};

function buildOrderItem(order: Order, userKey: string): StoredOrder {
  return {
    ...order,
    PK: orderKeys.pk(order.orderId),
    SK: orderKeys.sk(),
    GSI1PK: orderKeys.gsi1pk(userKey),
    GSI1SK: orderKeys.gsi1sk(order.createdAt),
    GSI2PK: orderKeys.gsi2pk(),
    GSI2SK: orderKeys.gsi2sk(order.createdAt),
    GSI3PK: orderKeys.gsi3pk(order.status),
    GSI3SK: orderKeys.gsi3sk(order.createdAt),
  };
}

function normalizeEmail(email?: string): string | undefined {
  const trimmed = email?.trim();
  if (!trimmed || !trimmed.includes("@")) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : undefined;
}

export async function captureLead(event: APIGatewayProxyEventV2) {
  if ((event.body?.length ?? 0) > 16 * 1024) return badRequest("Payload too large");
  const body = JSON.parse(event.body ?? "{}");
  const parsed = leadCaptureSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const timestamp = now();
  const sessionId = parsed.data.sessionId;
  const email = normalizeEmail(parsed.data.email);

  let welcomeCoupon:
    | {
        code: string;
        expiresAt: string;
        discountPercent: number;
        reused?: boolean;
        alreadyClaimedToday?: boolean;
      }
    | undefined;
  let leadPayload = parsed.data;
  if (parsed.data.source === "newsletter") {
    const phone = parsed.data.phone?.trim();
    if (!phone) return badRequest("Enter a valid mobile number to spin");
    const requested = Number(parsed.data.metadata?.discountPercent);
    try {
      welcomeCoupon = await issueWelcomeCoupon({
        phone,
        email,
        sessionId,
        discountPercent: Number.isFinite(requested) ? requested : undefined,
      });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Could not issue discount coupon");
    }
    leadPayload = {
      ...parsed.data,
      metadata: {
        ...parsed.data.metadata,
        couponCode: welcomeCoupon.code,
        couponExpiresAt: welcomeCoupon.expiresAt,
        discountPercent: String(welcomeCoupon.discountPercent),
        alreadyClaimedToday: welcomeCoupon.alreadyClaimedToday ? "true" : "false",
        offer: "discount_of_the_day",
      },
    };
  }

  // lead event (co-located under the session)
  await docClient.send(
    new PutCommand({
      TableName: CUSTOMERS_TABLE,
      Item: {
        ...leadPayload,
        ...(email ? { email } : {}),
        leadId: uuidv4(),
        PK: customerKeys.pk(sessionId),
        SK: customerKeys.leadSk(timestamp),
        GSI1PK: customerKeys.gsi1pk(),
        GSI1SK: customerKeys.gsi1sk(timestamp),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    })
  );

  await upsertSessionProfile(sessionId, {
    name: leadPayload.name,
    email: leadPayload.email,
    phone: leadPayload.phone,
  });

  const emailResult = await notifyAdminLead(leadPayload);
  // Newsletter spins are phone-first — only require SMTP when an email was provided.
  const emailRequired =
    leadPayload.source === "contact" ||
    leadPayload.source === "review" ||
    leadPayload.source === "wholesale" ||
    (leadPayload.source === "newsletter" && Boolean(email));

  if (emailRequired && emailResult.skipped) {
    console.error("Email skipped — SMTP not configured:", leadPayload.source);
    return badRequest(
      "Email is not configured on the server yet. Please contact us on WhatsApp or at enquiry@spicycenter.com."
    );
  }

  if (emailRequired && !emailResult.ok) {
    console.error("Lead email failed:", leadPayload.source, emailResult.error);
    return badRequest(
      "Your enquiry was saved but email could not be sent. Please WhatsApp us or email enquiry@spicycenter.com."
    );
  }

  return created({
    ok: true,
    emailSent: emailResult.ok,
    ...(welcomeCoupon ? { coupon: welcomeCoupon } : {}),
  });
}

export async function checkout(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const cartResponse = await getCartHandler(event);
  const cartBody = JSON.parse(
    typeof cartResponse === "string" ? cartResponse : (cartResponse.body ?? "{}")
  );
  const cart = cartBody.cart;

  if (!cart?.items?.length) return badRequest("Cart is empty");

  const cartCurrency = cart.items[0]?.currency ?? "USD";
  const checkoutCurrency = parsed.data.checkoutCurrency ?? cartCurrency;

  if (parsed.data.paymentMethod === "stripe" && checkoutCurrency !== "USD") {
    return badRequest("Stripe checkout requires USD. Switch currency to USD or pay with Razorpay.");
  }

  const usdInrRate = await resolveCheckoutUsdInrRate(parsed.data.usdInrRate);
  const orderItems: CartItem[] =
    checkoutCurrency !== cartCurrency
      ? convertCartItemsToCurrency(cart.items, checkoutCurrency, usdInrRate)
      : (cart.items as CartItem[]);

  const stockError = await validateOrderInventory(orderItems);
  if (stockError) return badRequest(stockError);

  const subtotal = cartSubtotal(orderItems);
  const checkoutShipments =
    parsed.data.shipments?.length
      ? parsed.data.shipments
      : [singleCheckoutShipment(parsed.data.shippingAddress, orderItems)];

  const shippingSettings = await loadShippingSettings();
  const primaryDestination = checkoutShipments[0].shippingAddress;
  const primaryLines = checkoutShipments[0].items;
  const cartBySlug = new Map<string, CartItem>(
    orderItems.map((i) => [i.productSlug, i])
  );
  const primarySubtotal = primaryLines.reduce((sum, line) => {
    const item = cartBySlug.get(line.productSlug);
    return sum + (item ? item.price * line.quantity : 0);
  }, 0);

  /** Rate-shop primary package for label metadata; customer charge uses per-shipment threshold. */
  const shippingResult = await resolveShippingForCheckout({
    destination: {
      line1: primaryDestination.line1,
      line2: primaryDestination.line2,
      city: primaryDestination.city,
      state: primaryDestination.state,
      postalCode: primaryDestination.postalCode,
      country: primaryDestination.country,
    },
    cartItems: primaryLines.map((i) => ({
      productSlug: i.productSlug,
      quantity: i.quantity,
    })),
    subtotal: primarySubtotal,
    currency: checkoutCurrency as "USD" | "INR",
    usdInrRate,
    shippingServiceCode: parsed.data.shippingServiceCode,
    shippingRateId: parsed.data.shippingRateId,
    settings: shippingSettings,
  });

  if (shippingResult.warning) {
    console.warn("Checkout shipping rate lookup:", shippingResult.warning);
  }

  const built = buildOrderShipments({
    cartItems: orderItems,
    checkoutShipments,
    currency: checkoutCurrency as "USD" | "INR",
    usdInrRate,
    ...(shippingSettings.customerShippingMode === "pass_through"
      ? { passThroughShipping: shippingResult.customerShippingCharge }
      : {}),
  });
  if ("error" in built) return badRequest(built.error);

  const shipping = built.shippingTotal;
  const orderShipments = built.shipments;
  const tax = 0;
  const currency: "USD" | "INR" = checkoutCurrency === "INR" ? "INR" : "USD";

  let discount = 0;
  let couponCode: string | undefined;
  let total = Math.max(0, subtotal + shipping + tax);
  const checkoutEmail = normalizeEmail(parsed.data.shippingAddress.email);
  const checkoutPhone = parsed.data.shippingAddress.phone?.trim();

  if (parsed.data.couponCode?.trim()) {
    if (!checkoutEmail && !checkoutPhone) {
      return badRequest("Phone or email is required to apply a coupon");
    }
    const coupon = await validateCouponRecord(parsed.data.couponCode, {
      email: checkoutEmail,
      phone: checkoutPhone,
    });
    if (!coupon.valid) return badRequest(coupon.error ?? "Invalid coupon code");
    const eligibleSubtotal = couponEligibleSubtotal(orderItems as CartItem[]);
    if (!isTestOrderCoupon(coupon) && eligibleSubtotal <= 0) {
      return badRequest("Coupons cannot be applied to flash sale items");
    }
    const priced = applyCouponToOrderTotals({
      kind: coupon.kind,
      discountPercent: coupon.discountPercent,
      eligibleSubtotal,
      subtotal,
      shipping,
      tax,
      currency,
      usdInrRate,
    });
    discount = priced.discount;
    total = priced.total;
    couponCode = coupon.code;
  }

  const orderId = uuidv4();
  const timestamp = now();
  const auth = getAuth(event);
  const sessionId = getSessionId(event);

  if (sessionId) {
    await upsertSessionProfile(sessionId, {
      name: parsed.data.shippingAddress.name,
      email: parsed.data.shippingAddress.email,
      phone: parsed.data.shippingAddress.phone,
    });
  }

  const vendorSlugs = [
    ...new Set(
      (orderItems as CartItem[])
        .map((i) => i.vendorSlug)
        .filter((v): v is string => Boolean(v))
    ),
  ];
  const network = await getNetworkSnapshot();
  const destCountry = (primaryDestination.country || "US").toUpperCase();
  for (const item of orderItems as CartItem[]) {
    const available = productAvailableInCountry({
      productSlug: item.productSlug,
      countryCode: destCountry,
      listings: network.listings,
    });
    if (!available) {
      return badRequest(`${item.name} is not available for delivery to your selected location.`);
    }
  }
  const fulfillment = assignFulfillment({
    items: orderItems as CartItem[],
    destinationCountry: destCountry,
    postalCode: primaryDestination.postalCode,
    warehouses: network.warehouses,
    vendors: network.vendors,
    listings: network.listings,
  });
  if (!fulfillment.assignedWarehouseId) {
    return badRequest("We cannot fulfill this order to the selected country yet.");
  }
  const vendorFulfillments = buildInitialVendorFulfillments(orderItems as CartItem[]).map((row) => {
    const split = fulfillment.splits?.find((s) => s.vendorId === row.vendorSlug);
    return split?.warehouseId ? { ...row, warehouseId: split.warehouseId } : row;
  });

  const orderNumber = await allocateOrderNumberForCart(orderItems as CartItem[], vendorSlugs);

  const preferredDeliveryDate = parsed.data.preferredDeliveryDate?.trim();
  if (preferredDeliveryDate && !isValidScheduleDeliveryDate(preferredDeliveryDate)) {
    return badRequest("Scheduled delivery must be today through 28 August 2026");
  }

  const attribution = parsed.data.attribution
    ? {
        ...parsed.data.attribution,
        version: 1 as const,
        sessionId: parsed.data.attribution.sessionId || sessionId || undefined,
        visitorId: parsed.data.attribution.visitorId || sessionId || undefined,
      }
    : undefined;

  const order: Order = {
    orderId,
    orderNumber,
    userId: auth?.userId,
    sessionId,
    items: orderItems,
    subtotal,
    discount,
    ...(couponCode ? { couponCode } : {}),
    shipping,
    tax,
    total,
    currency,
    ...(vendorSlugs.length ? { vendorSlugs } : {}),
    vendorFulfillments,
    assignedVendorId: fulfillment.assignedVendorId,
    assignedWarehouseId: fulfillment.assignedWarehouseId,
    fulfillmentCountry: destCountry,
    routingReason: fulfillment.routingReason,
    ...(fulfillment.splits?.length ? { fulfillmentSplits: fulfillment.splits } : {}),
    status: ORDER_STATUS.PENDING_PAYMENT,
    statusHistory: [{ status: ORDER_STATUS.PENDING_PAYMENT, at: timestamp }],
    shippingAddress: orderShipments[0]?.shippingAddress ?? parsed.data.shippingAddress,
    shipments: orderShipments,
    ...(preferredDeliveryDate
      ? { estimatedDeliveryAt: preferredDeliveryDateToIso(preferredDeliveryDate) }
      : {}),
    ...(shippingResult.selected && {
      shippingServiceCode: shippingResult.selected.mailClass,
      shippingServiceName: shippingResult.selected.serviceName,
      shippingRateId: shippingResult.selected.rateId,
      estimatedLabelCost: shippingResult.estimatedLabelCost,
    }),
    ...(shippingResult.labelStatus && { labelStatus: shippingResult.labelStatus }),
    ...(shippingResult.warning &&
      !shippingResult.selected && {
        labelStatus: "queued" as const,
      }),
    ...(attribution ? { attribution } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const { createStripePaymentIntent } = await import("./payments/stripe");
  const { createRazorpayOrder } = await import("./payments/razorpay");

  if (parsed.data.paymentMethod === "stripe") {
    const payment = await createStripePaymentIntent(order);
    order.paymentProvider = "stripe";
    order.paymentIntentId = payment.paymentIntentId;
    await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: buildOrderItem(order, userKey) }));
    await putOrderNumberPointer(orderNumber, orderId);
    // Keep cart until payment succeeds so cancel/retry still has items.
    const emailResult = await notifyAdminOrderPlaced(order);
    if (!emailResult.ok) console.error("Order placed email failed:", emailResult.error);
    return created({ order, clientSecret: payment.clientSecret });
  }

  const payment = await createRazorpayOrder(order);
  order.paymentProvider = "razorpay";
  order.razorpayOrderId = payment.razorpayOrderId;
  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: buildOrderItem(order, userKey) }));
  await putOrderNumberPointer(orderNumber, orderId);
  // Keep cart until payment succeeds so cancel/retry still has items.
  const emailResult = await notifyAdminOrderPlaced(order);
  if (!emailResult.ok) console.error("Order placed email failed:", emailResult.error);
  return created({
    order,
    razorpayOrderId: payment.razorpayOrderId,
    razorpayKeyId: payment.keyId,
    ...(payment.qrImageUrl ? { razorpayQrImageUrl: payment.qrImageUrl } : {}),
  });
}

export async function listOrders(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const result = await docClient.send(
    new QueryCommand({
      TableName: ORDERS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": orderKeys.gsi1pk(auth.userId) },
      ScanIndexForward: false,
    })
  );

  return ok({ orders: result.Items ?? [] });
}

export async function listAdminOrders(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();

  const status = event.queryStringParameters?.status;
  const country = event.queryStringParameters?.country?.trim().toUpperCase();
  const vendor = event.queryStringParameters?.vendor?.trim();
  const warehouse = event.queryStringParameters?.warehouse?.trim();

  let items: Order[];
  if (status) {
    const result = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi3pk(status) },
        ScanIndexForward: false,
      })
    );
    items = (result.Items ?? []) as Order[];
  } else {
    const result = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
        ScanIndexForward: false,
      })
    );
    items = (result.Items ?? []) as Order[];
  }

  if (actor.vendorSlug) {
    items = items
      .filter((o) => orderVisibleToActor(o, actor))
      .map((o) => redactOrderForVendor(o, actor.vendorSlug!));
  }
  if (country) {
    items = items.filter(
      (o) => (o.fulfillmentCountry ?? o.shippingAddress?.country ?? "").toUpperCase() === country
    );
  }
  if (vendor) {
    items = items.filter((o) =>
      orderVisibleToActor(o, {
        ...actor,
        isAdmin: false,
        isVendor: true,
        vendorSlug: vendor,
      })
    );
  }
  if (warehouse) {
    items = items.filter(
      (o) =>
        o.assignedWarehouseId === warehouse ||
        o.fulfillmentSplits?.some((s) => s.warehouseId === warehouse) ||
        o.vendorFulfillments?.some((f) => f.warehouseId === warehouse)
    );
  }

  return ok({ orders: items });
}

async function fetchOrder(orderId: string): Promise<StoredOrder | undefined> {
  return resolveOrderByIdOrNumber(orderId) as Promise<StoredOrder | undefined>;
}

export async function getOrder(event: APIGatewayProxyEventV2) {
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");

  // ownership check: admin, matching user, or matching session
  const auth = getAuth(event);
  const sessionId = getSessionId(event);
  const isOwner =
    auth?.isAdmin ||
    (auth?.userId && order.userId === auth.userId) ||
    (sessionId && order.sessionId === sessionId);
  if (!isOwner) return forbidden();

  return ok({ order });
}

export async function getAdminOrder(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();

  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");
  if (!orderVisibleToActor(order, actor)) return forbidden();
  const payload = actor.vendorSlug ? redactOrderForVendor(order, actor.vendorSlug) : order;
  return ok({ order: payload });
}

export async function updateOrderStatus(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();

  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = orderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");
  if (!orderVisibleToActor(order, actor)) return forbidden();

  if (actor.vendorSlug) {
    if (parsed.data.status && parsed.data.status !== order.status) {
      return forbidden("Vendors cannot change the parent order status.");
    }
    if (parsed.data.adminNotes !== undefined) {
      return forbidden("Vendors cannot edit global admin notes.");
    }
    if (parsed.data.vendorFulfillments?.length) {
      parsed.data = {
        ...parsed.data,
        vendorFulfillments: parsed.data.vendorFulfillments.filter(
          (row) => row.vendorSlug === actor.vendorSlug
        ),
      };
    }
  }

  const nextStatus = parsed.data.status ?? order.status;
  if (parsed.data.status && parsed.data.status !== order.status) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return badRequest(`Cannot change status from ${order.status} to ${parsed.data.status}`);
    }
  }

  const timestamp = now();

  let vendorFulfillments: VendorFulfillment[] = ensureVendorFulfillments(order);
  if (parsed.data.vendorFulfillments?.length) {
    for (const row of parsed.data.vendorFulfillments) {
      vendorFulfillments = upsertVendorFulfillment(vendorFulfillments, {
        vendorSlug: row.vendorSlug,
        warehouseId: row.warehouseId,
        trackingNumber: row.trackingNumber,
        carrier: row.carrier,
        status: row.status,
        updatedAt: timestamp,
      });
    }
  } else if (parsed.data.trackingNumber !== undefined || parsed.data.carrier !== undefined) {
    const target =
      actor.vendorSlug ??
      (vendorFulfillments.length === 1
        ? vendorFulfillments[0]!.vendorSlug
        : vendorFulfillments.find((f) => f.vendorSlug !== "orange-county")?.vendorSlug ??
          vendorFulfillments[0]!.vendorSlug);
    vendorFulfillments = upsertVendorFulfillment(vendorFulfillments, {
      vendorSlug: target,
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      updatedAt: timestamp,
    });
  }

  const primary = primaryTrackingFromFulfillments(vendorFulfillments);

  // Mixed carts: do not mark whole order shipped until every vendor has an AWB,
  // unless admin explicitly chose shipped (still allowed for override).
  let resolvedStatus = nextStatus;
  if (
    parsed.data.status === ORDER_STATUS.SHIPPED &&
    isMultiVendorOrder(order) &&
    !allVendorsHaveTracking(vendorFulfillments)
  ) {
    return badRequest(
      "This order has multiple vendors. Add tracking for Orange County and SpicyCenter before marking Shipped, or save each vendor tracking first."
    );
  }
  if (
    !parsed.data.status &&
    isMultiVendorOrder(order) &&
    allVendorsHaveTracking(vendorFulfillments) &&
    order.status !== ORDER_STATUS.SHIPPED &&
    order.status !== ORDER_STATUS.DELIVERED &&
    order.status !== ORDER_STATUS.COMPLETE
  ) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (allowed.includes(ORDER_STATUS.SHIPPED)) {
      resolvedStatus = ORDER_STATUS.SHIPPED;
    } else if (allowed.includes(ORDER_STATUS.PROCESSING) && anyVendorHasTracking(vendorFulfillments)) {
      resolvedStatus = ORDER_STATUS.PROCESSING;
    }
  } else if (
    !parsed.data.status &&
    isMultiVendorOrder(order) &&
    anyVendorHasTracking(vendorFulfillments) &&
    !allVendorsHaveTracking(vendorFulfillments) &&
    (order.status === ORDER_STATUS.PAID || order.status === ORDER_STATUS.ACCEPTED)
  ) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (allowed.includes(ORDER_STATUS.PROCESSING)) {
      resolvedStatus = ORDER_STATUS.PROCESSING;
    }
  }

  const historyEntry: OrderStatusHistoryEntry | null =
    resolvedStatus !== order.status
      ? {
          status: resolvedStatus,
          at: timestamp,
          ...(parsed.data.note
            ? { note: parsed.data.note }
            : resolvedStatus === ORDER_STATUS.SHIPPED && isMultiVendorOrder(order)
              ? { note: "All vendors shipped — order marked shipped" }
              : {}),
        }
      : parsed.data.note
        ? { status: order.status, at: timestamp, note: parsed.data.note }
        : null;

  const updated: StoredOrder = {
    ...order,
    status: resolvedStatus,
    statusHistory: historyEntry
      ? [...(order.statusHistory ?? []), historyEntry]
      : order.statusHistory,
    vendorFulfillments,
    ...(primary.trackingNumber ? { trackingNumber: primary.trackingNumber } : {}),
    ...(primary.carrier ? { carrier: primary.carrier } : {}),
    ...(parsed.data.adminNotes !== undefined && { adminNotes: parsed.data.adminNotes }),
    ...(parsed.data.estimatedDeliveryAt !== undefined && {
      estimatedDeliveryAt: parsed.data.estimatedDeliveryAt,
    }),
    ...(parsed.data.shippingServiceCode !== undefined && {
      shippingServiceCode: parsed.data.shippingServiceCode,
    }),
    ...(parsed.data.shippingServiceName !== undefined && {
      shippingServiceName: parsed.data.shippingServiceName,
    }),
    ...(parsed.data.shippingRateId !== undefined && {
      shippingRateId: parsed.data.shippingRateId,
    }),
    ...(parsed.data.estimatedLabelCost !== undefined && {
      estimatedLabelCost: parsed.data.estimatedLabelCost,
    }),
    ...(parsed.data.labelStatus !== undefined && { labelStatus: parsed.data.labelStatus }),
    ...(parsed.data.labelError !== undefined && { labelError: parsed.data.labelError }),
    ...applyDeliveryReviewSchedule(order, resolvedStatus, timestamp),
    updatedAt: timestamp,
    ...(resolvedStatus !== order.status && {
      GSI3PK: orderKeys.gsi3pk(resolvedStatus),
      GSI3SK: orderKeys.gsi3sk(order.createdAt),
    }),
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));

  const statusChanged = resolvedStatus !== order.status;

  if (
    order.status === ORDER_STATUS.PENDING_PAYMENT &&
    resolvedStatus === ORDER_STATUS.CANCELLED
  ) {
    const emailResult = await notifyAdminOrderPaymentFailed(updated);
    if (!emailResult.ok) console.error("Order payment failed email failed:", emailResult.error);
  }

  // Notify customer + order@spicycorner on every status step (order confirmed → … → complete, cancelled/refunded).
  // Skip pending_payment → cancelled: shopper never paid; admin alert above is enough.
  // Same-status saves do not notify (statusChanged). Missing email/WhatsApp skips that channel only.
  if (
    statusChanged &&
    !(
      order.status === ORDER_STATUS.PENDING_PAYMENT &&
      resolvedStatus === ORDER_STATUS.CANCELLED
    )
  ) {
    try {
      const statusEmailResult = await notifyCustomerOrderStatusChange(updated, {
        previousNotificationStatus: order.status,
      });
      if (!statusEmailResult.ok && !statusEmailResult.skipped) {
        console.error("Order status email failed:", statusEmailResult.error);
      }
    } catch (err) {
      console.error("Order status notification failed:", err);
    }
  }

  return ok({ order: updated });
}

async function sendPaidOrderNotification(order: StoredOrder): Promise<StoredOrder> {
  if (order.paidEmailSentAt) return order;
  const emailResult = await notifyAdminOrderPaid(order);
  if (!emailResult.ok) {
    console.error("Order paid email failed:", emailResult.error);
    return order;
  }
  const stamped: StoredOrder = {
    ...order,
    paidEmailSentAt: now(),
    updatedAt: now(),
  };
  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: stamped }));
  return stamped;
}

async function pushPaidOrderToCj(orderId: string): Promise<void> {
  try {
    const { fulfillOrderWithCj } = await import("../lib/cj-fulfill");
    const cjResult = await fulfillOrderWithCj(orderId);
    if (!cjResult.ok) {
      console.warn("CJ auto-fulfill failed:", orderId, cjResult.message);
    } else if (!cjResult.skipped) {
      console.info("CJ auto-fulfill ok:", orderId, cjResult.cjOrderId);
    }
  } catch (err) {
    console.error("CJ auto-fulfill error:", orderId, err);
  }
}

/** Mark an order paid (called by Stripe/Razorpay webhooks + Razorpay verify). */
export async function markOrderPaid(
  orderId: string | undefined,
  payment: { paymentIntentId?: string; razorpayPaymentId?: string }
) {
  if (!orderId) return;
  const order = await fetchOrder(orderId);
  if (!order) return;
  if (order.status === ORDER_STATUS.PAID) {
    // First webhook may have timed out after marking paid but before email / CJ push.
    await sendPaidOrderNotification(order);
    await pushPaidOrderToCj(order.orderId);
    return;
  }
  // Only promote unpaid checkouts — avoid clobbering fulfilled orders via late webhooks.
  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
    console.warn("markOrderPaid skipped — order not pending_payment", {
      orderId,
      status: order.status,
    });
    return;
  }

  const timestamp = now();
  let updated: StoredOrder = {
    ...order,
    status: ORDER_STATUS.PAID,
    statusHistory: [...(order.statusHistory ?? []), { status: ORDER_STATUS.PAID, at: timestamp }],
    ...(payment.paymentIntentId && { paymentIntentId: payment.paymentIntentId }),
    ...(payment.razorpayPaymentId && { razorpayPaymentId: payment.razorpayPaymentId }),
    updatedAt: timestamp,
    GSI3PK: orderKeys.gsi3pk(ORDER_STATUS.PAID),
    GSI3SK: orderKeys.gsi3sk(order.createdAt),
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
  if (order.couponCode) {
    await markCouponUsed(order.couponCode, order.orderId);
  }
  await markCartConverted(order.sessionId, order.orderId);
  // Clear cart only after successful payment (not when opening Razorpay/Stripe).
  const cartOwner = order.userId || order.sessionId;
  if (cartOwner) {
    try {
      await clearCartForUser(cartOwner);
    } catch (err) {
      console.error("clearCart after pay failed:", orderId, err);
    }
  }
  await decrementInventoryForOrder(updated);

  // Push to CJ before SMTP so a slow mailbox cannot skip warehouse fulfillment.
  await pushPaidOrderToCj(updated.orderId);
  updated = (await fetchOrder(orderId)) ?? updated;
  updated = await sendPaidOrderNotification(updated);
  updated = (await fetchOrder(orderId)) ?? updated;

  const settings = await loadShippingSettings();
  if (
    settings.autoPurchaseOnPayment &&
    updated.shippingServiceCode &&
    updated.labelStatus !== "purchased"
  ) {
    try {
      const label = await purchaseLabelForOrder({
        orderId: updated.orderId,
        shippingAddress: updated.shippingAddress,
        items: updated.items,
        shippingRateId: updated.shippingRateId,
        shippingServiceCode: updated.shippingServiceCode,
      });
      const labeled: StoredOrder = {
        ...updated,
        trackingNumber: label.trackingNumber,
        carrier: "USPS",
        labelPdfUrl: label.labelPdfUrl,
        labelCost: label.labelCost,
        labelStatus: "purchased",
        shippingServiceName: label.shippingServiceName ?? updated.shippingServiceName,
        updatedAt: now(),
      };
      await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: labeled }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Auto label purchase failed";
      console.error("Auto label purchase failed:", orderId, message);
      const failed: StoredOrder = {
        ...updated,
        labelStatus: "failed",
        labelError: message,
        updatedAt: now(),
      };
      await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: failed }));
    }
  }

  const { markReminderEmailConverted } = await import("./reminder-emails");
  await markReminderEmailConverted(updated.shippingAddress?.email);
}

/** Mark checkout cancelled after failed or abandoned payment. */
export async function markOrderPaymentFailed(
  orderId: string | undefined,
  note?: string
): Promise<void> {
  if (!orderId) return;
  const order = await fetchOrder(orderId);
  if (!order) return;
  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) return;

  const timestamp = now();
  const updated: StoredOrder = {
    ...order,
    status: ORDER_STATUS.CANCELLED,
    statusHistory: [
      ...(order.statusHistory ?? []),
      {
        status: ORDER_STATUS.CANCELLED,
        at: timestamp,
        note: note ?? "Payment failed or cancelled",
      },
    ],
    updatedAt: timestamp,
    GSI3PK: orderKeys.gsi3pk(ORDER_STATUS.CANCELLED),
    GSI3SK: orderKeys.gsi3sk(order.createdAt),
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
  const emailResult = await notifyAdminOrderPaymentFailed(updated);
  if (!emailResult.ok) console.error("Order payment failed email failed:", emailResult.error);
}

/** Lookup an order by id (used by Razorpay verify for ownership/amount checks). */
export async function getOrderById(orderId: string): Promise<StoredOrder | undefined> {
  return fetchOrder(orderId);
}

function assertOrderAccess(event: APIGatewayProxyEventV2, order: StoredOrder): boolean {
  const auth = getAuth(event);
  const sessionId = getSessionId(event);
  return Boolean(
    auth?.isAdmin ||
      (auth?.userId && order.userId === auth.userId) ||
      (sessionId && order.sessionId === sessionId)
  );
}

/** Re-create payment for a pending order (retry after failed/cancelled checkout). */
export async function retryOrderPayment(event: APIGatewayProxyEventV2) {
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");
  if (!assertOrderAccess(event, order)) return forbidden();
  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
    return badRequest("This order is not awaiting payment");
  }

  const body = JSON.parse(event.body ?? "{}");
  const paymentMethod = (body.paymentMethod as string | undefined) ?? order.paymentProvider ?? "stripe";

  if (paymentMethod === "stripe" && order.currency !== "USD") {
    return badRequest("Stripe retry requires USD orders");
  }

  const { createStripePaymentIntent } = await import("./payments/stripe");
  const { createRazorpayOrder } = await import("./payments/razorpay");
  const timestamp = now();

  if (paymentMethod === "stripe") {
    const payment = await createStripePaymentIntent(order);
    const updated: StoredOrder = {
      ...order,
      paymentProvider: "stripe",
      paymentIntentId: payment.paymentIntentId,
      updatedAt: timestamp,
    };
    await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
    return ok({ order: updated, clientSecret: payment.clientSecret });
  }

  const payment = await createRazorpayOrder(order);
  const updated: StoredOrder = {
    ...order,
    paymentProvider: "razorpay",
    razorpayOrderId: payment.razorpayOrderId,
    updatedAt: timestamp,
  };
  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
  return ok({
    order: updated,
    razorpayOrderId: payment.razorpayOrderId,
    razorpayKeyId: payment.keyId,
    ...(payment.qrImageUrl ? { razorpayQrImageUrl: payment.qrImageUrl } : {}),
  });
}

export async function listLeads(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const result = await docClient.send(
    new QueryCommand({
      TableName: CUSTOMERS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": customerKeys.gsi1pk() },
      ScanIndexForward: false,
      Limit: 200,
    })
  );

  return ok({ leads: result.Items ?? [] });
}

export async function updateLead(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { sessionId, createdAt, ...fields } = parsed.data;
  const existing = await docClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: {
        PK: customerKeys.pk(sessionId),
        SK: customerKeys.leadSk(createdAt),
      },
    })
  );
  if (!existing.Item) return notFound("Lead not found");

  const timestamp = now();
  const updated = {
    ...existing.Item,
    ...fields,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: updated }));
  return ok({ lead: updated });
}
