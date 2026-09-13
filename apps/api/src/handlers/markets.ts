import { v4 as uuidv4 } from "uuid";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  assignFulfillment,
  createMarketSchema,
  createVendorSchema,
  createWarehouseSchema,
  marketByCountry,
  productAvailableInCountry,
  publicMarketContact,
  serviceabilityRequestSchema,
  updateMarketSchema,
  updateVendorSchema,
  updateWarehouseSchema,
  upsertInventoryListingSchema,
  validatePostalCode,
  vendorRecordKeys,
  warehouseKeys,
  inventoryListingKeys,
  type InventoryListing,
  type Market,
  type VendorRecord,
  type Warehouse,
} from "@spicycorner/shared";
import { requireAdmin, resolveStaffActor } from "../lib/auth";
import { docClient, CONFIG_TABLE } from "../lib/db";
import {
  getNetworkSnapshot,
  listInventoryListings,
  listMarkets,
  listVendors,
  listWarehouses,
  saveInventoryListing,
  saveMarket,
  saveVendor,
  saveWarehouse,
  writeAuditLog,
} from "../lib/markets-store";
import { ok, created, badRequest, forbidden, notFound } from "../lib/response";

function slugifyId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function publicMarketsPayload(markets: Market[], warehouses: Warehouse[]) {
  return {
    markets: markets
      .filter((m) => m.active)
      .map((m) => ({
        countryCode: m.countryCode,
        name: m.name,
        slug: m.slug,
        locale: m.locale,
        currency: m.currency,
        checkoutCurrency: m.checkoutCurrency,
        flagEmoji: m.flagEmoji,
        postalLabel: m.postalLabel,
        hreflang: m.hreflang,
        allowInternationalFallback: m.allowInternationalFallback,
        contact: publicMarketContact(m),
      })),
    warehouses: warehouses
      .filter((w) => w.active)
      .map((w) => ({
        warehouseId: w.warehouseId,
        name: w.name,
        city: w.city,
        countryCode: w.countryCode,
        fulfillmentEnabled: w.fulfillmentEnabled,
      })),
  };
}

export async function getPublicMarkets() {
  const { markets, warehouses } = await getNetworkSnapshot();
  return ok(publicMarketsPayload(markets, warehouses));
}

export async function checkServiceability(event: APIGatewayProxyEventV2) {
  const qs = event.queryStringParameters ?? {};
  const parsed = serviceabilityRequestSchema.safeParse({
    countryCode: qs.countryCode ?? qs.country,
    postalCode: qs.postalCode ?? qs.postal,
    productSlug: qs.productSlug,
  });
  if (!parsed.success) return badRequest(parsed.error.message);

  const { warehouses, vendors, markets, listings } = await getNetworkSnapshot();
  const country = parsed.data.countryCode;
  const postal = parsed.data.postalCode;
  const postalCheck = postal ? validatePostalCode(country, postal) : { valid: true, normalized: "" };
  const market = marketByCountry(markets, country);
  const assignment = assignFulfillment({
    items: [{ productSlug: parsed.data.productSlug ?? "_catalog" }],
    destinationCountry: country,
    postalCode: postal,
    warehouses,
    vendors,
    listings,
  });
  const warehouse = warehouses.find((w) => w.warehouseId === assignment.assignedWarehouseId);
  const productOk = parsed.data.productSlug
    ? productAvailableInCountry({
        productSlug: parsed.data.productSlug,
        countryCode: country,
        listings,
      })
    : true;

  const deliverable = Boolean(warehouse) && productOk && (market?.active ?? true);

  return ok({
    deliverable,
    postalValid: postalCheck.valid,
    postalMessage: postalCheck.message,
    market: market
      ? {
          countryCode: market.countryCode,
          name: market.name,
          currency: market.currency,
          checkoutCurrency: market.checkoutCurrency,
          postalLabel: market.postalLabel,
          contact: publicMarketContact(market),
        }
      : null,
    warehouse: warehouse
      ? {
          warehouseId: warehouse.warehouseId,
          name: warehouse.name,
          city: warehouse.city,
          countryCode: warehouse.countryCode,
          estimatedDeliveryDays: assignment.splits?.[0]?.estimatedDeliveryDays,
        }
      : null,
    routingReason: assignment.routingReason,
    productAvailable: productOk,
  });
}

export async function getAdminSession(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();
  const vendors = actor.vendorSlug ? await listVendors() : [];
  const vendor = actor.vendorSlug ? vendors.find((v) => v.slug === actor.vendorSlug) : undefined;
  return ok({
    email: actor.email,
    isAdmin: actor.isAdmin,
    isSuperAdmin: actor.isSuperAdmin,
    isVendor: actor.isVendor,
    vendorSlug: actor.vendorSlug,
    vendor: vendor
      ? { vendorId: vendor.vendorId, slug: vendor.slug, name: vendor.name, warehouseIds: vendor.warehouseIds }
      : null,
  });
}

export async function listAdminWarehouses(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();
  const [warehouses, vendors] = await Promise.all([listWarehouses(), listVendors()]);
  const vendor = actor.vendorSlug ? vendors.find((v) => v.slug === actor.vendorSlug) : undefined;
  const visible = actor.isAdmin
    ? warehouses
    : warehouses.filter(
        (w) =>
          w.vendorId === actor.vendorSlug || vendor?.warehouseIds.includes(w.warehouseId)
      );
  return ok({ warehouses: visible });
}

export async function createAdminWarehouse(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return forbidden();
  const parsed = createWarehouseSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  const warehouseId = slugifyId(parsed.data.warehouseCode) || uuidv4();
  const existing = (await listWarehouses()).some((w) => w.warehouseId === warehouseId);
  if (existing) return badRequest("Warehouse code already exists");
  const saved = await saveWarehouse({ ...parsed.data, warehouseId });
  await writeAuditLog({
    action: "warehouse_created",
    actorEmail: auth.email,
    warehouseId,
  });
  return created({ warehouse: saved });
}

export async function updateAdminWarehouse(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return forbidden();
  const warehouseId = event.pathParameters?.warehouseId;
  if (!warehouseId) return badRequest("warehouseId required");
  const current = (await listWarehouses()).find((w) => w.warehouseId === warehouseId);
  if (!current) return notFound("Warehouse not found");
  const parsed = updateWarehouseSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  const saved = await saveWarehouse({ ...current, ...parsed.data, warehouseId });
  await writeAuditLog({
    action: "warehouse_updated",
    actorEmail: auth.email,
    warehouseId,
  });
  return ok({ warehouse: saved });
}

export async function deleteAdminWarehouse(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return forbidden();
  const warehouseId = event.pathParameters?.warehouseId;
  if (!warehouseId) return badRequest("warehouseId required");
  await docClient.send(
    new DeleteCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: warehouseKeys.pk(warehouseId), SK: warehouseKeys.sk() },
    })
  );
  await writeAuditLog({
    action: "warehouse_deleted",
    actorEmail: auth.email,
    warehouseId,
  });
  return ok({ deleted: true });
}

export async function listAdminVendors(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();
  const vendors = await listVendors();
  if (actor.isAdmin) return ok({ vendors });
  return ok({ vendors: vendors.filter((v) => v.slug === actor.vendorSlug) });
}

export async function createAdminVendor(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return forbidden();
  const parsed = createVendorSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  const vendorId = slugifyId(parsed.data.slug) || uuidv4();
  const existing = (await listVendors()).some((v) => v.vendorId === vendorId || v.slug === parsed.data.slug);
  if (existing) return badRequest("Vendor slug already exists");
  const saved = await saveVendor({ ...parsed.data, vendorId, slug: slugifyId(parsed.data.slug) });
  await writeAuditLog({
    action: "vendor_created",
    actorEmail: auth.email,
    vendorId,
  });
  return created({ vendor: saved });
}

export async function updateAdminVendor(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return forbidden();
  const vendorId = event.pathParameters?.vendorId;
  if (!vendorId) return badRequest("vendorId required");
  const current = (await listVendors()).find((v) => v.vendorId === vendorId);
  if (!current) return notFound("Vendor not found");
  const parsed = updateVendorSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  const saved = await saveVendor({ ...current, ...parsed.data, vendorId, slug: parsed.data.slug ?? current.slug });
  await writeAuditLog({
    action: "vendor_updated",
    actorEmail: auth.email,
    vendorId,
  });
  return ok({ vendor: saved });
}

export async function deleteAdminVendor(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return forbidden();
  const vendorId = event.pathParameters?.vendorId;
  if (!vendorId) return badRequest("vendorId required");
  await docClient.send(
    new DeleteCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: vendorRecordKeys.pk(vendorId), SK: vendorRecordKeys.sk() },
    })
  );
  await writeAuditLog({ action: "vendor_deleted", actorEmail: auth.email, vendorId });
  return ok({ deleted: true });
}

export async function listAdminMarkets(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  return ok({ markets: await listMarkets() });
}

export async function upsertAdminMarket(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return forbidden();
  const countryCode = event.pathParameters?.countryCode?.toUpperCase();
  const body = JSON.parse(event.body ?? "{}");
  const current = countryCode
    ? (await listMarkets()).find((m) => m.countryCode === countryCode)
    : undefined;

  if (current) {
    const parsed = updateMarketSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.message);
    const saved = await saveMarket({ ...current, ...parsed.data, countryCode: current.countryCode });
    return ok({ market: saved });
  }

  const parsed = createMarketSchema.safeParse({ ...body, ...(countryCode ? { countryCode } : {}) });
  if (!parsed.success) return badRequest(parsed.error.message);
  const saved = await saveMarket(parsed.data as Market);
  await writeAuditLog({
    action: "market_upserted",
    actorEmail: auth.email,
    details: saved.countryCode,
  });
  return ok({ market: saved });
}

export async function listAdminInventory(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();
  let listings = await listInventoryListings();
  if (actor.vendorSlug) listings = listings.filter((l) => l.vendorId === actor.vendorSlug);
  const warehouseId = event.queryStringParameters?.warehouseId;
  const productSlug = event.queryStringParameters?.productSlug;
  if (warehouseId) listings = listings.filter((l) => l.warehouseId === warehouseId);
  if (productSlug) listings = listings.filter((l) => l.productSlug === productSlug);
  return ok({ listings });
}

export async function upsertAdminInventory(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();
  const parsed = upsertInventoryListingSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  if (actor.vendorSlug && parsed.data.vendorId !== actor.vendorSlug) {
    return forbidden("Vendors can only update their own inventory.");
  }
  const listingId = `${parsed.data.productSlug}#${parsed.data.warehouseId}#${parsed.data.vendorId}`;
  const existing = (await listInventoryListings()).find((l) => l.listingId === listingId);
  const saved = await saveInventoryListing({
    ...(existing ?? {}),
    ...parsed.data,
    listingId,
  } as InventoryListing);
  await writeAuditLog({
    action: "inventory_changed",
    actorEmail: actor.email,
    vendorId: parsed.data.vendorId,
    warehouseId: parsed.data.warehouseId,
    details: parsed.data.productSlug,
  });
  return ok({ listing: saved });
}

export async function deleteAdminInventory(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();
  const listingId = event.pathParameters?.listingId;
  if (!listingId) return badRequest("listingId required");
  const existing = (await listInventoryListings()).find((l) => l.listingId === listingId);
  if (!existing) return notFound("Listing not found");
  if (actor.vendorSlug && existing.vendorId !== actor.vendorSlug) return forbidden();
  await docClient.send(
    new DeleteCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: inventoryListingKeys.pk(listingId), SK: inventoryListingKeys.sk() },
    })
  );
  return ok({ deleted: true });
}

export async function getAdminNetworkOverview(event: APIGatewayProxyEventV2) {
  const actor = await resolveStaffActor(event);
  if (!actor) return forbidden();
  const snapshot = await getNetworkSnapshot();
  if (actor.isAdmin) return ok(snapshot);
  const vendor = snapshot.vendors.find((v) => v.slug === actor.vendorSlug);
  return ok({
    warehouses: snapshot.warehouses.filter(
      (w) => w.vendorId === actor.vendorSlug || vendor?.warehouseIds.includes(w.warehouseId)
    ),
    vendors: snapshot.vendors.filter((v) => v.slug === actor.vendorSlug),
    markets: snapshot.markets,
    listings: snapshot.listings.filter((l) => l.vendorId === actor.vendorSlug),
  });
}
