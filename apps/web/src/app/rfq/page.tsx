import type { Metadata } from "next";
import { RfqForm } from "@/components/RfqForm";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { loadSpiceEntities } from "@/lib/spice-data";

const TITLE = "Submit a Spice Sourcing Requirement | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: TITLE,
    description:
      "Send SpicyCenter a spice sourcing requirement. We identify suitable independent Indian suppliers and compare quotations that are actually received.",
    path: "/rfq",
    absoluteTitle: true,
  }),
  TITLE,
);

export default async function RfqPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product = "" } = await searchParams;
  const products = loadSpiceEntities().map((spice) => spice.canonicalName);
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">Submit your requirement</h1>
      <p className="mt-3 max-w-2xl text-muted leading-relaxed">
        Tell us the product, quantity and destination. SpicyCenter reviews the brief, approaches suitable independent suppliers, and shares only quotations that are received.
      </p>
      <div className="mt-8">
        <RfqForm products={products} defaultProduct={product} />
      </div>
    </div>
  );
}
