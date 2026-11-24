import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";

const TITLE = "Sourcing Case Studies | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: TITLE,
    description:
      "A template for real SpicyCenter sourcing examples. No client, volume or testimonial is published until a completed order can be described with permission.",
    path: "/case-studies",
    absoluteTitle: true,
  }),
  TITLE,
);

const FIELDS = [
  "Buyer requirement",
  "Product",
  "Required quantity",
  "Sourcing criteria",
  "Supplier options considered",
  "Comparison criteria",
  "Final outcome",
];

export default function CaseStudiesPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">Sourcing examples</h1>
      <p className="mt-4 text-muted leading-relaxed">
        No completed sourcing example is published yet. The layout below is a blank template. It is not a real client, order or volume.
      </p>
      <ol className="mt-8 space-y-4">
        {FIELDS.map((field) => (
          <li key={field} className="card-spice p-4">
            <h2 className="font-semibold text-primary">{field}</h2>
            <p className="mt-1 text-sm text-muted">Pending a completed order that can be described with permission.</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm">
        <Link href="/rfq" className="text-nav font-semibold">Submit a sourcing requirement</Link>
      </p>
    </article>
  );
}
