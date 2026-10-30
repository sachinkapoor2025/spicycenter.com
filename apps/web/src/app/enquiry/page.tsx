import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

export const metadata: Metadata = pageMetadata({
  title: "Enquire Now — Indian spice catalogue",
  description:
    "Send a business enquiry with your name, company, email, phone, product and requirements. Worldwide delivery is confirmed in the reply.",
  path: "/enquiry",
});

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
