import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  cjFulfillOrderSchema,
  cjFreightQuoteSchema,
  cjImportspiceSchema,
  cjImportProductsSchema,
  cjSaveApiKeySchema,
  cjSearchQuerySchema,
  VENDOR_CJ_DROPSHIPPING,
} from "@spicycorner/shared";
import { requireAdmin } from "../lib/auth";
import { accepted, badGateway, badRequest, forbidden, notFound, ok, serverError } from "../lib/response";
import {
  CjApiError,
  cjFreightCalculate,
  cjGetBalance,
  cjGetCategories,
  cjGetProduct,
  cjListMyProducts,
  cjListOrders,
  cjSetWebhook,
  cjTrackInfo,
  cjWarehouseList,
  getCjConnectionStatus,
  saveCjApiKey,
} from "../lib/cj-dropshipping";
import { catalogPreviewFromList, listImportedCjPids } from "../lib/cj-import";
import {
  enqueueCjImportJob,
  fetchCjAdminCatalogPage,
  getCjImportJob,
  listCjImportJobs,
} from "../lib/cj-import-job";
import { fulfillOrderWithCj } from "../lib/cj-fulfill";

function readJsonBody(event: APIGatewayProxyEventV2): unknown {
  try {
    return JSON.parse(event.body ?? "{}");
  } catch {
    return null;
  }
}

function handleCjError(err: unknown) {
  if (err instanceof CjApiError) {
    return badGateway(err.message);
  }
  return serverError(err instanceof Error ? err.message : "CJ request failed");
}

export async function getCjStatus(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  try {
    const status = await getCjConnectionStatus();
    return ok({ ...status, vendorSlug: VENDOR_CJ_DROPSHIPPING });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function saveCjKey(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const parsed = cjSaveApiKeySchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  try {
    await saveCjApiKey(parsed.data.apiKey);
    const status = await getCjConnectionStatus();
    return ok({ saved: true, ...status });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function listCjCategories(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  try {
    const data = await cjGetCategories();
    return ok({ categories: data });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function searchCjProducts(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const parsed = cjSearchQuerySchema.safeParse(event.queryStringParameters ?? {});
  if (!parsed.success) return badRequest(parsed.error.message);
  try {
    const data = await fetchCjAdminCatalogPage({
      keyWord: parsed.data.keyWord || "spice",
      page: parsed.data.page,
      size: parsed.data.size,
      categoryId: parsed.data.categoryId,
      countryCode: parsed.data.countryCode,
    });
    const imported = await listImportedCjPids();
    const products = data.products.map((row) => ({
      ...catalogPreviewFromList(row),
      alreadyImported: imported.has(row.id || ""),
    }));
    return ok({
      products,
      page: data.page,
      pageSize: data.pageSize,
      totalRecords: data.totalRecords,
      totalPages: data.totalPages,
    });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function getCjProduct(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const pid = event.pathParameters?.pid;
  if (!pid) return badRequest("pid required");
  try {
    const product = await cjGetProduct(pid);
    return ok({ product });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function importCjCatalog(event: APIGatewayProxyEventV2) {
  const actor = requireAdmin(event);
  if (!actor) return forbidden();
  const body = readJsonBody(event);
  if (body == null) return badRequest("Invalid JSON body");
  const parsed = cjImportProductsSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid import request");
  }
  try {
    const job = await enqueueCjImportJob({
      pids: parsed.data.pids,
      names: parsed.data.names,
      createdBy: actor.email,
      source: "selected",
      categorySlug: parsed.data.categorySlug,
      published: parsed.data.published,
    });
    return accepted({
      jobId: job.jobId,
      status: job.status,
      counts: job.counts,
      queued: job.counts.pending,
      skipped: job.counts.skipped,
    });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function importspiceCatalog(event: APIGatewayProxyEventV2) {
  const actor = requireAdmin(event);
  if (!actor) return forbidden();
  const parsed = cjImportspiceSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  try {
    const data = await fetchCjAdminCatalogPage({
      keyWord: parsed.data.keyWord || "spice",
      page: parsed.data.page,
      size: parsed.data.size,
    });
    const names: Record<string, string> = {};
    const pids = data.products
      .map((row) => {
        if (!row.id) return "";
        if (row.nameEn) names[row.id] = row.nameEn;
        return row.id;
      })
      .filter(Boolean);
    const job = await enqueueCjImportJob({
      pids,
      names,
      createdBy: actor.email,
      source: "spice",
      keyword: parsed.data.keyWord || "spice",
      categorySlug: parsed.data.categorySlug,
      published: parsed.data.published,
    });
    return accepted({
      jobId: job.jobId,
      status: job.status,
      counts: job.counts,
      queued: job.counts.pending,
      skipped: job.counts.skipped,
      page: data.page,
      totalPages: data.totalPages,
      searched: pids.length,
    });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function listCjImportJobsHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  try {
    const jobs = await listCjImportJobs();
    return ok({ jobs });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function getCjImportJobHandler(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const jobId = event.pathParameters?.jobId;
  if (!jobId) return badRequest("jobId required");
  try {
    const job = await getCjImportJob(jobId);
    if (!job) return notFound("Import job not found");
    return ok({ job });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function listCjMyProducts(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  try {
    const q = event.queryStringParameters ?? {};
    const data = await cjListMyProducts({
      pageNum: q.page ? Number(q.page) : 1,
      pageSize: q.size ? Number(q.size) : 20,
      keyword: q.keyword,
    });
    return ok({ data });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function listCjWarehouses(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  try {
    const data = await cjWarehouseList();
    return ok({ warehouses: data });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function getCjBalance(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  try {
    const data = await cjGetBalance();
    return ok({ balance: data });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function quoteCjFreight(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const parsed = cjFreightQuoteSchema.safeParse(JSON.parse(event.body ?? "{}"));
  if (!parsed.success) return badRequest(parsed.error.message);
  try {
    const data = await cjFreightCalculate(parsed.data);
    return ok({ quotes: data });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function listCjOrders(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  try {
    const q = event.queryStringParameters ?? {};
    const data = await cjListOrders({
      pageNum: q.page ? Number(q.page) : 1,
      pageSize: q.size ? Number(q.size) : 20,
    });
    return ok({ data });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function fulfillCjOrder(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const parsed = cjFulfillOrderSchema.safeParse({
    ...JSON.parse(event.body ?? "{}"),
    orderId: event.pathParameters?.orderId,
  });
  if (!parsed.success) return badRequest(parsed.error.message);
  try {
    const result = await fulfillOrderWithCj(parsed.data.orderId, {
      payType: parsed.data.payType,
      logisticName: parsed.data.logisticName,
      fromCountryCode: parsed.data.fromCountryCode,
    });
    if (!result.ok) return badGateway(result.message);
    return ok(result);
  } catch (err) {
    return handleCjError(err);
  }
}

export async function getCjTracking(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const trackNumber = event.queryStringParameters?.trackNumber;
  if (!trackNumber) return badRequest("trackNumber required");
  try {
    const data = await cjTrackInfo(trackNumber);
    return ok({ tracking: data });
  } catch (err) {
    return handleCjError(err);
  }
}

export async function enableCjWebhook(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const site = (process.env.SITE_URL || "https://www.spicycenter.com").replace(/\/$/, "");
  const apiBase = (process.env.PUBLIC_API_URL || process.env.LOCAL_API_URL || "").replace(/\/$/, "");
  const callback =
    JSON.parse(event.body ?? "{}").callbackUrl ||
    (apiBase ? `${apiBase}/webhooks/cj` : `${site}/api/webhooks/cj`);
  try {
    await cjSetWebhook(callback);
    return ok({ enabled: true, callbackUrl: callback });
  } catch (err) {
    return handleCjError(err);
  }
}

/** Public CJ webhook — product/stock/order/logistics notifications. */
export async function cjWebhook(event: APIGatewayProxyEventV2) {
  try {
    const payload = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
    console.info("CJ webhook", {
      type: payload.type ?? payload.businessType ?? payload.msgType,
      orderId: payload.orderId,
      pid: payload.pid ?? payload.productId,
    });
  } catch {
    console.warn("CJ webhook: invalid JSON");
  }
  return ok({ received: true });
}
