import {
  LEAD_NOTIFY_STATUS,
  LEAD_STATUS,
  leadHasRetryableNotifyPayload,
  type Lead,
  type LeadNotifyStatus,
} from "../schemas/lead";
import {
  enquiryProductsFromMetadata,
  formatEnquiryKind,
  formatEnquiryMarket,
  formatEnquiryProductsList,
  formatPreferredContactChannel,
} from "./catalogue-enquiry-model";

export const ADMIN_LEAD_SOURCE_OPTIONS = [
  "all",
  "checkout",
  "newsletter",
  "product",
  "browse",
  "contact",
  "wholesale",
  "catalogue-enquiry",
] as const;

export type AdminLeadRecord = {
  leadId: string;
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  page?: string;
  productSlug?: string;
  source?: string;
  createdAt: string;
  leadStatus?: Lead["leadStatus"];
  adminNotes?: string;
  assignedTo?: string;
  metadata?: Record<string, string>;
  notifyEmailStatus?: Lead["notifyEmailStatus"] | string;
  notifyEmailAt?: string;
  notifyEmailError?: string;
};

export type LeadListFilters = {
  source?: string;
  status?: string;
  dateFrom?: string;
  q?: string;
};

export function leadMatchesFilters(lead: AdminLeadRecord, filters: LeadListFilters): boolean {
  if (filters.source && filters.source !== "all" && (lead.source ?? "") !== filters.source) {
    return false;
  }
  const status = lead.leadStatus ?? LEAD_STATUS.NEW;
  if (filters.status && filters.status !== "all" && status !== filters.status) {
    return false;
  }
  if (filters.dateFrom && (lead.createdAt ?? "").slice(0, 10) < filters.dateFrom) {
    return false;
  }
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    const meta = lead.metadata ?? {};
    const productNames = enquiryProductsFromMetadata(meta).map((line) => line.name);
    const hay = [
      lead.name,
      lead.email,
      lead.phone,
      meta.company,
      meta.product,
      meta.contactName,
      meta.city,
      meta.state,
      meta.country,
      ...productNames,
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ");
    if (!hay.includes(q)) return false;
  }
  return true;
}

function notifyStatusIsSent(status?: LeadNotifyStatus | string): boolean {
  return status === LEAD_NOTIFY_STATUS.SENT;
}

/** Retry when the lead has Dynamo keys, a notify payload, and is not already sent. Missing status is eligible; sent is not. */
export function leadCanRetryNotifyEmail(lead: {
  sessionId?: string;
  createdAt?: string;
  notifyEmailStatus?: LeadNotifyStatus | string;
  source?: string;
  name?: string;
  email?: string;
  metadata?: Record<string, string>;
}): boolean {
  if (!lead.sessionId?.trim() || !lead.createdAt?.trim()) return false;
  if (notifyStatusIsSent(lead.notifyEmailStatus)) return false;
  return leadHasRetryableNotifyPayload(lead);
}

export function formatLeadNotifyStatus(status?: LeadNotifyStatus | string): string {
  if (status === LEAD_NOTIFY_STATUS.SENT) return "Sent";
  if (status === LEAD_NOTIFY_STATUS.FAILED) return "Failed";
  if (status === LEAD_NOTIFY_STATUS.SKIPPED) return "Skipped";
  return "Not recorded";
}

export function leadEnquiryFields(lead: AdminLeadRecord): { label: string; value: string }[] {
  const meta = lead.metadata ?? {};
  const destination = meta.destination?.trim() || meta.country?.trim() || "";
  const product = meta.product?.trim() || lead.productSlug?.trim() || "";
  const products = enquiryProductsFromMetadata(meta);
  const rows: { label: string; value: string }[] = [
    { label: "Buyer name", value: lead.name?.trim() || "—" },
    { label: "Email", value: lead.email?.trim() || "—" },
    { label: "Phone", value: lead.phone?.trim() || "—" },
    { label: "Company", value: meta.company?.trim() || "—" },
    { label: "Contact name", value: meta.contactName?.trim() || "—" },
    { label: "Market", value: formatEnquiryMarket(meta.market) || "—" },
    { label: "Enquiry type", value: formatEnquiryKind(meta.kind) || meta.enquiryType?.trim() || "—" },
    { label: "State", value: meta.state?.trim() || "—" },
    { label: "City", value: meta.city?.trim() || "—" },
    { label: "Country", value: meta.country?.trim() || "—" },
    { label: "Product", value: product || "—" },
    { label: "Quantity", value: meta.quantity?.trim() || "—" },
    { label: "Products", value: products.length ? formatEnquiryProductsList(products) : "—" },
    { label: "Destination", value: destination || "—" },
    { label: "Address", value: meta.address?.trim() || "—" },
    { label: "Buyer type", value: meta.buyerType?.trim() || "—" },
    { label: "Message", value: meta.message?.trim() || "—" },
    { label: "Source", value: lead.source?.trim() || "—" },
    { label: "Preferred contact", value: formatPreferredContactChannel(meta.preferredContactChannel) || "—" },
    { label: "Submitted", value: lead.createdAt || "—" },
    { label: "Page", value: lead.page?.trim() || "—" },
    { label: "Lead status", value: lead.leadStatus ?? LEAD_STATUS.NEW },
    { label: "Assigned admin", value: lead.assignedTo?.trim() || "—" },
    { label: "Admin notes", value: lead.adminNotes?.trim() || "—" },
    { label: "Notify email", value: formatLeadNotifyStatus(lead.notifyEmailStatus) },
    { label: "Notify time", value: lead.notifyEmailAt?.trim() || "—" },
    { label: "Notify error", value: lead.notifyEmailError?.trim() || "—" },
  ];
  return rows;
}

export const LEAD_CSV_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Company",
  "Contact name",
  "Market",
  "Enquiry type",
  "Product",
  "Quantity",
  "Products",
  "State",
  "City",
  "Country",
  "Destination",
  "Address",
  "Buyer type",
  "Message",
  "Status",
  "Source",
  "Preferred contact",
  "Page",
  "Created",
  "Assigned",
  "Notes",
  "Notify status",
  "Notify time",
  "Notify error",
];

export function leadCsvRow(lead: AdminLeadRecord): string[] {
  const fields = Object.fromEntries(leadEnquiryFields(lead).map((row) => [row.label, row.value]));
  return [
    fields["Buyer name"] ?? "",
    fields.Email ?? "",
    fields.Phone ?? "",
    fields.Company ?? "",
    fields["Contact name"] ?? "",
    fields.Market ?? "",
    fields["Enquiry type"] ?? "",
    fields.Product ?? "",
    fields.Quantity ?? "",
    fields.Products ?? "",
    fields.State ?? "",
    fields.City ?? "",
    fields.Country ?? "",
    fields.Destination ?? "",
    fields.Address ?? "",
    fields["Buyer type"] ?? "",
    fields.Message ?? "",
    fields["Lead status"] ?? "",
    fields.Source ?? "",
    fields["Preferred contact"] ?? "",
    fields.Page ?? "",
    fields.Submitted ?? "",
    fields["Assigned admin"] ?? "",
    fields["Admin notes"] ?? "",
    fields["Notify email"] ?? "",
    fields["Notify time"] ?? "",
    fields["Notify error"] ?? "",
  ];
}

export function leadsCountCaption(input: {
  total: number;
  filteredTotal?: number;
  filteredTotalExact?: boolean;
  loaded: number;
  filterApplied: boolean;
}): string {
  const totalLabel = `${input.total} stored lead${input.total === 1 ? "" : "s"}`;
  if (!input.filterApplied) {
    return `${totalLabel}. Showing ${input.loaded} on this page.`;
  }
  if (input.filteredTotalExact && input.filteredTotal != null) {
    return `${totalLabel}. ${input.filteredTotal} match the current filters. Showing ${input.loaded} on this page.`;
  }
  return `${totalLabel}. Showing ${input.loaded} matching lead${input.loaded === 1 ? "" : "s"} on this page. More matches may exist beyond this scan.`;
}
