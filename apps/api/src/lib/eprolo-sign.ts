import { createHash, createHmac } from "node:crypto";

export type EproloSignAlgorithm =
  | "md5-key-timestamp-secret"
  | "md5-key-secret-timestamp"
  | "hmac-sha256-key-timestamp";

/**
 * Eprolo Open API signing. Live checks: MD5(openApiKey + timestamp + openApiSecret)
 * is accepted (wrong formulas return JSON "sign error"; this one proceeds past auth).
 */
export function eproloSign(
  openApiKey: string,
  openApiSecret: string,
  timestampMs: string,
  algorithm: EproloSignAlgorithm = "md5-key-timestamp-secret"
): string {
  if (algorithm === "hmac-sha256-key-timestamp") {
    return createHmac("sha256", openApiSecret).update(`${openApiKey}${timestampMs}`).digest("hex");
  }
  if (algorithm === "md5-key-secret-timestamp") {
    return createHash("md5")
      .update(`${openApiKey}${openApiSecret}${timestampMs}`)
      .digest("hex")
      .toUpperCase();
  }
  return createHash("md5")
    .update(`${openApiKey}${timestampMs}${openApiSecret}`)
    .digest("hex")
    .toUpperCase();
}

export function eproloAuth(
  openApiKey: string,
  openApiSecret: string,
  algorithm: EproloSignAlgorithm = "md5-key-timestamp-secret",
  nowMs = Date.now()
): {
  timestamp: string;
  sign: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, string>;
} {
  const timestamp = String(nowMs);
  const sign = eproloSign(openApiKey, openApiSecret, timestamp, algorithm);
  const headers = {
    apiKey: openApiKey,
    timestamp,
    sign,
    "Content-Type": "application/json",
  };
  const query = { apiKey: openApiKey, timestamp, sign };
  const body = { ...query };
  return { timestamp, sign, headers, query, body };
}

export function eproloAuthHeaders(
  openApiKey: string,
  openApiSecret: string,
  algorithm: EproloSignAlgorithm = "md5-key-timestamp-secret",
  nowMs = Date.now()
): Record<string, string> {
  return eproloAuth(openApiKey, openApiSecret, algorithm, nowMs).headers;
}

export function withEproloQuery(url: string, query: Record<string, string>): string {
  const next = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    next.searchParams.set(key, value);
  }
  return next.toString();
}

/** Hide key/sign values in admin UI. */
export function redactEproloUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of ["apiKey", "openApiKey", "sign", "signature"]) {
      if (parsed.searchParams.has(key)) parsed.searchParams.set(key, "REDACTED");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
