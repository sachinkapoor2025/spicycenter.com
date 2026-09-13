import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  CJ_STOREFRONT_SHIP_COUNTRY_NAMES,
  isCjDropshippingProduct,
  normalizeCjFreightQuotes,
  productKeys,
  quoteFreeShippingThreshold,
  type CjStorefrontShipCountry,
  type Product,
  type ProductShippingResponse,
} from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE, now } from "./db";
import { cjFreightCalculate } from "./cj-dropshipping";

const CACHE_MS = 6 * 60 * 60 * 1000;
const inflight = new Map<string, Promise<ProductShippingResponse>>();

type FreightCacheItem = {
  methods: ProductShippingResponse["methods"];
  quotedAt: string;
};

function customerCharge(product: Product): { chargeUsd: number; label: string } {
  const quote = quoteFreeShippingThreshold({
    subtotal: product.price,
    currency: "USD",
    usdInrRate: 83,
  });
  if (quote.qualifiesForFreeShipping) {
    return { chargeUsd: 0, label: `Free on this item ($49+)` };
  }
  return {
    chargeUsd: quote.charge,
    label: `$${quote.charge.toFixed(2)} for this item (free at $49+)`,
  };
}

function emptyResponse(
  product: Product,
  dest: CjStorefrontShipCountry,
  quantity: number
): ProductShippingResponse {
  const pay = customerCharge(product);
  return {
    available: false,
    originCountry: "CN",
    destCountry: dest,
    destCountryName: CJ_STOREFRONT_SHIP_COUNTRY_NAMES[dest],
    quantity,
    methods: [],
    customerChargeUsd: pay.chargeUsd,
    customerChargeLabel: pay.label,
  };
}

async function readCache(slug: string, dest: string, vid: string): Promise<FreightCacheItem | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.freightSk(dest, vid) },
    })
  );
  const item = result.Item as FreightCacheItem | undefined;
  if (!item?.quotedAt || !Array.isArray(item.methods)) return null;
  if (Date.now() - Date.parse(item.quotedAt) > CACHE_MS) return null;
  return item;
}

async function writeCache(slug: string, dest: string, vid: string, methods: FreightCacheItem["methods"]) {
  const quotedAt = now();
  await docClient.send(
    new PutCommand({
      TableName: PRODUCTS_TABLE,
      Item: {
        PK: productKeys.pk(slug),
        SK: productKeys.freightSk(dest, vid),
        methods,
        quotedAt,
        endCountryCode: dest,
        vid,
      },
    })
  );
  return quotedAt;
}

async function quoteUncached(
  product: Product,
  dest: CjStorefrontShipCountry,
  vid: string,
  quantity: number
): Promise<ProductShippingResponse> {
  const pay = customerCharge(product);
  const base: ProductShippingResponse = {
    available: false,
    originCountry: "CN",
    destCountry: dest,
    destCountryName: CJ_STOREFRONT_SHIP_COUNTRY_NAMES[dest],
    vid,
    quantity,
    methods: [],
    customerChargeUsd: pay.chargeUsd,
    customerChargeLabel: pay.label,
  };

  const cached = await readCache(product.slug, dest, vid);
  if (cached) {
    return { ...base, available: cached.methods.length > 0, methods: cached.methods, quotedAt: cached.quotedAt };
  }

  const raw = await cjFreightCalculate({
    startCountryCode: "CN",
    endCountryCode: dest,
    products: [{ vid, quantity }],
  });
  const methods = normalizeCjFreightQuotes(raw);
  const quotedAt = await writeCache(product.slug, dest, vid, methods);
  return { ...base, available: methods.length > 0, methods, quotedAt };
}

export function checkoutOnlyShipping(
  product: Product,
  dest: CjStorefrontShipCountry,
  quantity = 1
): ProductShippingResponse {
  return emptyResponse(product, dest, quantity);
}

export async function quoteProductShipping(input: {
  product: Product;
  destCountry: CjStorefrontShipCountry;
  vid?: string;
  quantity?: number;
}): Promise<ProductShippingResponse> {
  const dest = input.destCountry;
  const quantity = input.quantity ?? 1;
  if (!isCjDropshippingProduct(input.product)) {
    return emptyResponse(input.product, dest, quantity);
  }

  const vid =
    input.vid ||
    input.product.cjVid ||
    input.product.cjVariants?.[0]?.vid ||
    "";
  if (!vid) return emptyResponse(input.product, dest, quantity);

  const key = `${input.product.slug}|${dest}|${vid}|${quantity}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const pending = quoteUncached(input.product, dest, vid, quantity).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}
