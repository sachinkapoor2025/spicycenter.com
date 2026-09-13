import { z } from "zod";

/** Default lookback so vendors do not re-import the full history. */
export const VENDOR_ORDERS_DEFAULT_DAYS = 15;

/** Max orders returned per list page (use `cursor` for the next page). */
export const VENDOR_ORDERS_MAX_LIMIT = 200;

/** Default page size for GET /orders. */
export const VENDOR_ORDERS_DEFAULT_LIMIT = 50;

/** Vendor posts AWB when they ship an order. */
export const vendorShipmentUpdateSchema = z.object({
  /**
   * Human order number (`OC10001`) or internal UUID.
   * Required when calling POST /vendors/orange-county/shipment (no path id).
   * Optional on POST .../orders/{orderId}/shipment (must match path when set).
   */
  orderNumber: z.string().min(1).max(80).optional(),
  courierName: z.string().trim().min(1).max(80),
  awb: z.string().trim().min(3).max(80),
});

export type VendorShipmentUpdate = z.infer<typeof vendorShipmentUpdateSchema>;

/** Vendor posts tracking status changes. */
export const vendorTrackingUpdateSchema = z
  .object({
    orderNumber: z.string().min(1).max(80).optional(),
    /** Preferred field name from Orange County. */
    currentShipmentStatus: z.string().trim().min(1).max(80).optional(),
    /** Alias of currentShipmentStatus (older docs). */
    currentStatus: z.string().trim().min(1).max(80).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.currentShipmentStatus?.trim() && !value.currentStatus?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currentShipmentStatus (or currentStatus) is required",
        path: ["currentShipmentStatus"],
      });
    }
  })
  .transform((value) => ({
    orderNumber: value.orderNumber,
    currentStatus: (value.currentShipmentStatus || value.currentStatus || "").trim(),
    currentShipmentStatus: (value.currentShipmentStatus || value.currentStatus || "").trim(),
    note: value.note,
  }));

export type VendorTrackingUpdate = z.infer<typeof vendorTrackingUpdateSchema>;
