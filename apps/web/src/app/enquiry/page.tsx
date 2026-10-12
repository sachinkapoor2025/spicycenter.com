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
  searchParams: Promise<{ product?: string; country?: string; quantity?: string }>;
}) {
  const { product = "", country = "", quantity = "" } = await searchParams;
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 overflow-x-clip">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Enquire Now", path: "/enquiry" }]} />
      <p className="spice-kicker mt-4">Business enquiry</p>
      <h1 className="spice-heading text-3xl sm:text-4xl mt-2">Let&apos;s discuss your spice requirements.</h1>
      <p className="mt-3 text-muted leading-relaxed">
        Tell us what you&apos;re sourcing, where you need delivery, and how we can help.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/contact" className="text-nav font-semibold">
          General contact
        </Link>
      </p>
      <div className="mt-6">
        <WholesaleQuoteForm defaultProduct={product} defaultCountry={country} defaultQuantity={quantity} />
      </div>
    </div>
  );
}
