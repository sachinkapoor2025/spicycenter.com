import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import {
  USPS_MAIL_CLASSES,
  mailClassDisplayName,
  type Address,
  type AddressValidationResult,
  type LabelResult,
  type MailClassKey,
  type PackageDetails,
  type RateQuote,
  type ShippingSettings,
  type TrackingStatus,
} from "@spicycorner/shared";
import type { BuyLabelParams, ShippingProvider } from "./types";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_BASE_URL = "https://apis.usps.com";

interface UspsCredentials {
  clientId: string;
  clientSecret: string;
  crid?: string;
  mid?: string;
  epsAccountNumber?: string;
  paymentAuthToken?: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
let secretCache: { creds: UspsCredentials; fetchedAt: number } | null = null;
const SECRET_TTL_MS = 5 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ozToPounds(oz: number): number {
  return Math.max(0.1, Math.round((oz / 16) * 1000) / 1000);
}

function buildRateId(mailClass: string, price: number, sku?: string): string {
  return `${mailClass}|${price.toFixed(2)}|${sku ?? ""}`;
}

function parseRateId(rateId: string): { mailClass: string; price: number } {
  const [mailClass, priceStr] = rateId.split("|");
  return { mailClass, price: Number.parseFloat(priceStr) || 0 };
}

function enabledMailClasses(settings: ShippingSettings): string[] {
  const classes: string[] = [];
  for (const [key, enabled] of Object.entries(settings.enabledServices)) {
    if (!enabled) continue;
    const mailClass = USPS_MAIL_CLASSES[key as MailClassKey];
    if (mailClass) classes.push(mailClass);
  }
  return classes.length ? classes : [USPS_MAIL_CLASSES.GROUND_ADVANTAGE];
}

async function fetchSecretsManagerCredentials(): Promise<UspsCredentials | null> {
  const arn = process.env.USPS_SECRET_ARN;
  if (!arn) return null;

  if (secretCache && Date.now() - secretCache.fetchedAt < SECRET_TTL_MS) {
    return secretCache.creds;
  }

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  const result = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!result.SecretString) return null;

  const json = JSON.parse(result.SecretString) as Record<string, string>;
  const creds: UspsCredentials = {
    clientId: json.clientId ?? json.client_id ?? "",
    clientSecret: json.clientSecret ?? json.client_secret ?? "",
    crid: json.crid ?? json.USPS_CRID,
    mid: json.mid ?? json.USPS_MID,
    epsAccountNumber: json.epsAccountNumber ?? json.USPS_EPS_ACCOUNT_NUMBER,
    paymentAuthToken: json.paymentAuthToken ?? json.USPS_PAYMENT_AUTHORIZATION_TOKEN,
  };
  secretCache = { creds, fetchedAt: Date.now() };
  return creds;
}

async function resolveCredentials(): Promise<UspsCredentials> {
  const fromSecret = await fetchSecretsManagerCredentials();
  if (fromSecret?.clientId && fromSecret.clientSecret) return fromSecret;

  const clientId = process.env.USPS_CLIENT_ID ?? "";
  const clientSecret = process.env.USPS_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "USPS credentials not configured. Set USPS_CLIENT_ID and USPS_CLIENT_SECRET (or USPS_SECRET_ARN)."
    );
  }

  return {
    clientId,
    clientSecret,
    crid: process.env.USPS_CRID,
    mid: process.env.USPS_MID,
    epsAccountNumber: process.env.USPS_EPS_ACCOUNT_NUMBER,
    paymentAuthToken: process.env.USPS_PAYMENT_AUTHORIZATION_TOKEN,
  };
}

export class USPSProvider implements ShippingProvider {
  constructor(private settings: ShippingSettings) {}

  private baseUrl(): string {
    return (
      this.settings.uspsBaseUrl ??
      process.env.USPS_BASE_URL ??
      DEFAULT_BASE_URL
    ).replace(/\/$/, "");
  }

  private async getAccessToken(): Promise<string> {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
      return tokenCache.accessToken;
    }

    const creds = await resolveCredentials();
    // USPS OAuth v3 examples use JSON body (not form-urlencoded).
    // See https://github.com/USPS/api-examples — Content-Type: application/json
    const tokenBody: Record<string, string> = {
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    };
    // Some USPS accounts require CRID/MID on the token request (Ship / Labels apps).
    if (creds.crid?.trim()) {
      tokenBody.customer_registration_id = creds.crid.trim();
    }
    if (creds.mid?.trim()) {
      tokenBody.mailer_id = creds.mid.trim();
    }

    const res = await this.fetchWithRetry(`${this.baseUrl()}/oauth2/v3/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(tokenBody),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`USPS OAuth failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in?: number };
    const expiresIn = (data.expires_in ?? 3600) * 1000;
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresIn,
    };
    return data.access_token;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retries = 3
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, init);
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          await sleep(2 ** attempt * 500);
          continue;
        }
        return res;
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await sleep(2 ** attempt * 500);
          continue;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("USPS request failed");
  }

  private async authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extra,
    };
  }

  private priceType(): "RETAIL" | "COMMERCIAL" {
    const creds = {
      eps: process.env.USPS_EPS_ACCOUNT_NUMBER,
    };
    return creds.eps ? "COMMERCIAL" : "RETAIL";
  }

  private domesticRatePayload(
    mailClass: string,
    pkg: PackageDetails,
    origin: Address,
    destination: Address
  ): Record<string, unknown> {
    return {
      originZIPCode: origin.postalCode.slice(0, 5),
      destinationZIPCode: destination.postalCode.slice(0, 5),
      weight: ozToPounds(pkg.weightOz),
      length: pkg.lengthIn,
      width: pkg.widthIn,
      height: pkg.heightIn,
      mailClass,
      priceType: this.priceType(),
      processingCategory: "MACHINABLE",
      rateIndicator: "SP",
      destinationEntryFacilityType: "NONE",
    };
  }

  async getRates(
    pkg: PackageDetails,
    origin: Address,
    destination: Address
  ): Promise<RateQuote[]> {
    await resolveCredentials();
    const mailClasses = enabledMailClasses(this.settings);
    const isDomestic = destination.country.toUpperCase() === "US";

    const ratePromises = mailClasses.map(async (mailClass) => {
      const path = isDomestic
        ? "/prices/v3/base-rates/search"
        : "/international-prices/v3/base-rates/search";
      const payload = isDomestic
        ? this.domesticRatePayload(mailClass, pkg, origin, destination)
        : {
            ...this.domesticRatePayload(mailClass, pkg, origin, destination),
            destinationCountryCode: destination.country,
          };

      const res = await this.fetchWithRetry(`${this.baseUrl()}${path}`, {
        method: "POST",
        headers: await this.authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`USPS rate ${mailClass} failed (${res.status}): ${text.slice(0, 150)}`);
      }

      const data = (await res.json()) as {
        totalBasePrice?: number;
        price?: number;
        rates?: Array<{ price?: number; SKU?: string; mailClass?: string }>;
      };

      const price =
        data.totalBasePrice ??
        data.price ??
        data.rates?.[0]?.price ??
        undefined;

      if (price == null) return null;

      const sku = data.rates?.[0]?.SKU;
      return {
        rateId: buildRateId(mailClass, price, sku),
        mailClass,
        serviceName: mailClassDisplayName(mailClass),
        price,
        currency: "USD" as const,
      };
    });

    const settled = await Promise.allSettled(ratePromises);
    const quotes: RateQuote[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        quotes.push(result.value);
      }
    }

    if (!quotes.length) {
      const errors = settled
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => r.reason?.message ?? String(r.reason));
      throw new Error(errors[0] ?? "No USPS rates returned");
    }

    await this.attachDeliveryEstimates(quotes, origin, destination);
    return quotes.sort((a, b) => a.price - b.price);
  }

  private async attachDeliveryEstimates(
    quotes: RateQuote[],
    origin: Address,
    destination: Address
  ): Promise<void> {
    if (destination.country.toUpperCase() !== "US") return;

    await Promise.allSettled(
      quotes.map(async (quote) => {
        const params = new URLSearchParams({
          originZIPCode: origin.postalCode.slice(0, 5),
          destinationZIPCode: destination.postalCode.slice(0, 5),
          mailClass: quote.mailClass,
        });
        const res = await this.fetchWithRetry(
          `${this.baseUrl()}/service-standards/v3/estimates?${params}`,
          { method: "GET", headers: await this.authHeaders() }
        );
        if (!res.ok) return;

        const data = (await res.json()) as {
          deliveryDate?: string;
          expectedDeliveryDate?: string;
          serviceStandard?: { deliveryDate?: string; days?: number };
        };
        const deliveryDate =
          data.deliveryDate ??
          data.expectedDeliveryDate ??
          data.serviceStandard?.deliveryDate;
        if (deliveryDate) {
          quote.estimatedDeliveryDate = deliveryDate.slice(0, 10);
        }
        if (data.serviceStandard?.days != null) {
          quote.estimatedDeliveryDays = data.serviceStandard.days;
        }
      })
    );
  }

  async validateAddress(address: Address): Promise<AddressValidationResult> {
    try {
      await resolveCredentials();
    } catch {
      return { valid: true, messages: ["USPS credentials unavailable — skipped validation"] };
    }

    const params = new URLSearchParams({
      streetAddress: address.line1,
      ...(address.line2 ? { secondaryAddress: address.line2 } : {}),
      city: address.city,
      state: address.state,
      ZIPCode: address.postalCode.slice(0, 5),
    });

    const res = await this.fetchWithRetry(
      `${this.baseUrl()}/addresses/v3/address?${params}`,
      { method: "GET", headers: await this.authHeaders() }
    );

    if (!res.ok) {
      return { valid: false, messages: [`USPS address validation failed (${res.status})`] };
    }

    const data = (await res.json()) as {
      address?: {
        streetAddress?: string;
        secondaryAddress?: string;
        city?: string;
        state?: string;
        ZIPCode?: string;
      };
      additionalInfo?: { DPVConfirmation?: string };
    };

    const dpv = data.additionalInfo?.DPVConfirmation;
    const valid = dpv === "Y" || dpv === "D" || dpv === "S" || !dpv;
    const addr = data.address;

    return {
      valid,
      normalized: addr
        ? {
            line1: addr.streetAddress ?? address.line1,
            line2: addr.secondaryAddress ?? address.line2,
            city: addr.city ?? address.city,
            state: addr.state ?? address.state,
            postalCode: addr.ZIPCode ?? address.postalCode,
            country: address.country,
            name: address.name,
          }
        : undefined,
      messages: valid ? undefined : ["Address could not be fully validated"],
    };
  }

  async buyLabel(params: BuyLabelParams): Promise<LabelResult> {
    const creds = await resolveCredentials();
    if (!creds.paymentAuthToken && !creds.epsAccountNumber) {
      throw new Error(
        "USPS label purchase requires USPS_PAYMENT_AUTHORIZATION_TOKEN or USPS_EPS_ACCOUNT_NUMBER"
      );
    }

    const mailClass =
      params.mailClass ??
      (params.rateId ? parseRateId(params.rateId).mailClass : undefined);
    if (!mailClass) throw new Error("mailClass or rateId required to buy label");

    const payload: Record<string, unknown> = {
      imageInfo: { imageType: "PDF", labelType: "4X6LABEL" },
      toAddress: {
        firstName: params.destination.name.split(" ")[0] ?? params.destination.name,
        lastName: params.destination.name.split(" ").slice(1).join(" ") || ".",
        streetAddress: params.destination.line1,
        secondaryAddress: params.destination.line2,
        city: params.destination.city,
        state: params.destination.state,
        ZIPCode: params.destination.postalCode.slice(0, 5),
      },
      fromAddress: {
        firstName: params.origin.name.split(" ")[0] ?? params.origin.name,
        lastName: params.origin.name.split(" ").slice(1).join(" ") || ".",
        streetAddress: params.origin.line1,
        secondaryAddress: params.origin.line2,
        city: params.origin.city,
        state: params.origin.state,
        ZIPCode: params.origin.postalCode.slice(0, 5),
      },
      packageDescription: {
        mailClass,
        weight: ozToPounds(params.pkg.weightOz),
        length: params.pkg.lengthIn,
        width: params.pkg.widthIn,
        height: params.pkg.heightIn,
        processingCategory: "MACHINABLE",
        rateIndicator: "SP",
      },
    };

    const paymentHeaders: Record<string, string> = {};
    if (creds.paymentAuthToken) {
      paymentHeaders["X-Payment-Authorization-Token"] = creds.paymentAuthToken;
    }
    if (creds.epsAccountNumber) {
      paymentHeaders["X-Payment-Account-Number"] = creds.epsAccountNumber;
    }
    if (creds.crid) paymentHeaders["X-Crid"] = creds.crid;
    if (creds.mid) paymentHeaders["X-Mid"] = creds.mid;

    const res = await this.fetchWithRetry(`${this.baseUrl()}/labels/v3/label`, {
      method: "POST",
      headers: await this.authHeaders(paymentHeaders),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`USPS label purchase failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    let trackingNumber = "";
    let labelCost: number | undefined;
    let pdfBuffer: Buffer | undefined;

    if (contentType.includes("application/json")) {
      const data = (await res.json()) as {
        trackingNumber?: string;
        labelImage?: string;
        postage?: number;
        totalPostage?: number;
      };
      trackingNumber = data.trackingNumber ?? "";
      labelCost = data.postage ?? data.totalPostage;
      if (data.labelImage) {
        pdfBuffer = Buffer.from(data.labelImage, "base64");
      }
    } else {
      pdfBuffer = Buffer.from(await res.arrayBuffer());
      trackingNumber = res.headers.get("X-Tracking-Number") ?? "";
    }

    if (!trackingNumber) {
      throw new Error("USPS label response missing tracking number");
    }

    let labelPdfUrl: string | undefined;
    if (pdfBuffer && params.orderId) {
      labelPdfUrl = await uploadLabelPdf(params.orderId, pdfBuffer);
    }

    const parsed = params.rateId ? parseRateId(params.rateId) : undefined;

    return {
      trackingNumber,
      labelPdfUrl,
      labelCost: labelCost ?? parsed?.price,
      mailClass,
      serviceName: mailClassDisplayName(mailClass),
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingStatus> {
    try {
      await resolveCredentials();
      const res = await this.fetchWithRetry(
        `${this.baseUrl()}/tracking/v3/tracking/${encodeURIComponent(trackingNumber)}`,
        { method: "GET", headers: await this.authHeaders() }
      );
      if (!res.ok) {
        return { trackingNumber, status: "unknown", statusDetail: `USPS tracking HTTP ${res.status}` };
      }
      const data = (await res.json()) as {
        status?: string;
        statusSummary?: string;
        expectedDeliveryDate?: string;
        trackingEvents?: Array<{ eventDate?: string; eventDescription?: string; eventCity?: string }>;
      };
      return {
        trackingNumber,
        status: data.status ?? "in_transit",
        statusDetail: data.statusSummary,
        estimatedDeliveryDate: data.expectedDeliveryDate?.slice(0, 10),
        events: data.trackingEvents?.map((e) => ({
          date: e.eventDate ?? "",
          description: e.eventDescription ?? "",
          location: e.eventCity,
        })),
      };
    } catch {
      return { trackingNumber, status: "unknown", statusDetail: "Tracking unavailable" };
    }
  }
}

async function uploadLabelPdf(orderId: string, pdf: Buffer): Promise<string | undefined> {
  const bucket = process.env.UPLOAD_BUCKET;
  if (!bucket || process.env.USE_LOCAL_UPLOADS === "true") {
    return undefined;
  }

  const key = `labels/${orderId}.pdf`;
  const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdf,
      ContentType: "application/pdf",
    })
  );

  const cdn = process.env.CLOUDFRONT_DOMAIN;
  if (cdn) return `https://${cdn}/${key}`;
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

export function createUSPSProvider(settings: ShippingSettings): USPSProvider {
  return new USPSProvider(settings);
}
