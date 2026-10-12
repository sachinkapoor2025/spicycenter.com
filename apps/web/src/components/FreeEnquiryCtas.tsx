import Link from "next/link";

function enquiryCountry(destination?: string | null): string {
  if (destination === "US") return "US";
  if (destination === "CA") return "CA";
  if (destination === "UK") return "GB";
  return "";
}

export function FreeEnquiryCtas({
  productName,
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

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={enquiryHref}
        className="inline-flex items-center rounded-xl bg-nav text-white px-4 py-2.5 text-sm font-semibold"
      >
        Enquire Now
      </Link>
      <Link href="/contact" className="inline-flex items-center text-sm font-semibold text-nav px-1 py-2.5">
        Product information
      </Link>
    </div>
  );
}
