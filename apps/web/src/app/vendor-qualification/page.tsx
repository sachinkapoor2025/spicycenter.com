import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";

const TITLE = "Vendor Qualification Process | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: TITLE,
    description:
      "How SpicyCenter reviews independent Indian spice suppliers before introducing them: identity, product capability, documents received, references and the date of the last check.",
    path: "/vendor-qualification",
    absoluteTitle: true,
  }),
  TITLE,
);

const CHECKS = [
  ["Business identity", "The supplier's business name and location are recorded. A name on file is not the same as a completed identity check."],
  ["Product capability", "We record which products, forms and grades the supplier says it can offer. Capability is confirmed again for the enquiry."],
  ["Documents received", "Licences or certificates are stored only when the supplier provides them. A document on file is not an independent certification by SpicyCenter."],
  ["References", "Trade references are requested when they are relevant. They are not published as testimonials unless the buyer and supplier agree."],
  ["Specifications", "Grade, packaging and test requirements stay marked pending until the supplier confirms them for the lot."],
  ["Samples", "A sample can be requested in the requirement. Who arranges it, and who pays, is agreed before it is sent."],
  ["Last verification date", "Each vendor record can store the date it was last reviewed. No vendor is marked verified without that date."],
];

export default function VendorQualificationPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">How suppliers are reviewed</h1>
      <p className="mt-4 text-muted leading-relaxed">
        SpicyCenter introduces buyers to independent suppliers. A review note on a vendor record is an internal check, not a guarantee that every lot is certified, inspected or in stock.
      </p>
      <div className="mt-8 space-y-6">
        {CHECKS.map(([title, body]) => (
          <section key={title}>
            <h2 className="font-serif text-2xl text-primary">{title}</h2>
            <p className="mt-2 text-muted leading-relaxed">{body}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm">
        <Link href="/rfq" className="text-nav font-semibold">Submit a sourcing requirement</Link>
      </p>
    </article>
  );
}
