import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";

const TITLE = "Sourcing Partnerships | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: TITLE,
    description:
      "Importers, distributors, food businesses and freight partners can ask SpicyCenter about a sourcing referral. No partnership is claimed until it is agreed.",
    path: "/partnerships",
    absoluteTitle: true,
  }),
  TITLE,
);

export default function PartnershipsPage() {
  return (
    <article className="w-full px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">Partnership enquiries</h1>
      <p className="mt-4 text-muted leading-relaxed">
        SpicyCenter can talk with importers, distributors, food manufacturers, restaurants, freight forwarders and trade groups about referring spice sourcing requirements. This page does not list partners, because none are approved for publication.
      </p>
      <p className="mt-4">
        <Link href="/rfq" className="btn-primary inline-flex !w-auto px-5 py-2.5 text-sm font-semibold">Send a partnership note</Link>
      </p>
    </article>
  );
}
