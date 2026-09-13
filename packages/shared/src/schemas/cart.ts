import { z } from "zod";

export const cartItemAddonSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  /** Unit price in the cart line currency. */
  price: z.number().nonnegative(),
  quantity: z.number().int().min(1).default(1),
});

export const cartItemSchema = z.object({
  /** Stable cart line id (required for update/delete when add-ons differ). */
  lineId: z.string().min(1).optional(),
  productSlug: z.string(),
  name: z.string(),
  /** Plain-text product snippet for order emails (optional; older carts omit this). */
  description: z.string().max(200).optional(),
  price: z.number(),
  currency: z.enum(["USD", "INR"]),
  quantity: z.number().int().min(1),
  image: z.string().optional(),
  /** Copied from product at add-to-cart for vendor order feeds. */
  vendorSlug: z.string().min(1).max(80).optional(),
  /**
   * Snapshot of product.vendorCost at add-to-cart (USD wholesale).
   * Used for vendor payouts so catalog price changes do not rewrite history.
   */
  vendorCost: z.number().nonnegative().optional(),
  sku: z.string().optional(),
  /** CJ product id snapshot (fulfillment). */
  cjPid: z.string().min(1).max(80).optional(),
  /** CJ variant id for this cart line. */
  cjVid: z.string().min(1).max(80).optional(),
  /** Human variant label, e.g. Black-XL. */
  variantKey: z.string().max(120).optional(),
  /** Copied from product — flash / fixed deals are not coupon-eligible. */
  couponExcluded: z.boolean().optional(),
  /** Optional SpicyCorner dry-fruit / chocolate extras on this line. */
  addons: z.array(cartItemAddonSchema).max(20).optional(),
  /** Hamper swaps (same bundle price) plus paid extra add-ons. */
  hamperCustomization: z
    .object({
      excludedSlugs: z.array(z.string().min(1)).max(40).default([]),
      replacements: z
        .array(
          z.object({
            fromSlug: z.string().min(1),
            toSlug: z.string().min(1),
          })
        )
        .max(40)
        .default([]),
      extraSlugs: z.array(z.string().min(1)).max(20).default([]),
    })
    .optional(),
});

const addToCartAddonSchema = z.union([
  z.string().min(1).max(80),
  z.object({
    id: z.string().min(1).max(80),
    quantity: z.number().int().min(1).max(10).default(1),
  }),
]);

export const addToCartSchema = z.object({
  productSlug: z.string(),
  quantity: z.number().int().min(1).default(1),
  name: z.string().max(120).optional(),
  email: z.string().max(254).optional(),
  phone: z.string().max(40).optional(),
  /**
   * Product add-ons: catalog ids and/or `{ id, quantity }` (server fills name/price).
   * Plain string ids still accepted (= quantity 1).
   */
  addons: z.array(addToCartAddonSchema).max(20).optional(),
  /** Optional CJ variant when the product has multiple SKUs. */
  cjVid: z.string().min(1).max(80).optional(),
  hamperCustomization: z
    .object({
      excludedSlugs: z.array(z.string().min(1)).max(40).default([]),
      replacements: z
        .array(
          z.object({
            fromSlug: z.string().min(1),
            toSlug: z.string().min(1),
          })
        )
        .max(40)
        .default([]),
      extraSlugs: z.array(z.string().min(1)).max(20).default([]),
    })
    .optional(),
});

export const cartSchema = z.object({
  items: z.array(cartItemSchema).default([]),
  updatedAt: z.string(),
});

export type CartItemAddon = z.infer<typeof cartItemAddonSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
