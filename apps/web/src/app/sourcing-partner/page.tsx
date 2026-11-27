import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";

const TITLE = "Indian Spice Sourcing Partner | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: TITLE,
    description:
      "SpicyCenter is an independent sourcing partner for buyers who need Indian spices. Share a requirement for cumin, turmeric or other spices and compare the quotations suppliers provide.",
    path: "/sourcing-partner",
    absoluteTitle: true,
  }),
  TITLE,
);

export default function SourcingPartnerPage() {
  return (
    <article className="w-full px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">An independent sourcing partner for Indian spices</h1>
      <p className="mt-4 text-muted leading-relaxed">
        Buyers use SpicyCenter when they want help finding an Indian spice supplier, not a shop that claims to own the stock. A requirement can cover bulk cumin, bulk turmeric, mixed spice procurement or another named product.
      </p>
      <h2 className="font-serif text-2xl text-primary mt-8">What the service covers</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
        <li>A written requirement with quantity, grade, packaging and destination.</li>
        <li>A search of independent suppliers who say they can offer that product.</li>
        <li>A comparison of the quotations that come back. Missing fields stay pending.</li>
        <li>An introduction to the supplier the buyer chooses, plus only the coordination that was agreed.</li>
      </ul>
      <h2 className="font-serif text-2xl text-primary mt-8">Related pages</h2>
      <ul className="mt-3 space-y-2 text-sm">
        <li><Link className="text-nav" href="/buyers/uk">Sourcing notes for UK buyers</Link></li>
        <li><Link className="text-nav" href="/buyers/uae">Sourcing notes for UAE buyers</Link></li>
        <li><Link className="text-nav" href="/buyers/importers">Notes for international importers</Link></li>
        <li><Link className="text-nav" href="/spices/cumin">Cumin in the catalogue</Link></li>
        <li><Link className="text-nav" href="/spices/turmeric">Turmeric in the catalogue</Link></li>
      </ul>
      <p className="mt-8">
        <Link href="/rfq" className="btn-primary inline-flex !w-auto px-5 py-2.5 text-sm font-semibold">Submit your requirement</Link>
      </p>
    </article>
  );
}
