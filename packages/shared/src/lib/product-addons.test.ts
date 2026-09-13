import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCT_ADDONS,
  cartAddonSignature,
  cartLineUnitTotal,
  getProductAddon,
  productAllowsAddons,
  resolveProductAddons,
  resolveProductAddonsFromIds,
  sumAddonPrices,
} from "./product-addons";
import { VENDOR_ORANGE_COUNTY, VENDOR_CJ_DROPSHIPPING, VENDOR_EPROLO, VENDOR_SPICYCORNER } from "../constants";

describe("product-addons", () => {
  it("lists catalog with expected prices", () => {
    assert.equal(PRODUCT_ADDONS.length, 9);
    assert.equal(getProductAddon("kaju-katli-200g"), undefined);
    assert.equal(getProductAddon("badam-100g")?.priceUsd, 9);
    assert.equal(getProductAddon("hershey-2pc")?.priceUsd, 5);
    assert.equal(getProductAddon("lindt-5pc")?.priceUsd, 6);
    assert.equal(getProductAddon("ferrero-3pc")?.priceUsd, 5);
  });

  it("allows addons only for non–Orange County products", () => {
    assert.equal(productAllowsAddons({}), true);
    assert.equal(productAllowsAddons({ vendorSlug: undefined }), true);
    assert.equal(productAllowsAddons({ vendorSlug: VENDOR_ORANGE_COUNTY }), false);
    assert.equal(productAllowsAddons({ vendorSlug: VENDOR_CJ_DROPSHIPPING }), false);
    assert.equal(productAllowsAddons({ vendorSlug: VENDOR_EPROLO }), false);
    assert.equal(
      productAllowsAddons({ vendorSlug: VENDOR_SPICYCORNER, categorySlug: "gift-sets" }),
      false
    );
  });

  it("sums addon prices and line unit totals", () => {
    const addons = [
      { id: "badam-100g", name: "Badam", price: 9, quantity: 2 },
      { id: "hershey-2pc", name: "Hershey", price: 5, quantity: 1 },
    ];
    assert.equal(sumAddonPrices(addons), 23);
    assert.equal(cartLineUnitTotal({ price: 20, addons }), 43);
    assert.equal(cartLineUnitTotal({ price: 20 }), 20);
  });

  it("builds stable addon signatures including quantity", () => {
    assert.equal(cartAddonSignature([{ id: "b", quantity: 1 }, { id: "a", quantity: 2 }]), "a:2,b:1");
    assert.equal(cartAddonSignature([]), "");
    assert.notEqual(
      cartAddonSignature([{ id: "badam-100g", quantity: 1 }]),
      cartAddonSignature([{ id: "badam-100g", quantity: 2 }])
    );
  });

  it("resolves selections with quantities", () => {
    const ok = resolveProductAddons([
      { id: "pista-100g", quantity: 3 },
      { id: "hershey-2pc", quantity: 2 },
    ]);
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.addons.length, 2);
      assert.equal(ok.addons[0]!.id, "hershey-2pc");
      assert.equal(ok.addons[0]!.quantity, 2);
      assert.equal(ok.addons[1]!.quantity, 3);
    }
    const fromIds = resolveProductAddonsFromIds(["pista-100g", "hershey-2pc"]);
    assert.equal(fromIds.ok, true);
    if (fromIds.ok) {
      assert.equal(fromIds.addons.every((a) => a.quantity === 1), true);
    }
    const bad = resolveProductAddons([{ id: "not-a-real-addon", quantity: 1 }]);
    assert.equal(bad.ok, false);
    const tooMany = resolveProductAddons([{ id: "badam-100g", quantity: 99 }]);
    assert.equal(tooMany.ok, false);
  });
});
