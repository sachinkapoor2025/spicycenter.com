import {
  CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
  ENQUIRY_MARKETS,
  OVERSEAS_COMMERCIAL_MOQ_LABEL,
  PREFERRED_CONTACT_CHANNELS,
  formatEnquiryKind,
  formatEnquiryMarket,
  formatEnquiryProductsList,
  normalizeEnquiryProductLines,
  serializeEnquiryProductsJson,
  shouldShowOverseasContainerDisclaimer,
  shouldShowSampleNotice,
  validateCatalogueEnquiry,
  type CatalogueEnquiryIssue,
  type EnquiryMarket,
  type PreferredContactChannel,
} from "@spicycorner/shared";
import { countryNameFromIso } from "./country-codes";
import { whatsappChatUrl } from "./site";

export { OVERSEAS_COMMERCIAL_MOQ_LABEL, PREFERRED_CONTACT_CHANNELS };
export type { PreferredContactChannel };

export const INDIA_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type EnquiryFormProduct = {
  name: string;
  quantity: string;
  unit: string;
};

export type EnquiryFormValues = {
  market: string;
  kind: string;
  state: string;
  city: string;
  country: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  buyerType: string;
  message: string;
  website: string;
  products: EnquiryFormProduct[];
};

export type EnquirySubmitOutcome =
  | { status: "sent"; leadId?: string; sessionId?: string; createdAt?: string }
  | {
      status: "saved_unnotified";
      leadId?: string;
      sessionId?: string;
      createdAt?: string;
      message: string;
    }
  | { status: "error"; message: string };

export function emptyEnquiryProduct(): EnquiryFormProduct {
  return { name: "", quantity: "", unit: "" };
}

export function splitPrefillQuantity(raw?: string): { quantity: string; unit: string } {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return { quantity: "", unit: "" };
  const match = trimmed.match(/^(\S+)\s+(.+)$/);
  if (match) return { quantity: match[1], unit: match[2] };
  return { quantity: trimmed, unit: "" };
}

export function enquiryProductsFromQuery(product?: string, quantity?: string): EnquiryFormProduct[] {
  const name = product?.trim() ?? "";
  const qty = splitPrefillQuantity(quantity);
  if (!name && !qty.quantity && !qty.unit) return [emptyEnquiryProduct()];
  return [{ name, quantity: qty.quantity, unit: qty.unit }];
}

export function enquiryLocationFromCountryQuery(country?: string): {
  market: EnquiryMarket | "";
  country: string;
} {
  const raw = country?.trim() ?? "";
  if (!raw) return { market: "", country: "" };
  const iso = raw.toUpperCase();
  if (iso === "IN") return { market: ENQUIRY_MARKETS.INDIA, country: "" };
  return { market: ENQUIRY_MARKETS.OVERSEAS, country: countryNameFromIso(raw) };
}

export function validateEnquiryContact(values: Pick<EnquiryFormValues, "firstName" | "email" | "phone" | "company" | "buyerType">): CatalogueEnquiryIssue[] {
  const issues: CatalogueEnquiryIssue[] = [];
  if (!values.firstName.trim()) issues.push({ field: "firstName", message: "Enter your name." });
  if (!values.email.trim()) issues.push({ field: "email", message: "Enter your email." });
  if (!values.phone.trim()) issues.push({ field: "phone", message: "Enter your phone number." });
  if (!values.company.trim()) issues.push({ field: "company", message: "Enter your company name." });
  return issues;
}

export function validateEnquiryForm(values: EnquiryFormValues): CatalogueEnquiryIssue[] {
  return [
    ...validateEnquiryContact(values),
    ...validateCatalogueEnquiry({
      market: values.market,
      kind: values.kind,
      state: values.state,
      city: values.city,
      country: values.country,
      products: values.products,
    }),
  ];
}

export function buildCatalogueEnquiryRequest(
  values: EnquiryFormValues,
  sessionId: string,
  page: string,
  options?: { preferredContactChannel?: PreferredContactChannel }
): { ok: true; body: Record<string, unknown> } | { ok: false; issues: CatalogueEnquiryIssue[] } {
  const issues = validateEnquiryForm(values);
  if (issues.length) return { ok: false, issues };

  const products = normalizeEnquiryProductLines(values.products);
  const first = products[0];
  const contactName = `${values.firstName} ${values.lastName}`.trim();
  const quantitySummary = [first?.quantity, first?.unit].filter(Boolean).join(" ");
  const preferredContactChannel = options?.preferredContactChannel;

  return {
    ok: true,
    body: {
      sessionId,
      name: contactName,
      email: values.email.trim(),
      phone: values.phone.trim(),
      page,
      source: "catalogue-enquiry",
      metadata: {
        company: values.company.trim(),
        contactName,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        buyerType: values.buyerType.trim(),
        market: values.market,
        kind: values.kind,
        enquiryType: formatEnquiryKind(values.kind),
        ...(preferredContactChannel ? { preferredContactChannel } : {}),
        ...(values.market === ENQUIRY_MARKETS.INDIA
          ? { state: values.state.trim(), city: values.city.trim() }
          : { country: values.country.trim(), city: values.city.trim() }),
        productsJson: serializeEnquiryProductsJson(products),
        product: first?.name ?? "",
        quantity: quantitySummary,
        message: values.message.trim(),
        website: values.website,
      },
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringField(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const SAVED_UNNOTIFIED_MESSAGE =
  "Your enquiry was saved but email could not be sent. Please WhatsApp us or email enquiry@spicycenter.com.";

function looksUnsafeError(message: string): boolean {
  return /(smtp_pass|secret|api[_-]?key|authorization|at \S+\s+\()/i.test(message);
}

export function interpretCatalogueEnquirySuccess(body: unknown): EnquirySubmitOutcome {
  const record = asRecord(body);
  if (record?.ignored === true) return { status: "sent" };
  const leadId = stringField(record, "leadId");
  const sessionId = stringField(record, "sessionId");
  const createdAt = stringField(record, "createdAt");
  if (record?.emailSent === true) {
    return { status: "sent", leadId, sessionId, createdAt };
  }
  if (leadId && record?.emailSent === false) {
    return {
      status: "saved_unnotified",
      leadId,
      sessionId,
      createdAt,
      message: stringField(record, "error") || SAVED_UNNOTIFIED_MESSAGE,
    };
  }
  return { status: "error", message: "Could not send your enquiry." };
}

export function interpretCatalogueEnquiryFailure(err: unknown): EnquirySubmitOutcome {
  const record = err && typeof err === "object" ? (err as { status?: number; body?: unknown; message?: string }) : null;
  const body = asRecord(record?.body);
  const leadId = stringField(body, "leadId");
  if (leadId && body?.emailSent === false) {
    return {
      status: "saved_unnotified",
      leadId,
      sessionId: stringField(body, "sessionId"),
      createdAt: stringField(body, "createdAt"),
      message: stringField(body, "error") || SAVED_UNNOTIFIED_MESSAGE,
    };
  }
  if (typeof record?.status === "number" && record.status >= 500) {
    return { status: "error", message: "Could not send your enquiry." };
  }
  const message = typeof record?.message === "string" ? record.message.trim() : "";
  if (message && !looksUnsafeError(message)) {
    return { status: "error", message };
  }
  return { status: "error", message: "Could not send your enquiry." };
}

export function enquirySubmitButtonLabel(loading: boolean, locked = false): string {
  if (locked) return "Enquiry saved";
  return loading ? "Submitting..." : "Submit Enquiry";
}

export function enquiryIssueMessage(issues: CatalogueEnquiryIssue[], field: string): string {
  return issues.find((issue) => issue.field === field)?.message ?? "";
}

export function enquiryReferenceLabel(outcome: EnquirySubmitOutcome): string {
  if (outcome.status === "error") return "";
  return outcome.leadId || outcome.sessionId || "";
}

export function isEnquiryResubmitLocked(outcome: EnquirySubmitOutcome | null): boolean {
  return outcome?.status === "sent" || outcome?.status === "saved_unnotified";
}

export const WHATSAPP_HANDOFF_RECORDED_MESSAGE =
  "Your enquiry is recorded. Continue in WhatsApp to send the message. The website cannot send WhatsApp for you.";

export const WHATSAPP_UNCERTAIN_MESSAGE =
  "We could not confirm that the enquiry was saved. Do not tap WhatsApp again. If you did not already submit, use Submit Enquiry or contact us.";

export function enquiryLeadWasPersisted(outcome: EnquirySubmitOutcome): boolean {
  if (outcome.status === "saved_unnotified") {
    return Boolean(outcome.leadId || outcome.sessionId);
  }
  return outcome.status === "sent" && Boolean(outcome.leadId);
}

export function buildCatalogueEnquiryWhatsAppMessage(values: EnquiryFormValues): string {
  const products = normalizeEnquiryProductLines(values.products);
  const market = formatEnquiryMarket(values.market);
  const kind = formatEnquiryKind(values.kind);
  const name = `${values.firstName} ${values.lastName}`.trim();
  const lines = [
    "Hi SpicyCenter, I would like to enquire about Indian spices.",
    "",
    market ? `Market: ${market}` : null,
    kind ? `Enquiry type: ${kind}` : null,
    products.length ? `Products:\n${formatEnquiryProductsList(products)}` : null,
    values.market === ENQUIRY_MARKETS.INDIA && values.state.trim() ? `State: ${values.state.trim()}` : null,
    values.market === ENQUIRY_MARKETS.OVERSEAS && values.country.trim()
      ? `Country: ${values.country.trim()}`
      : null,
    values.city.trim() ? `City: ${values.city.trim()}` : null,
    name ? `Name: ${name}` : null,
    values.email.trim() ? `Email: ${values.email.trim()}` : null,
    values.phone.trim() ? `Phone: ${values.phone.trim()}` : null,
    values.company.trim() ? `Company: ${values.company.trim()}` : null,
    values.buyerType.trim() ? `Buyer type: ${values.buyerType.trim()}` : null,
    values.message.trim() ? `Message:\n${values.message.trim()}` : null,
    shouldShowOverseasContainerDisclaimer(values.market, values.kind) ? OVERSEAS_COMMERCIAL_MOQ_LABEL : null,
    shouldShowSampleNotice(values.kind) ? CATALOGUE_ENQUIRY_SAMPLE_NOTICE : null,
  ].filter((line): line is string => Boolean(line));
  return lines.join("\n");
}

export function catalogueEnquiryWhatsAppHref(values: EnquiryFormValues): string {
  return whatsappChatUrl(buildCatalogueEnquiryWhatsAppMessage(values));
}

export type WhatsAppHandoffPlan = {
  persistConfirmed: boolean;
  openWhatsApp: boolean;
  lockResubmit: boolean;
  buyerMessage: string;
};

export function planWhatsAppEnquiryHandoff(outcome: EnquirySubmitOutcome): WhatsAppHandoffPlan {
  if (enquiryLeadWasPersisted(outcome)) {
    return {
      persistConfirmed: true,
      openWhatsApp: true,
      lockResubmit: true,
      buyerMessage: WHATSAPP_HANDOFF_RECORDED_MESSAGE,
    };
  }
  const genericFailure = outcome.status === "error" && outcome.message === "Could not send your enquiry.";
  if (genericFailure) {
    return {
      persistConfirmed: false,
      openWhatsApp: false,
      lockResubmit: true,
      buyerMessage: WHATSAPP_UNCERTAIN_MESSAGE,
    };
  }
  return {
    persistConfirmed: false,
    openWhatsApp: false,
    lockResubmit: false,
    buyerMessage: outcome.status === "error" ? outcome.message : "Could not send your enquiry.",
  };
}

export function enquiryWhatsAppButtonLabel(loading: boolean, locked = false): string {
  if (locked) return "Enquiry saved";
  return loading ? "Saving..." : "WhatsApp this enquiry";
}
