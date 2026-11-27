import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";
import { site } from "@/lib/site";

const TITLE = "Sourcing Role and Transaction Terms | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: TITLE,
    description:
      "SpicyCenter provides sourcing assistance and supplier introductions. Commission, invoicing, freight and liability are agreed in writing for each order and are not published as a fixed rate.",
    path: "/commercial-terms",
    absoluteTitle: true,
  }),
  TITLE,
);

export default function CommercialTermsPage() {
  return (
    <article className="w-full px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">What SpicyCenter does in a transaction</h1>
      <div className="mt-6 space-y-4 text-muted leading-relaxed">
        <p>SpicyCenter can help with a sourcing brief, introduce independent Indian suppliers, and coordinate the quotations that those suppliers provide.</p>
        <p>Logistics, inspection and samples are arranged only when that service is agreed for the order. SpicyCenter does not automatically act as the exporter, importer, insurer or warehouse.</p>
        <p>A commission, service fee or trading margin is agreed in writing with the parties to that order. No rate is published here because it is not a single public tariff.</p>
        <p>Payment route, invoicing, taxes, claims, cancellation and disputes are confirmed in the order documents. They are not implied by a page on this website.</p>
      </div>
      <h2 className="font-serif text-2xl text-primary mt-8">Questions and complaints</h2>
      <p className="mt-3 text-muted leading-relaxed">
        Write to {site.contactEmail} or use the <Link href="/contact" className="text-nav font-semibold">contact form</Link>. Include the requirement date, product and destination so the message can be matched to the enquiry.
      </p>
    </article>
  );
}
