import { redirect } from "next/navigation";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function enquiryCountry(destination: string): string {
  const value = destination.trim().toUpperCase();
  if (value === "US") return "US";
  if (value === "CA") return "CA";
  if (value === "UK" || value === "GB") return "GB";
  if (/^[A-Z]{2}$/.test(value)) return value;
  return "";
}

export default async function BulkEnquiryRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  const product = firstValue(raw.product) || firstValue(raw.spice);
  const country = enquiryCountry(firstValue(raw.country) || firstValue(raw.destination));
  const quantity = firstValue(raw.quantity);
  if (product) params.set("product", product);
  if (country) params.set("country", country);
  if (quantity) params.set("quantity", quantity);
  const qs = params.toString();
  redirect(qs ? `/enquiry?${qs}` : "/enquiry");
}
