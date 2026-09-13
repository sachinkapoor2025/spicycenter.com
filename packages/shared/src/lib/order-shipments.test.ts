import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOrderShipments, validateShipmentsPartitionCart } from "./order-shipments";
import { BELOW_THRESHOLD_SHIPPING_USD } from "./free-shipping";
import type { CartItem } from "../schemas/cart";
import type { CheckoutShipment } from "../schemas/order";

const addr = (name: string) => ({
  name,
  line1: "1 Main St",
  city: "Los Angeles",
  state: "CA",
  postalCode: "90001",
  country: "US",
  phone: "+15551234567",
  email: "a@example.com",
  senderName: "Sister",
  senderMessage: "Happy Raksha Bandhan to you my dear brother!",
});

describe("buildOrderShipments", () => {
  it("charges shipping on deliveries below the $49 free threshold", () => {
    const cart: CartItem[] = [
      { productSlug: "a", name: "A", price: 50, currency: "USD", quantity: 1 },
      { productSlug: "b", name: "B", price: 12, currency: "USD", quantity: 1 },
      { productSlug: "c", name: "C", price: 3, currency: "USD", quantity: 1 },
    ];
    const shipments: CheckoutShipment[] = [
      { shippingAddress: addr("One"), items: [{ productSlug: "a", quantity: 1 }] },
      { shippingAddress: addr("Two"), items: [{ productSlug: "b", quantity: 1 }] },
      { shippingAddress: addr("Three"), items: [{ productSlug: "c", quantity: 1 }] },
    ];
    const built = buildOrderShipments({
      cartItems: cart,
      checkoutShipments: shipments,
      currency: "USD",
      usdInrRate: 96,
    });
    assert.ok(!("error" in built));
    if ("error" in built) return;
    assert.equal(built.shipments[0].shipping, 0);
    assert.equal(built.shipments[1].shipping, 8);
    assert.equal(built.shipments[2].shipping, BELOW_THRESHOLD_SHIPPING_USD);
    assert.equal(built.shippingTotal, 8 + BELOW_THRESHOLD_SHIPPING_USD);
  });

  it("charges per vendor when mixed vendors share one address", () => {
    const cart: CartItem[] = [
      { productSlug: "a", name: "A", price: 2.75, currency: "USD", quantity: 1 },
      {
        productSlug: "hamper",
        name: "Hamper",
        price: 2.75,
        currency: "USD",
        quantity: 1,
        vendorSlug: "orange-county",
      },
    ];
    const shipments: CheckoutShipment[] = [
      {
        shippingAddress: addr("One"),
        items: [
          { productSlug: "a", quantity: 1 },
          { productSlug: "hamper", quantity: 1 },
        ],
      },
    ];
    const built = buildOrderShipments({
      cartItems: cart,
      checkoutShipments: shipments,
      currency: "USD",
      usdInrRate: 96,
    });
    assert.ok(!("error" in built));
    if ("error" in built) return;
    assert.equal(built.shippingTotal, BELOW_THRESHOLD_SHIPPING_USD * 2);
    assert.equal(built.shipments[0].shipping, BELOW_THRESHOLD_SHIPPING_USD * 2);
  });

  it("rejects incomplete partitions", () => {
    const cart: CartItem[] = [
      { productSlug: "a", name: "A", price: 10, currency: "USD", quantity: 2 },
    ];
    const err = validateShipmentsPartitionCart(cart, [
      { shippingAddress: addr("One"), items: [{ productSlug: "a", quantity: 1 }] },
    ]);
    assert.ok(err);
  });
});
