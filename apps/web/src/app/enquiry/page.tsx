import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

export const metadata: Metadata = pageMetadata({
  title: "Free sourcing enquiry — spices and vegetarian foods",
  description:
    "Send a free wholesale or bulk sourcing enquiry. Optional sample and document add-ons are paid only if you choose them on a UK/EU 100kg+ quote.",
  path: "/enquiry",
});

export default async function EnquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; country?: string }>;
}) {
  const { product = "", country = "" } = await searchParams;
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <p className="spice-kicker">B2B enquiry</p>
      <h1 className="spice-heading text-4xl mt-2">Free sourcing enquiry</h1>
      <p className="mt-4 text-muted leading-relaxed">
        Standard enquiry is free. Use this form for 10kg+ wholesale or other vegetarian families that are not yet retail
        SKUs. For 100kg+ cargo with optional paid add-ons, use the bulk form.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/bulk-enquiry" className="text-nav font-semibold">
          100kg+ bulk enquiry
        </Link>
        {" · "}
        <Link href="/contact" className="text-nav font-semibold">
          General contact
        </Link>
      </p>
      <div className="mt-8">
        <WholesaleQuoteForm defaultProduct={product} defaultCountry={country} />
      </div>
    </div>
  );
}
