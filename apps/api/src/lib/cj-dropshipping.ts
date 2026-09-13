import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { configKeys } from "@spicycorner/shared";
import { docClient, CONFIG_TABLE, now } from "./db";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const MIN_INTERVAL_MS = 1100;

export class CjApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly cjCode?: number,
    readonly requestId?: string
  ) {
    super(message);
    this.name = "CjApiError";
  }
}

type TokenRecord = {
  apiKey?: string;
  accessToken?: string;
  accessTokenExpiryDate?: string;
  refreshToken?: string;
  refreshTokenExpiryDate?: string;
  updatedAt?: string;
};

type CjEnvelope<T> = {
  code?: number;
  result?: boolean;
  success?: boolean;
  message?: string;
  data?: T;
  requestId?: string;
};

let lastCallAt = 0;
let tokenMemory: TokenRecord | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

function envApiKey(): string {
  return (process.env.CJ_API_KEY ?? "").trim();
}

async function loadTokenRecord(): Promise<TokenRecord> {
  if (tokenMemory?.accessToken) return tokenMemory;
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.cjDropshipping.pk, SK: configKeys.cjDropshipping.sk },
    })
  );
  tokenMemory = (result.Item as TokenRecord | undefined) ?? {};
  return tokenMemory;
}

async function saveTokenRecord(patch: TokenRecord): Promise<TokenRecord> {
  const current = await loadTokenRecord();
  const next: TokenRecord = {
    ...current,
    ...patch,
    updatedAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.cjDropshipping.pk,
        SK: configKeys.cjDropshipping.sk,
        ...next,
      },
    })
  );
  tokenMemory = next;
  return next;
}

function isExpired(iso?: string, skewMs = 60_000): boolean {
  if (!iso) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return true;
  return t - skewMs <= Date.now();
}

async function requestAccessToken(apiKey: string): Promise<TokenRecord> {
  await throttle();
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const json = (await res.json()) as CjEnvelope<{
    accessToken?: string;
    accessTokenExpiryDate?: string;
    refreshToken?: string;
    refreshTokenExpiryDate?: string;
  }>;
  if (!res.ok || json.result === false || !json.data?.accessToken) {
    throw new CjApiError(
      json.message || "CJ getAccessToken failed",
      res.status,
      json.code,
      json.requestId
    );
  }
  return saveTokenRecord({
    apiKey,
    accessToken: json.data.accessToken,
    accessTokenExpiryDate: json.data.accessTokenExpiryDate,
    refreshToken: json.data.refreshToken,
    refreshTokenExpiryDate: json.data.refreshTokenExpiryDate,
  });
}

async function refreshAccessToken(refreshToken: string): Promise<TokenRecord> {
  await throttle();
  const res = await fetch(`${CJ_BASE}/authentication/refreshAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const json = (await res.json()) as CjEnvelope<{
    accessToken?: string;
    accessTokenExpiryDate?: string;
    refreshToken?: string;
    refreshTokenExpiryDate?: string;
  }>;
  if (!res.ok || json.result === false || !json.data?.accessToken) {
    throw new CjApiError(
      json.message || "CJ refreshAccessToken failed",
      res.status,
      json.code,
      json.requestId
    );
  }
  return saveTokenRecord({
    accessToken: json.data.accessToken,
    accessTokenExpiryDate: json.data.accessTokenExpiryDate,
    refreshToken: json.data.refreshToken ?? refreshToken,
    refreshTokenExpiryDate: json.data.refreshTokenExpiryDate,
  });
}

export async function saveCjApiKey(apiKey: string): Promise<void> {
  tokenMemory = null;
  await requestAccessToken(apiKey.trim());
}

export async function getCjConnectionStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  apiKeyHint?: string;
  accessTokenExpiryDate?: string;
  message?: string;
}> {
  const stored = await loadTokenRecord();
  const apiKey = stored.apiKey || envApiKey();
  if (!apiKey) {
    return {
      configured: false,
      connected: false,
      message:
        "Paste a CJ API Key (My CJ → Authorization → API). Login email/password cannot call the API.",
    };
  }
  const hint = apiKey.length > 8 ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}` : "set";
  try {
    const token = await getAccessToken();
    return {
      configured: true,
      connected: Boolean(token),
      apiKeyHint: hint,
      accessTokenExpiryDate: (await loadTokenRecord()).accessTokenExpiryDate,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      apiKeyHint: hint,
      message: err instanceof Error ? err.message : "CJ authentication failed",
    };
  }
}

export async function getAccessToken(): Promise<string> {
  const stored = await loadTokenRecord();
  const apiKey = stored.apiKey || envApiKey();
  if (!apiKey) {
    throw new CjApiError(
      "CJ API key is not configured. Generate one in CJ Dropshipping (Apps → API → Add API) and paste it in Admin → CJ Dropshipping."
    );
  }

  if (stored.accessToken && !isExpired(stored.accessTokenExpiryDate)) {
    return stored.accessToken;
  }

  if (stored.refreshToken && !isExpired(stored.refreshTokenExpiryDate)) {
    try {
      const refreshed = await refreshAccessToken(stored.refreshToken);
      if (refreshed.accessToken) return refreshed.accessToken;
    } catch {
      // Fall through to a full token request.
    }
  }

  const minted = await requestAccessToken(apiKey);
  if (!minted.accessToken) throw new CjApiError("CJ did not return an access token");
  return minted.accessToken;
}

async function cjFetch<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options: { query?: Record<string, string | number | boolean | undefined | Array<string | number>>; body?: unknown } = {},
  retried = false
): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${CJ_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  await throttle();
  const res = await fetch(url.toString(), {
    method,
    headers: {
      "CJ-Access-Token": token,
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let json: CjEnvelope<T>;
  try {
    json = (await res.json()) as CjEnvelope<T>;
  } catch {
    throw new CjApiError(`CJ ${method} ${path} returned a non-JSON response`, res.status);
  }
  const authFailed = json.code === 1600001 || /auth/i.test(json.message ?? "");
  if (authFailed && !retried) {
    tokenMemory = { ...(await loadTokenRecord()), accessToken: undefined, accessTokenExpiryDate: undefined };
    await saveTokenRecord({ accessToken: "", accessTokenExpiryDate: "" });
    tokenMemory = { ...tokenMemory, accessToken: undefined };
    return cjFetch<T>(method, path, options, true);
  }

  if (!res.ok || json.result === false || json.success === false) {
    throw new CjApiError(
      json.message || `CJ ${method} ${path} failed`,
      res.status,
      json.code,
      json.requestId
    );
  }

  return json.data as T;
}

export type CjListProduct = {
  id?: string;
  nameEn?: string;
  sku?: string;
  spu?: string;
  bigImage?: string;
  sellPrice?: string | number;
  nowPrice?: string | number;
  discountPrice?: string | number;
  productSellPrice?: string | number;
  suggestSellPrice?: string | number;
  price?: string | number;
  variants?: Array<{ variantSellPrice?: string | number }>;
  categoryId?: string;
  threeCategoryName?: string;
  twoCategoryName?: string;
  oneCategoryName?: string;
  warehouseInventoryNum?: number;
  description?: string;
  deliveryCycle?: string;
};

export type CjListV2Data = {
  pageSize?: number;
  pageNumber?: number;
  totalRecords?: number;
  totalPages?: number;
  content?: Array<{
    productList?: CjListProduct[];
    relatedCategoryList?: Array<{ categoryId?: string; categoryName?: string }>;
    keyWord?: string;
  }>;
};

export type CjVariantRaw = {
  vid?: string;
  pid?: string;
  variantNameEn?: string;
  variantSku?: string;
  variantImage?: string;
  variantKey?: string;
  variantLength?: number;
  variantWidth?: number;
  variantHeight?: number;
  variantWeight?: number;
  variantSellPrice?: number;
  inventories?: Array<{
    countryCode?: string;
    totalInventory?: number;
    cjInventory?: number;
  }>;
};

export type CjProductDetail = {
  pid?: string;
  productNameEn?: string;
  productSku?: string;
  bigImage?: string;
  productImageSet?: string[];
  productVideo?: string[];
  productWeight?: string | number;
  packingWeight?: string | number;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  sellPrice?: string | number;
  variants?: CjVariantRaw[];
};

export async function cjListProductsV2(query: {
  keyWord?: string;
  page?: number;
  size?: number;
  categoryId?: string;
  countryCode?: string;
}): Promise<CjListV2Data> {
  return cjFetch<CjListV2Data>("GET", "/product/listV2", {
    query: {
      keyWord: query.keyWord,
      page: query.page ?? 1,
      size: query.size ?? 20,
      categoryId: query.categoryId,
      countryCode: query.countryCode,
    },
  });
}

export async function cjGetCategories(): Promise<unknown> {
  return cjFetch("GET", "/product/getCategory");
}

export async function cjGetProduct(pid: string): Promise<CjProductDetail> {
  const data = await cjFetch<CjProductDetail | CjProductDetail[]>("GET", "/product/query", {
    query: { pid, features: ["enable_video"] },
  });
  const product = Array.isArray(data) ? data[0] : data;
  if (!product || typeof product !== "object") {
    throw new CjApiError(`CJ product ${pid} was not found`);
  }
  return product;
}

export type CjProductVideo = {
  id?: string;
  videoId?: string;
  videoUrl?: string;
  coverURL?: string;
  duration?: number;
  videoState?: string;
};

export async function cjQueryVideosByProductId(productId: string): Promise<CjProductVideo[]> {
  const data = await cjFetch<CjProductVideo[] | { list?: CjProductVideo[] }>(
    "POST",
    "/product/queryVideosByProductId",
    { body: { productId } }
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.list)) return data.list;
  return [];
}

export async function cjAddToMyProduct(productId: string): Promise<boolean> {
  try {
    await cjFetch("POST", "/product/addToMyProduct", { body: { productId } });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/already/i.test(message) || /my product/i.test(message)) return true;
    throw err;
  }
}

export async function cjListMyProducts(query: { pageNum?: number; pageSize?: number; keyword?: string }) {
  return cjFetch("GET", "/product/myProduct/query", {
    query: {
      pageNum: query.pageNum ?? 1,
      pageSize: query.pageSize ?? 20,
      keyword: query.keyword,
    },
  });
}

export async function cjWarehouseList() {
  return cjFetch("GET", "/product/globalWarehouseList");
}

export async function cjGetBalance() {
  return cjFetch("GET", "/shopping/pay/getBalance");
}

export async function cjListOrders(query: { pageNum?: number; pageSize?: number }) {
  return cjFetch("GET", "/shopping/order/list", {
    query: {
      pageNum: query.pageNum ?? 1,
      pageSize: query.pageSize ?? 20,
    },
  });
}

export async function cjGetOrder(orderId: string) {
  return cjFetch("GET", "/shopping/order/getOrderDetail", { query: { orderId } });
}

export async function cjCreateOrderV2(body: Record<string, unknown>) {
  return cjFetch<{
    orderId?: string;
    orderNumber?: string;
    cjPayUrl?: string;
    actualPayment?: string | number;
    postageAmount?: string | number;
    productAmount?: string | number;
  }>("POST", "/shopping/order/createOrderV2", { body });
}

export async function cjConfirmOrder(orderId: string) {
  return cjFetch("PATCH", "/shopping/order/confirmOrder", { body: { orderId } });
}

export async function cjPayBalance(orderId: string) {
  return cjFetch("POST", "/shopping/pay/payBalance", { body: { orderId } });
}

export async function cjFreightCalculate(body: {
  startCountryCode: string;
  endCountryCode: string;
  zip?: string;
  products: Array<{ vid: string; quantity: number }>;
}) {
  return cjFetch("POST", "/logistic/freightCalculate", { body });
}

export async function cjTrackInfo(trackNumber: string) {
  return cjFetch("GET", "/logistic/trackInfo", { query: { trackNumber } });
}

export async function cjSetWebhook(callbackUrl: string) {
  return cjFetch("POST", "/webhook/set", {
    body: {
      product: { type: "ENABLE", callbackUrls: [callbackUrl] },
      stock: { type: "ENABLE", callbackUrls: [callbackUrl] },
      order: { type: "ENABLE", callbackUrls: [callbackUrl] },
      logistics: { type: "ENABLE", callbackUrls: [callbackUrl] },
    },
  });
}

export function flattenListV2(data: CjListV2Data | undefined): CjListProduct[] {
  const lists = data?.content ?? [];
  const out: CjListProduct[] = [];
  for (const block of lists) {
    for (const product of block.productList ?? []) {
      if (product?.id) out.push(product);
    }
  }
  return out;
}
