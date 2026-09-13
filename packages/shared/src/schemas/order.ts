import { z } from "zod";
import { cartItemSchema } from "./cart";
import { ORDER_STATUS } from "../constants";
import { checkoutAttributionSchema, orderAttributionSchema } from "./attribution";

/** International phone: 10–15 digits; allows +, spaces, dashes, parentheses. */
export function isValidShippingPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return false;
  if (!/^\+?[\d\s().-]{10,22}$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine(isValidShippingPhone, {
    message: "Enter a valid phone number with country code (e.g. +1 408 555 0100 or +91 98765 43210)",
  });

export const shippingAddressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(2).max(2),
  phone: phoneSchema,
  email: z.string().email(),
  /** Buyer / sender name — shown on the shipping label. */
  senderName: z.string().trim().max(80).optional(),
  /** Personal note from sister — printed on the shipping label. */
  senderMessage: z.string().trim().max(500).optional(),
});

export const DEFAULT_SENDER_MESSAGE =
  "Thank you for your SpicyCorner order — Indian spices packed for cooking.";

export const checkoutShippingAddressSchema = shippingAddressSchema;

/** Line assignment for a checkout shipment (must partition the cart). */
export const checkoutShipmentItemSchema = z.object({
  productSlug: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const checkoutShipmentSchema = z.object({
  shippingAddress: checkoutShippingAddressSchema,
  items: z.array(checkoutShipmentItemSchema).min(1),
});

export const checkoutSchema = z.object({
  shippingAddress: checkoutShippingAddressSchema,
  /**
   * Optional multi-address split. When omitted, the whole cart ships to
   * `shippingAddress`. When present, must cover every cart line exactly once.
   */
  shipments: z.array(checkoutShipmentSchema).min(1).max(40).optional(),
  paymentMethod: z.enum(["stripe", "razorpay"]),
  /** Customer-selected display/checkout currency (from currency switcher). */
  checkoutCurrency: z.enum(["USD", "INR"]).optional(),
  /** Live USD→INR rate shown to the customer (optional; server validates). */
  usdInrRate: z.number().positive().max(200).optional(),
  /** Welcome or promo coupon (e.g. SPICY-ABC123). */
  couponCode: z.string().min(4).max(32).optional(),
  /** Customer-requested delivery date (YYYY-MM-DD), max 2026-08-28. */
  preferredDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
  /** Customer override — must match a returned rate. */
  shippingServiceCode: z.string().optional(),
  shippingRateId: z.string().optional(),
  /** First/last-touch marketing attribution snapshot from the browser. */
  attribution: checkoutAttributionSchema.optional(),
});

/** Persisted per-delivery package on an order. */
export const orderShipmentSchema = z.object({
  shipmentId: z.string(),
  shippingAddress: shippingAddressSchema,
  items: z.array(cartItemSchema).min(1),
  subtotal: z.number(),
  shipping: z.number().default(0),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  shippingServiceCode: z.string().optional(),
  shippingServiceName: z.string().optional(),
  shippingRateId: z.string().optional(),
  estimatedLabelCost: z.number().optional(),
  labelCost: z.number().optional(),
  labelPdfUrl: z.string().optional(),
  labelStatus: z.enum(["none", "queued", "purchased", "failed"]).optional(),
  labelError: z.string().optional(),
});

const orderStatusEnum = z.enum([
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.ON_HOLD,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETE,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDED,
]);

export const orderStatusHistoryEntrySchema = z.object({
  status: orderStatusEnum,
  at: z.string(),
  note: z.string().optional(),
});

export const orderSchema = z.object({
  orderId: z.string(),
  /**
   * Human-readable order number for staff, customers, and vendors.
   * Orange County fulfill orders: OC10001…
   * All other SpicyCorner orders: HW10001… (legacy orders may still be US10001…).
   */
  orderNumber: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  items: z.array(cartItemSchema),
  subtotal: z.number(),
  discount: z.number().default(0),
  couponCode: z.string().optional(),
  shipping: z.number().default(0),
  tax: z.number().default(0),
  total: z.number(),
  currency: z.enum(["USD", "INR"]),
  /** Distinct vendorSlug values present on line items (for vendor order APIs). */
  vendorSlugs: z.array(z.string()).optional(),
  status: orderStatusEnum,
  statusHistory: z.array(orderStatusHistoryEntrySchema).optional(),
  /** Primary / first delivery address (always set; mirrors shipments[0] when multi). */
  shippingAddress: shippingAddressSchema,
  /** Multi-address deliveries. Omitted on older single-address orders. */
  shipments: z.array(orderShipmentSchema).optional(),
  paymentProvider: z.enum(["stripe", "razorpay"]).optional(),
  paymentIntentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  /**
   * Per-vendor fulfillment (tracking) for mixed Orange County + SpicyCorner carts.
   * Legacy single-vendor orders may only have top-level trackingNumber/carrier.
   */
  vendorFulfillments: z
    .array(
      z.object({
        vendorSlug: z.string().min(1).max(80),
        warehouseId: z.string().min(1).max(80).optional(),
        trackingNumber: z.string().optional(),
        carrier: z.string().optional(),
        status: z.enum(["pending", "processing", "shipped", "delivered"]).optional(),
        updatedAt: z.string().optional(),
        cjOrderId: z.string().optional(),
        cjOrderNumber: z.string().optional(),
        cjPayUrl: z.string().optional(),
      })
    )
    .optional(),
  assignedVendorId: z.string().min(1).max(80).optional(),
  assignedWarehouseId: z.string().min(1).max(80).optional(),
  fulfillmentCountry: z.string().length(2).optional(),
  routingReason: z.string().max(200).optional(),
  fulfillmentSplits: z
    .array(
      z.object({
        vendorId: z.string().min(1),
        warehouseId: z.string().min(1),
        productSlugs: z.array(z.string().min(1)),
        fulfillmentCountry: z.string().length(2),
        routingReason: z.string().max(200),
        estimatedDeliveryDays: z.number().int().optional(),
      })
    )
    .optional(),
  /** Last shipment status string received from vendor tracking API (e.g. in_transit). */
  vendorShipmentStatus: z.string().max(80).optional(),
  adminNotes: z.string().max(2000).optional(),
  estimatedDeliveryAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  /** ISO timestamp when post-delivery review email should send (deliveredAt + 1 day). */
  reviewEmailDueAt: z.string().optional(),
  /** Set after review request email is sent (idempotency). */
  reviewEmailSentAt: z.string().optional(),
  /** Set after paid confirmation is emailed (webhook retries if the first attempt timed out). */
  paidEmailSentAt: z.string().optional(),
  /** Last CJ createOrder attempt (ISO). */
  cjFulfillAttemptedAt: z.string().optional(),
  /** Set when auto-push to CJ fails so admin can retry. Empty string clears. */
  cjFulfillError: z.string().optional(),
  /** Last pending-payment reminder send time (ISO). */
  pendingPaymentReminderLastSentAt: z.string().optional(),
  /** America/New_York calendar day (YYYY-MM-DD) of last pending-payment reminder. */
  pendingPaymentReminderLastDateKey: z.string().optional(),
  /** How many pending-payment reminder emails have been sent. */
  pendingPaymentReminderCount: z.number().int().min(0).optional(),
  /** USPS rate-shopping metadata (customer may still pay $0 when mode is free). */
  shippingServiceCode: z.string().optional(),
  shippingServiceName: z.string().optional(),
  shippingRateId: z.string().optional(),
  estimatedLabelCost: z.number().optional(),
  labelCost: z.number().optional(),
  labelPdfUrl: z.string().optional(),
  labelStatus: z.enum(["none", "queued", "purchased", "failed"]).optional(),
  labelError: z.string().optional(),
  addressValidated: z.boolean().optional(),
  /**
   * Marketing attribution snapshot (first/last/assisted touch).
   * Stored on the order so Order Route survives analytics event TTL.
   */
  attribution: orderAttributionSchema.optional(),
});

/** Admin order status update payload. */
export const orderStatusUpdateSchema = z.object({
  status: orderStatusEnum.optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  /** Upsert per-vendor tracking (mixed OC + SpicyCorner orders). */
  vendorFulfillments: z
    .array(
      z.object({
        vendorSlug: z.string().min(1).max(80),
        warehouseId: z.string().min(1).max(80).optional(),
        trackingNumber: z.string().optional(),
        carrier: z.string().optional(),
        status: z.enum(["pending", "processing", "shipped", "delivered"]).optional(),
      })
    )
    .optional(),
  note: z.string().max(500).optional(),
  adminNotes: z.string().max(2000).optional(),
  estimatedDeliveryAt: z.string().optional(),
  shippingServiceCode: z.string().optional(),
  shippingServiceName: z.string().optional(),
  shippingRateId: z.string().optional(),
  estimatedLabelCost: z.number().optional(),
  labelStatus: z.enum(["none", "queued", "purchased", "failed"]).optional(),
  labelError: z.string().optional(),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type CheckoutShipment = z.infer<typeof checkoutShipmentSchema>;
export type OrderShipment = z.infer<typeof orderShipmentSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>;
export type OrderStatusHistoryEntry = z.infer<typeof orderStatusHistoryEntrySchema>;
export type Order = z.infer<typeof orderSchema> & {
  createdAt: string;
  updatedAt: string;
};
