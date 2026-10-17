import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
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
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Free enquiry", path: "/enquiry" }]} />
      <p className="spice-kicker">B2B enquiry</p>
      <h1 className="spice-heading text-4xl mt-2">Free sourcing enquiry</h1>
      <p className="mt-4 text-muted leading-relaxed">
        Standard enquiry is free. Use this form for 10kg+{" "}
        <Link href="/wholesale" className="text-nav font-semibold hover:underline">
          wholesale Indian spices
        </Link>{" "}
        or other vegetarian families that are not yet retail SKUs. For 100kg+ cargo use the{" "}
        <Link href="/bulk-enquiry" className="text-nav font-semibold hover:underline">
          bulk spice enquiry
        </Link>
        . Retail questions can go through{" "}
        <Link href="/contact" className="text-nav font-semibold hover:underline">
          contact us
        </Link>
        .
      </p>
      <div className="mt-8">
        <WholesaleQuoteForm defaultProduct={product} defaultCountry={country} />
      </div>
    </div>
  );
}
