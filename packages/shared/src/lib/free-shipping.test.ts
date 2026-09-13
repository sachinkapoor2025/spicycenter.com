import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BELOW_THRESHOLD_SHIPPING_USD,
  FREE_SHIPPING_MIN_SUBTOTAL_USD,
  REDUCED_SHIPPING_USD,
  quoteAddressShipmentShipping,
  quoteFreeShippingThreshold,
  quoteShipmentsShipping,
  shippingBandForSubtotalUsd,
} from "./free-shipping";

describe("shippingBandForSubtotalUsd", () => {
  it("maps cart value onto the published fee table", () => {
    assert.equal(shippingBandForSubtotalUsd(0)?.feeUsd, 10);
    assert.equal(shippingBandForSubtotalUsd(9.99)?.feeUsd, 10);
    assert.equal(shippingBandForSubtotalUsd(10)?.feeUsd, 8);
    assert.equal(shippingBandForSubtotalUsd(19.99)?.feeUsd, 8);
    assert.equal(shippingBandForSubtotalUsd(20)?.feeUsd, 6);
    assert.equal(shippingBandForSubtotalUsd(29.99)?.feeUsd, 6);
    assert.equal(shippingBandForSubtotalUsd(30)?.feeUsd, 4);
    assert.equal(shippingBandForSubtotalUsd(39.99)?.feeUsd, 4);
    assert.equal(shippingBandForSubtotalUsd(40)?.feeUsd, 2);
    assert.equal(shippingBandForSubtotalUsd(48.99)?.feeUsd, 2);
    assert.equal(shippingBandForSubtotalUsd(49), null);
    assert.equal(shippingBandForSubtotalUsd(80), null);
  });
});

describe("quoteFreeShippingThreshold", () => {
  it("charges $10 when cart is under $10", () => {
    const quote = quoteFreeShippingThreshold({
      subtotal: 3.99,
      currency: "USD",
      usdInrRate: 96,
    });
    assert.equal(quote.qualifiesForFreeShipping, false);
    assert.equal(quote.tier, "low");
    assert.equal(quote.charge, 10);
    assert.ok(Math.abs(quote.amountAwayFromFreeShipping - 45.01) < 0.001);
    assert.ok(Math.abs(quote.amountAwayFromReducedShipping - 6.01) < 0.001);
  });

  it("steps down through $8, $6, $4, then $2", () => {
    assert.equal(
      quoteFreeShippingThreshold({ subtotal: 10, currency: "USD", usdInrRate: 96 }).charge,
      8
    );
    assert.equal(
      quoteFreeShippingThreshold({ subtotal: 25, currency: "USD", usdInrRate: 96 }).charge,
      6
    );
    assert.equal(
      quoteFreeShippingThreshold({ subtotal: 35, currency: "USD", usdInrRate: 96 }).charge,
      4
    );
    const nearFree = quoteFreeShippingThreshold({
      subtotal: 40,
      currency: "USD",
      usdInrRate: 96,
    });
    assert.equal(nearFree.tier, "mid");
    assert.equal(nearFree.charge, REDUCED_SHIPPING_USD);
    assert.equal(nearFree.amountAwayFromReducedShipping, 0);
  });

  it("is free at exactly $49", () => {
    const quote = quoteFreeShippingThreshold({
      subtotal: FREE_SHIPPING_MIN_SUBTOTAL_USD,
      currency: "USD",
      usdInrRate: 96,
    });
    assert.equal(quote.qualifiesForFreeShipping, true);
    assert.equal(quote.charge, 0);
    assert.equal(quote.amountAwayFromFreeShipping, 0);
  });

  it("applies the same USD threshold for INR carts", () => {
    const rate = 100;
    const quote = quoteFreeShippingThreshold({
      subtotal: 600,
      currency: "INR",
      usdInrRate: rate,
    });
    assert.equal(quote.qualifiesForFreeShipping, false);
    assert.equal(quote.charge, Math.round(BELOW_THRESHOLD_SHIPPING_USD * rate));
    assert.equal(quote.thresholdInCurrency, FREE_SHIPPING_MIN_SUBTOTAL_USD * rate);
  });
});

describe("quoteShipmentsShipping", () => {
  it("applies tiers per delivery bucket", () => {
    const { totalCharge, perShipment } = quoteShipmentsShipping({
      shipmentSubtotals: [50, 12, 3],
      currency: "USD",
      usdInrRate: 96,
    });
    assert.equal(perShipment[0].charge, 0);
    assert.equal(perShipment[1].charge, 8);
    assert.equal(perShipment[2].charge, 10);
    assert.equal(totalCharge, 18);
  });
});

describe("quoteAddressShipmentShipping", () => {
  it("charges per vendor when SpicyCorner and Orange County share an address", () => {
    const { totalCharge, perVendor } = quoteAddressShipmentShipping({
      items: [
        { price: 3.99, quantity: 1 },
        { price: 3.99, quantity: 1, vendorSlug: "orange-county" },
        { price: 50, quantity: 1, vendorSlug: "orange-county" },
      ],
      currency: "USD",
      usdInrRate: 96,
    });
    // SpicyCorner $3.99 → $10; Orange County $53.99 → free
    assert.equal(perVendor.length, 2);
    assert.equal(totalCharge, 10);
  });

  it("charges $10 twice when both vendors are under $10", () => {
    const { totalCharge } = quoteAddressShipmentShipping({
      items: [
        { price: 3.99, quantity: 1 },
        { price: 3, quantity: 1, vendorSlug: "orange-county" },
      ],
      currency: "USD",
      usdInrRate: 96,
    });
    assert.equal(totalCharge, 20);
  });

  it("charges $8 when a vendor bucket is $10–$19.99", () => {
    const { totalCharge } = quoteAddressShipmentShipping({
      items: [{ price: 12, quantity: 1 }],
      currency: "USD",
      usdInrRate: 96,
    });
    assert.equal(totalCharge, 8);
  });

  it("charges flat $0.99 shipping for flash-combo-only buckets", () => {
    const { totalCharge, perVendor } = quoteAddressShipmentShipping({
      items: [
        {
          price: 12.97,
          quantity: 1,
          productSlug: "blue-beads-om-pista-flash-combo",
        },
      ],
      currency: "USD",
      usdInrRate: 96,
    });
    assert.equal(totalCharge, 0.99);
    assert.equal(perVendor[0]?.charge, 0.99);
  });

  it("counts add-ons toward free-shipping threshold", () => {
    const { totalCharge } = quoteAddressShipmentShipping({
      items: [
        {
          price: 3.99,
          quantity: 1,
          addons: [{ price: 46, quantity: 1 }],
        },
      ],
      currency: "USD",
      usdInrRate: 96,
    });
    // $3.99 + $46 addon = $49.99 → free
    assert.equal(totalCharge, 0);
  });
});
