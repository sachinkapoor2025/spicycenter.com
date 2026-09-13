import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  DEFAULT_MARKETS,
  DEFAULT_VENDORS,
  DEFAULT_WAREHOUSES,
  auditLogKeys,
  inventoryListingKeys,
  marketKeys,
  vendorRecordKeys,
  warehouseKeys,
  type AuditLogEntry,
  type InventoryListing,
  type Market,
  type VendorRecord,
  type Warehouse,
} from "@spicycorner/shared";
import { docClient, CONFIG_TABLE, now } from "./db";

type Stored<T> = T & { PK: string; SK: string };

async function scanPrefix<T>(prefix: string): Promise<Stored<T>[]> {
  const items: Stored<T>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: CONFIG_TABLE,
        FilterExpression: "begins_with(PK, :p) AND SK = :sk",
        ExpressionAttributeValues: { ":p": prefix, ":sk": "META" },
        ExclusiveStartKey,
      })
    );
    items.push(...((result.Items ?? []) as Stored<T>[]));
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

function stripKeys<T extends { PK?: string; SK?: string }>(item: T): Omit<T, "PK" | "SK"> {
  const { PK: _pk, SK: _sk, ...rest } = item;
  return rest;
}

async function putItem(pk: string, item: Record<string, unknown>) {
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: { PK: pk, SK: "META", ...item },
    })
  );
}

let seededWarehouses = false;
let seededVendors = false;
let seededMarkets = false;

export async function seedDefaultNetworkIfEmpty(): Promise<void> {
  const timestamp = now();
  if (!seededWarehouses) {
    const warehouses = await scanPrefix<Warehouse>(warehouseKeys.pkPrefix());
    if (warehouses.length === 0) {
      for (const wh of DEFAULT_WAREHOUSES) {
        await putItem(warehouseKeys.pk(wh.warehouseId), { ...wh, createdAt: timestamp, updatedAt: timestamp });
      }
    }
    seededWarehouses = true;
  }
  if (!seededVendors) {
    const vendors = await scanPrefix<VendorRecord>(vendorRecordKeys.pkPrefix());
    if (vendors.length === 0) {
      for (const vendor of DEFAULT_VENDORS) {
        await putItem(vendorRecordKeys.pk(vendor.vendorId), {
          ...vendor,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
    seededVendors = true;
  }
  if (!seededMarkets) {
    const markets = await scanPrefix<Market>(marketKeys.pkPrefix());
    if (markets.length === 0) {
      for (const market of DEFAULT_MARKETS) {
        await putItem(marketKeys.pk(market.countryCode), {
          ...market,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
    seededMarkets = true;
  }
}

export async function listWarehouses(): Promise<Warehouse[]> {
  await seedDefaultNetworkIfEmpty();
  const items = await scanPrefix<Warehouse>(warehouseKeys.pkPrefix());
  if (items.length === 0) return DEFAULT_WAREHOUSES;
  return items.map((i) => stripKeys(i) as Warehouse).sort((a, b) => a.priority - b.priority);
}

export async function listVendors(): Promise<VendorRecord[]> {
  await seedDefaultNetworkIfEmpty();
  const items = await scanPrefix<VendorRecord>(vendorRecordKeys.pkPrefix());
  if (items.length === 0) return DEFAULT_VENDORS;
  return items.map((i) => stripKeys(i) as VendorRecord).sort((a, b) => a.priority - b.priority);
}

export async function listMarkets(): Promise<Market[]> {
  await seedDefaultNetworkIfEmpty();
  const items = await scanPrefix<Market>(marketKeys.pkPrefix());
  if (items.length === 0) return DEFAULT_MARKETS;
  return items.map((i) => stripKeys(i) as Market).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listInventoryListings(): Promise<InventoryListing[]> {
  const items = await scanPrefix<InventoryListing>(inventoryListingKeys.pkPrefix());
  return items.map((i) => stripKeys(i) as InventoryListing);
}

export async function saveWarehouse(warehouse: Warehouse): Promise<Warehouse> {
  const timestamp = now();
  const item: Warehouse = {
    ...warehouse,
    createdAt: warehouse.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await putItem(warehouseKeys.pk(item.warehouseId), item);
  return item;
}

export async function saveVendor(vendor: VendorRecord): Promise<VendorRecord> {
  const timestamp = now();
  const item: VendorRecord = {
    ...vendor,
    createdAt: vendor.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await putItem(vendorRecordKeys.pk(item.vendorId), item);
  return item;
}

export async function saveMarket(market: Market): Promise<Market> {
  const timestamp = now();
  const item: Market = {
    ...market,
    createdAt: market.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await putItem(marketKeys.pk(item.countryCode), item);
  return item;
}

export async function saveInventoryListing(listing: InventoryListing): Promise<InventoryListing> {
  const timestamp = now();
  const item: InventoryListing = {
    ...listing,
    createdAt: listing.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await putItem(inventoryListingKeys.pk(item.listingId), item);
  return item;
}

export async function writeAuditLog(entry: Omit<AuditLogEntry, "auditId" | "createdAt"> & { auditId?: string }) {
  const timestamp = now();
  const auditId = entry.auditId ?? `${timestamp}#${Math.random().toString(36).slice(2, 8)}`;
  const item: AuditLogEntry = { ...entry, auditId, createdAt: timestamp };
  await putItem(auditLogKeys.pk(auditId), item);
}

export async function findVendorByEmail(email: string): Promise<VendorRecord | undefined> {
  const needle = email.trim().toLowerCase();
  if (!needle) return undefined;
  const vendors = await listVendors();
  return vendors.find((v) => {
    if (!v.active) return false;
    if (v.userEmails.some((e) => e.trim().toLowerCase() === needle)) return true;
    return v.users.some((u) => u.active !== false && u.email.trim().toLowerCase() === needle);
  });
}

export async function getNetworkSnapshot() {
  const [warehouses, vendors, markets, listings] = await Promise.all([
    listWarehouses(),
    listVendors(),
    listMarkets(),
    listInventoryListings(),
  ]);
  return { warehouses, vendors, markets, listings };
}
