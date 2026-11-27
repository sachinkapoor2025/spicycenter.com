import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";

const PAGES = {
  uk: {
    title: "Source Indian Spices for UK Buyers | SpicyCenter",
    h1: "Indian spice sourcing for UK buyers",
    description: "UK buyers can send SpicyCenter a spice requirement. Import checks, delivery and price are confirmed for the order and are not guaranteed on this page.",
    intro: "This page is for businesses buying for the United Kingdom. SpicyCenter can take the requirement, look for independent Indian suppliers, and share the quotations those suppliers return.",
    note: "UK import controls, labelling and duty depend on the product and the shipment. SpicyCenter does not publish a clearance time or a duty rate, and it does not claim a UK warehouse on this page.",
  },
  uae: {
    title: "Indian Spice Sourcing for UAE Buyers | SpicyCenter",
    h1: "Indian spice sourcing for UAE buyers",
    description: "UAE buyers can send a spice sourcing requirement to SpicyCenter. Destination documents, price and availability are confirmed with the supplier.",
    intro: "Buyers supplying the UAE can use the same requirement form. Name the emirate or port, the spice, the form and the quantity so suitable suppliers can be approached.",
    note: "SpicyCenter does not claim a Dubai warehouse or a guaranteed customs time. Documents and delivery terms are confirmed for the named shipment.",
  },
  importers: {
    title: "Bulk Indian Spices for International Importers | SpicyCenter",
    h1: "Bulk Indian spices for international importers",
    description: "Importers can ask SpicyCenter to compare independent Indian spice quotations. Export ability to a country is confirmed per order, not assumed.",
    intro: "Importers can send one requirement for a named spice, quantity and destination. SpicyCenter does not treat a catalogue page as proof that a container is available.",
    note: "The exporter of record, documents and freight responsibility are agreed in the order. A page on this website is not that agreement.",
  },
} as const;

type Market = keyof typeof PAGES;

export function generateStaticParams() {
  return Object.keys(PAGES).map((market) => ({ market }));
}

export async function generateMetadata({ params }: { params: Promise<{ market: string }> }): Promise<Metadata> {
  const { market } = await params;
  const page = PAGES[market as Market];
  if (!page) return { title: "Sourcing" };
  return withAbsoluteSocialTitle(
    pageMetadata({ title: page.title, description: page.description, path: `/buyers/${market}`, absoluteTitle: true }),
    page.title,
  );
}

export default async function DestinationSourcingPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  const page = PAGES[market as Market];
  if (!page) notFound();
  return (
    <article className="w-full px-4 py-10">
      <h1 className="spice-heading text-3xl sm:text-4xl">{page.h1}</h1>
      <p className="mt-4 text-muted leading-relaxed">{page.intro}</p>
      <h2 className="font-serif text-2xl text-primary mt-8">What to include</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
        <li>Product name, form and the grade you need.</li>
        <li>Quantity, packaging and the destination port if you know it.</li>
        <li>Any document or sample you need, and who should pay for it.</li>
      </ul>
      <h2 className="font-serif text-2xl text-primary mt-8">Destination notes</h2>
      <p className="mt-3 text-muted leading-relaxed">{page.note}</p>
      <p className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/rfq" className="btn-primary inline-flex !w-auto px-5 py-2.5 font-semibold">Submit your requirement</Link>
        <Link href="/contact" className="self-center font-semibold text-nav">Contact the team</Link>
      </p>
    </article>
  );
}
