import Link from "next/link";

export function FreeEnquiryCtas({
  productName,
  spiceQuery,
  destination,
}: {
  productName?: string;
  spiceQuery?: string;
  destination?: string | null;
}) {
  const wholesale = productName
    ? `/wholesale?product=${encodeURIComponent(productName)}`
    : "/wholesale";
  const bulk = new URLSearchParams();
  if (spiceQuery) bulk.set("spice", spiceQuery);
  if (destination) bulk.set("destination", destination);
  const bulkHref = bulk.toString() ? `/bulk-enquiry?${bulk}` : "/bulk-enquiry";

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={wholesale}
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
