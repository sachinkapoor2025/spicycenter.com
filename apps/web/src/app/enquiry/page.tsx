import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

const ENQUIRY_META_TITLE = "Bulk Spice Enquiry: Request a Wholesale Quote | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: ENQUIRY_META_TITLE,
    description:
      "Request a wholesale quote for Indian spices, from 100 gm to 1 metric ton. Tell us your quantity and destination for the UK, Europe or worldwide and we will reply.",
    path: "/enquiry",
    absoluteTitle: true,
  }),
  ENQUIRY_META_TITLE,
);

export default async function EnquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; country?: string; destination?: string; quantity?: string }>;
}) {
  const { product = "", country = "", destination = "", quantity = "" } = await searchParams;
  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 overflow-x-clip">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Enquire Now", path: "/enquiry" }]} />
      <h1 className="spice-heading text-2xl sm:text-3xl mt-3">Enquire about Indian spices</h1>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        Tell us the destination, the spices, and how we can help.{" "}
        <Link href="/contact" className="text-nav font-semibold">
          General contact
        </Link>
      </p>
      <div className="mt-4">
        <WholesaleQuoteForm
          defaultProduct={product}
          defaultCountry={country || destination}
          defaultQuantity={quantity}
        />
      </div>
    </div>
  );
}
