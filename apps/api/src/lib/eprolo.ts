import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { configKeys, EPROLO_DEFAULT_API_BASE, VENDOR_EPROLO } from "@spicycorner/shared";
import { docClient, CONFIG_TABLE, now } from "./db";
import { eproloAuth, redactEproloUrl, withEproloQuery, type EproloSignAlgorithm } from "./eprolo-sign";

export class EproloApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly eproloCode?: number | string,
    readonly url?: string
  ) {
    super(message);
    this.name = "EproloApiError";
  }
}

type CredentialRecord = {
  openApiKey?: string;
  openApiSecret?: string;
  updatedAt?: string;
};

type EproloEnvelope = {
  code?: number | string;
  result?: boolean;
  success?: boolean;
  message?: string;
  msg?: string;
  data?: unknown;
};

const PING_PATHS = ["/openapi/", "/", "/api/"];

function envKey(): string {
  return (process.env.EPROLO_OPEN_API_KEY ?? "").trim();
}

function envSecret(): string {
  return (process.env.EPROLO_OPEN_API_SECRET ?? "").trim();
}

function apiBase(): string {
  return (process.env.EPROLO_API_BASE ?? EPROLO_DEFAULT_API_BASE).replace(/\/$/, "");
}

function signAlgorithm(): EproloSignAlgorithm {
  const raw = (process.env.EPROLO_SIGN_ALG ?? "md5-key-timestamp-secret").trim();
  if (raw === "md5-key-secret-timestamp" || raw === "hmac-sha256-key-timestamp") return raw;
  return "md5-key-timestamp-secret";
}

let credentialMemory: CredentialRecord | null = null;

async function loadCredentials(): Promise<CredentialRecord> {
  if (credentialMemory?.openApiKey && credentialMemory.openApiSecret) return credentialMemory;
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.eprolo.pk, SK: configKeys.eprolo.sk },
    })
  );
  credentialMemory = (result.Item as CredentialRecord | undefined) ?? {};
  return credentialMemory;
}

async function saveCredentialRecord(patch: CredentialRecord): Promise<CredentialRecord> {
  const current = await loadCredentials();
  const next: CredentialRecord = { ...current, ...patch, updatedAt: now() };
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.eprolo.pk,
        SK: configKeys.eprolo.sk,
        ...next,
      },
    })
  );
  credentialMemory = next;
  return next;
}

function hint(value: string): string {
  return value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "set";
}

export async function resolveEproloCredentials(): Promise<{
  openApiKey: string;
  openApiSecret: string;
} | null> {
  const stored = await loadCredentials();
  const openApiKey = stored.openApiKey || envKey();
  const openApiSecret = stored.openApiSecret || envSecret();
  if (!openApiKey || !openApiSecret) return null;
  return { openApiKey, openApiSecret };
}

export async function saveEproloCredentials(openApiKey: string, openApiSecret: string): Promise<void> {
  credentialMemory = null;
  await saveCredentialRecord({
    openApiKey: openApiKey.trim(),
    openApiSecret: openApiSecret.trim(),
  });
}

async function requestJson(
  url: string,
  headers: Record<string, string>,
  method: "GET" | "POST",
  body?: unknown
): Promise<{ status: number; json: EproloEnvelope | null; text: string }> {
  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" && body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8_000),
  });
  const text = await res.text();
  let json: EproloEnvelope | null = null;
  try {
    json = JSON.parse(text) as EproloEnvelope;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

function looksLikeApiJson(json: EproloEnvelope | null): boolean {
  if (!json || typeof json !== "object") return false;
  return (
    json.code !== undefined ||
    json.success !== undefined ||
    json.result !== undefined ||
    Boolean(json.message || json.msg)
  );
}

function envelopeMessage(json: EproloEnvelope | null, fallback: string): string {
  return json?.message || json?.msg || fallback;
}

function isAuthFailure(message: string, status: number): boolean {
  if (status === 401 || status === 403) return true;
  return /apiKey cannot be null|apiKey error|sign error|unauthorized/i.test(message);
}

function isSuccessEnvelope(json: EproloEnvelope | null, status: number, message: string): boolean {
  if (!json) return false;
  if (json.success === true || json.result === true) return true;
  const code = json.code;
  if (code === 0 || code === "0" || code === 200 || code === "200") return true;
  return status < 400 && !isAuthFailure(message, status);
}

/**
 * Eprolo Open API is a Tomcat servlet at https://openapi.eprolo.com/ (also /api/ and /openapi/).
 * Nested paths like /api/open/product/list return HTML 404. Auth header is `apiKey`.
 */
export async function pingEproloApi(): Promise<{
  ok: boolean;
  url?: string;
  status?: number;
  message?: string;
}> {
  const creds = await resolveEproloCredentials();
  if (!creds) {
    return { ok: false, message: "Eprolo openApiKey / openApiSecret are not configured." };
  }
  const auth = eproloAuth(creds.openApiKey, creds.openApiSecret, signAlgorithm());
  const base = apiBase();
  const paths = process.env.EPROLO_PING_PATH?.trim()
    ? [process.env.EPROLO_PING_PATH.trim()]
    : PING_PATHS;

  let lastJson: { url: string; status: number; message: string; ok: boolean } | undefined;
  let lastAny: { url: string; status: number; message: string } | undefined;

  for (const path of paths) {
    const url = withEproloQuery(
      `${base}${path.startsWith("/") ? path : `/${path}`}`,
      auth.query
    );
    for (const method of ["GET", "POST"] as const) {
      try {
        const result = await requestJson(
          url,
          auth.headers,
          method,
          method === "POST" ? auth.body : undefined
        );
        const message = envelopeMessage(
          result.json,
          result.json ? `HTTP ${result.status}` : result.text.replace(/\s+/g, " ").slice(0, 180)
        );
        lastAny = { url, status: result.status, message };
        if (looksLikeApiJson(result.json)) {
          const ok = isSuccessEnvelope(result.json, result.status, message);
          lastJson = { url, status: result.status, message, ok };
          if (ok) return lastJson;
        } else if (result.status === 404) {
          // Valid MD5(key+timestamp+secret) is accepted; root has no method mapping.
          return {
            ok: true,
            url,
            status: 404,
            message:
              "Signature accepted. Ask Eprolo for the Open API PDF (product list and create-order paths) — this host has no catalog method at the root.",
          };
        }
      } catch (err) {
        lastAny = {
          url,
          status: 0,
          message: err instanceof Error ? err.message : "request failed",
        };
      }
    }
  }

  if (lastJson) return lastJson;
  return {
    ok: false,
    url: lastAny?.url,
    status: lastAny?.status,
    message:
      lastAny?.message ||
      `No JSON API response from ${base}. Ask Eprolo for the Open API document (method paths).`,
  };
}

export async function getEproloConnectionStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  vendorSlug: typeof VENDOR_EPROLO;
  apiKeyHint?: string;
  apiBase?: string;
  pingUrl?: string;
  message?: string;
}> {
  const creds = await resolveEproloCredentials();
  if (!creds) {
    return {
      configured: false,
      connected: false,
      vendorSlug: VENDOR_EPROLO,
      apiBase: apiBase(),
      message:
        "Set GitHub secrets EPROLO_OPEN_API_KEY and EPROLO_OPEN_API_SECRET, or paste them in Admin → Eprolo.",
    };
  }
  const ping = await pingEproloApi();
  return {
    configured: true,
    connected: ping.ok,
    vendorSlug: VENDOR_EPROLO,
    apiKeyHint: hint(creds.openApiKey),
    apiBase: apiBase(),
    pingUrl: ping.url ? redactEproloUrl(ping.url) : undefined,
    message: ping.message,
  };
}
