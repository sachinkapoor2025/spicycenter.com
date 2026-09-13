import { VENDOR_SPICYCORNER } from "../constants";
import { lineVendorKey, orderHasVendor } from "./order-vendors";

export type StaffActor = {
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isVendor: boolean;
  /** Resolved server-side from vendor user emails — never from the request body. */
  vendorSlug?: string;
};

export function isGlobalAdmin(actor: StaffActor | null | undefined): boolean {
  return Boolean(actor?.isAdmin);
}

export function vendorScopeSlug(actor: StaffActor | null | undefined): string | undefined {
  if (!actor) return undefined;
  if (actor.isAdmin) return undefined;
  if (actor.isVendor && actor.vendorSlug) return actor.vendorSlug;
  return undefined;
}

export function assertVendorOwnsVendorId(actor: StaffActor, vendorId: string): boolean {
  if (isGlobalAdmin(actor)) return true;
  if (!actor.vendorSlug) return false;
  return actor.vendorSlug === vendorId;
}

export function orderVisibleToActor(
  order: { vendorSlugs?: string[]; items?: Array<{ vendorSlug?: string | null }> },
  actor: StaffActor
): boolean {
  if (isGlobalAdmin(actor)) return true;
  if (!actor.vendorSlug) return false;
  return orderHasVendor(order, actor.vendorSlug);
}

export function productVisibleToActor(
  product: { vendorSlug?: string | null },
  actor: StaffActor
): boolean {
  if (isGlobalAdmin(actor)) return true;
  if (!actor.vendorSlug) return false;
  return lineVendorKey(product) === actor.vendorSlug;
}

export function warehouseVisibleToActor(
  warehouse: { vendorId?: string | null; warehouseId: string },
  actor: StaffActor,
  vendorWarehouseIds?: string[]
): boolean {
  if (isGlobalAdmin(actor)) return true;
  if (!actor.vendorSlug) return false;
  if (warehouse.vendorId && warehouse.vendorId === actor.vendorSlug) return true;
  if (vendorWarehouseIds?.includes(warehouse.warehouseId)) return true;
  return false;
}

export function redactOrderForVendor<T extends { items?: Array<{ vendorSlug?: string | null }> }>(
  order: T,
  vendorSlug: string
): T {
  const items = (order.items ?? []).filter((i) => lineVendorKey(i) === vendorSlug);
  return { ...order, items };
}

export function defaultVendorSlugForNewProduct(actor: StaffActor): string {
  if (!isGlobalAdmin(actor) && actor.vendorSlug) return actor.vendorSlug;
  return VENDOR_SPICYCORNER;
}
