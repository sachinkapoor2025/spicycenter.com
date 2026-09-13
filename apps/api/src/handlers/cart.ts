import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  addToCartSchema,
  cartKeys,
  productKeys,
  applyCompetitivePriceReduction,
  cartLineUnitTotal,
  productAllowsAddons,
  resolveProductAddons,
  isFlashComboProduct,
  isFlashComboSaleActive,
  flashComboUnitPriceUsd,
  productUsesFixedStorefrontPrice,
  isGiftSetProduct,
  resolveHamperCustomization,
  hamperCustomizationSignature,
  cartLinesMatch,
  type Cart,
  type CartItem,
  type HamperCustomization,
  plainProductDescription,
} from "@spicycorner/shared";
import { docClient, CARTS_TABLE, PRODUCTS_TABLE, now, ttlInDays } from "../lib/db";
import { ok, badRequest, unauthorized } from "../lib/response";
import { getUserOrSessionKey, getSessionId } from "../lib/auth";
import { resolveProductImageUrl } from "../lib/images";
import { upsertSessionProfile } from "../lib/customer-profile";
import { ensureOrangeCountyProductInDb } from "../lib/orange-county-catalog";
import { ensureProductInDb } from "../lib/ensure-product";

/** Stale carts auto-expire after this many days (TTL). */
const CART_TTL_DAYS = 30;

function ensureLineIds(items: CartItem[]): CartItem[] {
  return items.map((item) =>
    item.lineId ? item : { ...item, lineId: uuidv4() }
  );
}

async function getCart(userKey: string): Promise<Cart & { createdAt?: string }> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CARTS_TABLE,
      Key: { PK: cartKeys.pk(userKey), SK: cartKeys.sk() },
    })
  );
  const raw = (result.Item as Cart & { createdAt?: string }) ?? { items: [], updatedAt: now() };
  return { ...raw, items: ensureLineIds(raw.items ?? []) };
}

/** Single Put — avoids a second Get on every cart write. */
async function saveCart(
  userKey: string,
  cart: Cart & { createdAt?: string },
  sessionId?: string
) {
  const timestamp = now();
  const createdAt = cart.createdAt ?? timestamp;
  const items = ensureLineIds(cart.items ?? []);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const value = items.reduce((sum, i) => sum + cartLineUnitTotal(i) * i.quantity, 0);

  await docClient.send(
    new PutCommand({
      TableName: CARTS_TABLE,
      Item: {
        PK: cartKeys.pk(userKey),
        SK: cartKeys.sk(),
        items,
        userKey,
        sessionId,
        createdAt,
        itemCount,
        value,
        currency: items[0]?.currency,
        updatedAt: timestamp,
        GSI1PK: cartKeys.gsi1pk(),
        GSI1SK: cartKeys.gsi1sk(timestamp),
        expiresAt: ttlInDays(CART_TTL_DAYS),
      },
    })
  );
  cart.items = items;
  cart.updatedAt = timestamp;
}

export async function getCartHandler(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const raw = await getCart(userKey);
  const items = (raw.items ?? []).map((item) => ({
    ...item,
    image: item.image ? resolveProductImageUrl(item.image) : item.image,
  }));
  // Persist backfilled lineIds so subsequent updates work.
  if ((raw.items ?? []).some((i) => !i.lineId)) {
    await saveCart(userKey, { ...raw, items }, getSessionId(event));
  }
  return ok({ cart: { items, updatedAt: raw.updatedAt ?? now() } });
}

export async function addToCart(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = addToCartSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const [productResult, cart] = await Promise.all([
    docClient.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(parsed.data.productSlug), SK: productKeys.sk() },
      })
    ),
    getCart(userKey),
  ]);

  // Storefront may show catalog fallback before DynamoDB import — upsert on first add.
  let productItem = productResult.Item as Record<string, unknown> | undefined;
  if (!productItem) {
    productItem = (await ensureProductInDb(parsed.data.productSlug)) ?? undefined;
  } else if (
    productItem.vendorSlug === "orange-county" ||
    productItem.categorySlug === "rakhi-hampers"
  ) {
    productItem =
      (await ensureOrangeCountyProductInDb(parsed.data.productSlug)) ?? productItem;
  }
  if (!productItem) return badRequest("Product not found");

  const product = productItem as {
    slug: string;
    name: string;
    description?: string;
    price: number;
    currency: "USD" | "INR";
    images?: string[];
    inventory: number;
    vendorSlug?: string;
    vendorCost?: number;
    sku?: string;
    couponExcluded?: boolean;
    tags?: string[];
    categorySlug?: string;
    cjPid?: string;
    cjVid?: string;
    cjVariants?: Array<{
      vid: string;
      sku?: string;
      key?: string;
      name?: string;
      image?: string;
      inventory?: number;
      price?: number;
      vendorCost?: number;
    }>;
    hamperContents?: Array<{ slug: string; name: string; image?: string; price?: number }>;
    hamperAddons?: Array<{ slug: string; name: string; image?: string; price: number }>;
  };

  const variants = product.cjVariants ?? [];
  const requestedVid = parsed.data.cjVid || product.cjVid;
  const variant = requestedVid ? variants.find((v) => v.vid === requestedVid) : undefined;
  if (requestedVid && variants.length && !variant) {
    return badRequest("Unknown product variant");
  }
  const lineInventory = variant?.inventory ?? product.inventory;
  if (lineInventory < parsed.data.quantity) {
    return badRequest("Insufficient inventory");
  }

  if (isFlashComboProduct(product.slug) && !isFlashComboSaleActive()) {
    return badRequest("This 24-hour flash offer has ended");
  }

  const requestedAddons = parsed.data.addons ?? [];
  const hamper = isGiftSetProduct(product);
  if (requestedAddons.length && !productAllowsAddons(product)) {
    return badRequest("Add-ons are not available for this product");
  }
  const resolved = resolveProductAddons(requestedAddons);
  if (!resolved.ok) return badRequest(resolved.error);
  let addons = resolved.addons;
  let hamperCustomization: HamperCustomization | undefined;
  if (hamper) {
    const hamperResolved = resolveHamperCustomization(
      {
        hamperContents: product.hamperContents,
        hamperAddons: product.hamperAddons,
        price: product.price,
      },
      parsed.data.hamperCustomization
    );
    if (!hamperResolved.ok) return badRequest(hamperResolved.error);
    hamperCustomization = hamperResolved.custom;
    addons = [...addons, ...hamperResolved.extras];
  }
  const hamperSig = hamperCustomizationSignature(hamperCustomization);

  // Vendor / hamper / flash fixed-price deals — do not stack competitive cuts.
  const skipCompetitive =
    Boolean(product.vendorSlug) ||
    product.categorySlug === "rakhi-hampers" ||
    product.categorySlug === "gift-sets" ||
    productUsesFixedStorefrontPrice(product);
  const basePrice = variant?.price ?? product.price;
  const unitPrice = isFlashComboProduct(product.slug)
    ? flashComboUnitPriceUsd()
    : skipCompetitive
      ? basePrice
      : applyCompetitivePriceReduction(basePrice, product.currency);
  const couponExcluded =
    Boolean(product.couponExcluded) || isFlashComboProduct(product.slug);
  const lineVendorCost = variant?.vendorCost ?? product.vendorCost;
  const lineSku = variant?.sku || product.sku;
  const lineImage = variant?.image || product.images?.[0];
  const variantLabel = variant?.key || variant?.name;
  const lineName = variantLabel ? `${product.name} (${variantLabel})` : product.name;

  const existingIdx = cart.items.findIndex(
    (i) =>
      i.productSlug === parsed.data.productSlug &&
      cartLinesMatch(i, {
        addons,
        hamperCustomization,
        cjVid: requestedVid,
      })
  );

  const description = plainProductDescription(product.description);
  const item: CartItem = {
    lineId: uuidv4(),
    productSlug: product.slug,
    name: lineName,
    price: unitPrice,
    currency: product.currency,
    quantity: parsed.data.quantity,
    image: resolveProductImageUrl(lineImage),
    ...(product.vendorSlug ? { vendorSlug: product.vendorSlug } : {}),
    ...(typeof lineVendorCost === "number" && lineVendorCost >= 0
      ? { vendorCost: lineVendorCost }
      : {}),
    ...(lineSku ? { sku: lineSku } : {}),
    ...(product.cjPid ? { cjPid: product.cjPid } : {}),
    ...(requestedVid ? { cjVid: requestedVid } : {}),
    ...(variant?.key ? { variantKey: variant.key } : {}),
    ...(couponExcluded ? { couponExcluded: true } : {}),
    ...(addons.length ? { addons } : {}),
    ...(hamperCustomization && hamperSig ? { hamperCustomization } : {}),
    ...(description ? { description } : {}),
  };

  if (existingIdx >= 0) {
    const newQty = cart.items[existingIdx].quantity + parsed.data.quantity;
    if (newQty > lineInventory) return badRequest("Insufficient inventory");
    cart.items[existingIdx].quantity = newQty;
    cart.items[existingIdx].price = item.price;
    if (addons.length) cart.items[existingIdx].addons = addons;
    else delete cart.items[existingIdx].addons;
    if (hamperCustomization && hamperSig) cart.items[existingIdx].hamperCustomization = hamperCustomization;
    else delete cart.items[existingIdx].hamperCustomization;
    if (!cart.items[existingIdx].lineId) cart.items[existingIdx].lineId = uuidv4();
    if (description && !cart.items[existingIdx].description) {
      cart.items[existingIdx].description = description;
    }
  } else {
    cart.items.push(item);
  }

  await saveCart(userKey, cart, getSessionId(event));

  const sessionId = getSessionId(event);
  if (sessionId && (parsed.data.name || parsed.data.email || parsed.data.phone)) {
    await upsertSessionProfile(sessionId, {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
    });
  }

  return ok({ cart });
}

export async function removeFromCart(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const lineId = event.pathParameters?.lineId ?? event.pathParameters?.productSlug;
  if (!lineId) return badRequest("Cart line id required");

  const cart = await getCart(userKey);
  const before = cart.items.length;
  cart.items = cart.items.filter(
    (i) => i.lineId !== lineId && i.productSlug !== lineId
  );
  if (cart.items.length === before) return badRequest("Item not in cart");
  await saveCart(userKey, cart, getSessionId(event));
  return ok({ cart });
}

export async function updateCartItem(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const lineId = event.pathParameters?.lineId ?? event.pathParameters?.productSlug;
  if (!lineId) return badRequest("Cart line id required");

  const body = JSON.parse(event.body ?? "{}");
  const quantity = Number(body.quantity);
  if (!quantity || quantity < 1) return badRequest("Valid quantity required");

  const cart = await getCart(userKey);
  const item =
    cart.items.find((i) => i.lineId === lineId) ??
    cart.items.find((i) => i.productSlug === lineId);
  if (!item) return badRequest("Item not in cart");

  const productSlug = item.productSlug;
  let product = (
    await docClient.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(productSlug), SK: productKeys.sk() },
      })
    )
  ).Item as { inventory: number; vendorSlug?: string; categorySlug?: string } | undefined;

  if (!product) {
    product =
      ((await ensureProductInDb(productSlug)) as {
        inventory: number;
        vendorSlug?: string;
        categorySlug?: string;
      } | null) ?? undefined;
  } else if (product.vendorSlug === "orange-county" || product.categorySlug === "rakhi-hampers") {
    product =
      ((await ensureOrangeCountyProductInDb(productSlug)) as {
        inventory: number;
        vendorSlug?: string;
        categorySlug?: string;
      } | null) ?? product;
  }
  if (!product) return badRequest("Product not found");
  if (quantity > product.inventory) return badRequest("Insufficient inventory");

  item.quantity = quantity;
  if (!item.lineId) item.lineId = uuidv4();
  await saveCart(userKey, cart, getSessionId(event));
  return ok({ cart });
}

export async function clearCartForUser(userKey: string) {
  await saveCart(userKey, { items: [], updatedAt: now() });
}

export async function clearCart(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  await clearCartForUser(userKey);
  return ok({ cart: { items: [] } });
}
