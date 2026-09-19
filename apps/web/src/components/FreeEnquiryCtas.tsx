import Link from "next/link";

function enquiryCountry(destination?: string | null): string {
  if (destination === "US") return "US";
  if (destination === "CA") return "CA";
  if (destination === "UK") return "GB";
  return "";
}

export function FreeEnquiryCtas({
  productName,
  spiceQuery,
  destination,
}: {
  productName?: string;
  spiceQuery?: string;
  destination?: string | null;
}) {
  const enquiry = new URLSearchParams();
  if (productName) enquiry.set("product", productName);
  const country = enquiryCountry(destination);
  if (country) enquiry.set("country", country);
  const enquiryHref = enquiry.toString() ? `/enquiry?${enquiry}` : "/enquiry";

  const bulk = new URLSearchParams();
  if (spiceQuery) bulk.set("spice", spiceQuery);
  if (destination) bulk.set("destination", destination);
  const bulkHref = bulk.toString() ? `/bulk-enquiry?${bulk}` : "/bulk-enquiry";

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={enquiryHref}
        className="inline-flex items-center rounded-xl bg-nav text-white px-4 py-2.5 text-sm font-semibold"
      >
        Send free enquiry
      </Link>
      <Link
        href={bulkHref}
        className="inline-flex items-center rounded-xl border border-[#e6d5bc] bg-white px-4 py-2.5 text-sm font-semibold text-primary"
      >
        Request bulk quote (100kg+)
      </Link>
      <Link href="/contact" className="inline-flex items-center text-sm font-semibold text-nav px-1 py-2.5">
        Product information
      </Link>
    </div>
  );
}
