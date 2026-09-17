import { GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import Stripe from "stripe";
import {
  bulkDestinationSchema,
  bulkEnquiryContactSchema,
  bulkEnquiryKeys,
  bulkQuoteDisclaimer,
  computeBulkQuote,
  findTrackedCommodity,
  isNorthAmericaBulk,
  qtyBelowMinimum,
  type BulkEnquiryStatus,
  type BulkQuoteBreakdown,
} from "@spicycorner/shared";
import { badRequest, created, forbidden, notFound, ok, serverError } from "../lib/response";
import { requireAdmin } from "../lib/auth";
import { BULK_ENQUIRIES_TABLE, docClient, now } from "../lib/db";
import { sendEmail } from "../lib/email";
import {
  getAddOnPricing,
  getCachedFx,
  getFreightTiers,
  getLatestMandi,
  getMoistureTreatmentPricing,
  getSpicePricing,
  mandiInrPerKg,
} from "../lib/bulk-store";
import { isLoadTestMode } from "../lib/load-test";

export type BulkEnquiryRecord = {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  enquiryId: string;
  status: BulkEnquiryStatus;
  createdAt: string;
  spiceId: string;
  spiceName: string;
  qtyKg: number;
  destination: "UK" | "EU" | "US" | "CA";
  quote: BulkQuoteBreakdown | { pricingAvailable: false; message: string };
  contact: Record<string, string | undefined>;
  sampleSelected: boolean;
  documentationSelected: boolean;
  paymentStatus: "none" | "pending" | "paid" | "failed";
  paymentIntentId?: string;
  disclaimer: string;
};

function enquiryId(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BE-${d}-${rand}`;
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

async function loadEnquiry(id: string): Promise<BulkEnquiryRecord | null> {
  const res = await docClient.send(
    new GetCommand({
      TableName: BULK_ENQUIRIES_TABLE,
      Key: { PK: bulkEnquiryKeys.pk(id), SK: bulkEnquiryKeys.sk() },
    })
  );
  return (res.Item as BulkEnquiryRecord | undefined) ?? null;
}

async function saveEnquiry(item: BulkEnquiryRecord) {
  await docClient.send(new PutCommand({ TableName: BULK_ENQUIRIES_TABLE, Item: item }));
}

function quoteText(q: BulkEnquiryRecord["quote"]): string {
  if (!("pricingAvailable" in q) || !q.pricingAvailable) {
    return "Pricing: contact us — no reference price on file.";
  }
  return [
    `${q.spiceName} × ${q.qtyKg}kg to ${q.destination}`,
    q.containerRecommendation ? `Container: ${q.containerRecommendation.label}` : "",
    `Spice cost: ₹${q.spiceCostInr}`,
    `Export clearance: ₹${q.clearanceChargeInr}`,
    `Testing: ₹${q.testingChargeInr}`,
    `Moisture / desiccant treatment: ₹${q.moistureTreatmentInr}`,
    `Subtotal INR: ₹${q.subtotalInr}`,
    `Estimated ${q.displayCurrency} (goods): ${q.estimatedDisplay}`,
    `Shipping (${q.displayCurrency}): ${q.shippingCostDisplay}`,
    q.addOnsTotalDisplay
      ? `Add-ons (${q.displayCurrency}): ${q.addOnsTotalDisplay}`
      : "Add-ons: none",
    `Grand total (${q.displayCurrency}): ${q.grandTotalDisplay}`,
    q.advisoryNote ? `Shipping advice: ${q.advisoryNote}` : "",
    bulkQuoteDisclaimer(q.destination),
  ]
    .filter(Boolean)
    .join("\n");
}

async function notifyEnquiry(item: BulkEnquiryRecord) {
  const staff = process.env.NOTIFY_EMAIL ?? "enquiry@spicycenter.com";
  const body = [
    `New bulk enquiry ${item.enquiryId}`,
    `Status: ${item.status}`,
    `From: ${item.contact.fullName} <${item.contact.email}> ${item.contact.phone}`,
    `Country: ${item.contact.country}`,
    item.contact.companyName ? `Company: ${item.contact.companyName}` : "",
    quoteText(item.quote),
    item.contact.notes ? `Notes: ${item.contact.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    to: staff,
    subject: `Bulk enquiry ${item.enquiryId} — ${item.spiceName} ${item.qtyKg}kg`,
    text: body,
  });
  await sendEmail({
    to: item.contact.email!,
    subject: `We received your bulk spice enquiry ${item.enquiryId}`,
    text: `Thank you ${item.contact.fullName}. Your reference is ${item.enquiryId}.\n\n${quoteText(item.quote)}\n\nOur team will confirm the final quote. The bulk spice cost is not charged online.`,
  });
}

export async function createBulkEnquiry(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body || "{}") as Record<string, unknown>;
  const tracked = findTrackedCommodity(String(body.spiceId ?? body.commodity ?? ""));
  if (!tracked) return badRequest("Unknown spice.");
  const dest = bulkDestinationSchema.safeParse(String(body.destination ?? "UK").toUpperCase());
  if (!dest.success) return badRequest("destination must be UK, EU, US or CA.");
  const qtyKg = Number(body.qtyKg);
  const spice = await getSpicePricing(tracked.spiceId);
  if (qtyBelowMinimum(qtyKg, spice.min_bulk_qty_kg)) {
    return badRequest(`Minimum bulk quantity is ${spice.min_bulk_qty_kg}kg.`);
  }
  const contactParse = bulkEnquiryContactSchema.safeParse(body.contact ?? body);
  if (!contactParse.success) {
    return badRequest("Full name, email, phone and country are required.");
  }
  const sampleSelected = Boolean(body.sampleSelected);
  const documentationSelected = Boolean(body.documentationSelected);
  const gradeKey = typeof body.grade === "string" ? body.grade : "";
  const latest = await getLatestMandi(tracked.slug);
  const fx = await getCachedFx();
  const addOns = await getAddOnPricing();
  const moisture = await getMoistureTreatmentPricing();
  const freightTiers = await getFreightTiers();
  const quote = computeBulkQuote({
    spice,
    qtyKg,
    destination: dest.data,
    agmarknetModalAvgInr: mandiInrPerKg(latest, gradeKey || undefined),
    fxInrGbp: fx.inr_gbp,
    fxInrEur: fx.inr_eur,
    fxInrUsd: fx.inr_usd,
    fxInrCad: fx.inr_cad,
    addOns,
    sampleSelected,
    documentationSelected,
    moisture,
    freightTiers,
  });

  const id = enquiryId();
  const createdAt = now();
  const addOnsWanted = sampleSelected || documentationSelected;
  const item: BulkEnquiryRecord = {
    PK: bulkEnquiryKeys.pk(id),
    SK: bulkEnquiryKeys.sk(),
    GSI1PK: bulkEnquiryKeys.gsi1pk("new"),
    GSI1SK: createdAt,
    enquiryId: id,
    status: "new",
    createdAt,
    spiceId: tracked.spiceId,
    spiceName: tracked.spiceName,
    qtyKg,
    destination: dest.data,
    quote,
    contact: contactParse.data,
    sampleSelected,
    documentationSelected,
    paymentStatus: addOnsWanted && !isNorthAmericaBulk(dest.data) ? "pending" : "none",
    disclaimer: bulkQuoteDisclaimer(dest.data),
  };
  await saveEnquiry(item);
  try {
    await notifyEnquiry(item);
  } catch (err) {
    console.error("Bulk enquiry email failed", err);
  }

  if (isNorthAmericaBulk(dest.data) || !addOnsWanted) {
    return created({ enquiryId: id, status: "new", requiresPayment: false, quote });
  }
  if (!quote.pricingAvailable) {
    return created({ enquiryId: id, status: "new", requiresPayment: false, quote });
  }

  const amount = Math.round(quote.addOnsTotalDisplay * 100);
  if (amount <= 0) {
    return created({ enquiryId: id, status: "new", requiresPayment: false, quote });
  }

  if (isLoadTestMode()) {
    return created({
      enquiryId: id,
      status: "new",
      requiresPayment: true,
      clientSecret: `pi_loadtest_${id}_secret`,
      quote,
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return created({
      enquiryId: id,
      status: "new",
      requiresPayment: true,
      clientSecret: `pi_dev_${id}_secret`,
      quote,
    });
  }

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: quote.displayCurrency.toLowerCase(),
    metadata: { bulkEnquiryId: id },
    automatic_payment_methods: { enabled: true },
    receipt_email: contactParse.data.email,
    description: `Bulk enquiry add-ons ${id}`,
  });
  item.paymentIntentId = intent.id;
  await saveEnquiry(item);
  return created({
    enquiryId: id,
    status: "new",
    requiresPayment: true,
    clientSecret: intent.client_secret,
    quote,
  });
}

export async function getBulkEnquiry(event: APIGatewayProxyEventV2) {
  const id = event.pathParameters?.enquiryId;
  if (!id) return badRequest("Missing enquiry id");
  const item = await loadEnquiry(id);
  if (!item) return notFound("Enquiry not found");
  return ok({
    enquiryId: item.enquiryId,
    status: item.status,
    paymentStatus: item.paymentStatus,
    quote: item.quote,
    spiceName: item.spiceName,
    qtyKg: item.qtyKg,
    destination: item.destination,
  });
}

export async function markEnquiryAddOnsPaid(enquiryId: string, paymentIntentId?: string) {
  const item = await loadEnquiry(enquiryId);
  if (!item) return;
  item.paymentStatus = "paid";
  item.status = "paid_addons";
  item.paymentIntentId = paymentIntentId ?? item.paymentIntentId;
  item.GSI1PK = bulkEnquiryKeys.gsi1pk("paid_addons");
  await saveEnquiry(item);
}

export async function adminListEnquiries(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const status = event.queryStringParameters?.status;
  if (status && status !== "all") {
    const res = await docClient.send(
      new QueryCommand({
        TableName: BULK_ENQUIRIES_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": bulkEnquiryKeys.gsi1pk(status) },
        ScanIndexForward: false,
      })
    );
    return ok({ enquiries: res.Items ?? [] });
  }
  const res = await docClient.send(new ScanCommand({ TableName: BULK_ENQUIRIES_TABLE }));
  const items = (res.Items ?? []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return ok({ enquiries: items });
}

export async function adminUpdateEnquiryStatus(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const id = event.pathParameters?.enquiryId;
  if (!id) return badRequest("Missing enquiry id");
  const status = String(JSON.parse(event.body || "{}").status ?? "") as BulkEnquiryStatus;
  const allowed: BulkEnquiryStatus[] = ["new", "quoted", "converted", "lost", "paid_addons"];
  if (!allowed.includes(status)) return badRequest("Invalid status");
  const item = await loadEnquiry(id);
  if (!item) return notFound("Enquiry not found");
  await docClient.send(
    new UpdateCommand({
      TableName: BULK_ENQUIRIES_TABLE,
      Key: { PK: bulkEnquiryKeys.pk(id), SK: bulkEnquiryKeys.sk() },
      UpdateExpression: "SET #s = :s, GSI1PK = :g, updatedAt = :u",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":s": status,
        ":g": bulkEnquiryKeys.gsi1pk(status),
        ":u": now(),
      },
    })
  );
  return ok({ enquiryId: id, status });
}

export async function runAgmarknetFetch(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
  const name = process.env.AGMARKNET_FETCHER_FUNCTION;
  if (!name) return serverError("Fetcher function name is not configured");
  const client = new LambdaClient({});
  const payload = event.body ? JSON.parse(event.body) : { backfill: true };
  await client.send(
    new InvokeCommand({
      FunctionName: name,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify(payload)),
    })
  );
  return ok({
    invoked: true,
    async: true,
    functionName: name,
    message: "Fetch started in the background. Wait about a minute, then reload this page. Do not click repeatedly.",
  });
}
