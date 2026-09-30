import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

export const metadata: Metadata = pageMetadata({
  title: "Enquire Now — Indian spice catalogue",
  description:
    "Send a business enquiry with your name, company, email, phone, country, product, pack size and requirements. Worldwide delivery is confirmed in the reply.",
  path: "/enquiry",
});

export default async function EnquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; country?: string; quantity?: string }>;
}) {
  const { product = "", country = "", quantity = "" } = await searchParams;
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Free enquiry", path: "/enquiry" }]} />
      <p className="spice-kicker">Business enquiry</p>
      <h1 className="spice-heading text-4xl mt-2">Enquire Now</h1>
      <p className="mt-4 text-muted leading-relaxed">
        One form for any spice and any quantity you type yourself. Tell us who you buy for — wholesaler, retailer,
        restaurant, foodservice or private label — and we reply with availability. This website does not publish prices.
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
        <WholesaleQuoteForm defaultProduct={product} defaultCountry={country} defaultQuantity={quantity} />
      </div>
    </div>
  );
}
