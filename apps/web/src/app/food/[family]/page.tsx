import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { FOOD_FAMILIES, getFoodFamily } from "@/lib/food-families";
import { FreeEnquiryCtas } from "@/components/FreeEnquiryCtas";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";

interface Props {
  params: Promise<{ family: string }>;
}

export function generateStaticParams() {
  return FOOD_FAMILIES.map((f) => ({ family: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { family } = await params;
  const item = getFoodFamily(family);
  if (!item) return { title: "Food sourcing" };
  return pageMetadata({
    title: `${item.name} from India — free sourcing enquiry`,
    description: item.summary,
    path: `/food/${family}`,
  });
}

export default async function FoodFamilyPage({ params }: Props) {
  const { family } = await params;
  const item = getFoodFamily(family);
  if (!item) notFound();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="spice-kicker">
        <Link href="/food" className="text-nav">
          Food families
        </Link>
      </p>
      <h1 className="spice-heading text-4xl mt-2">{item.name} sourcing</h1>
      <p className="mt-4 text-muted leading-relaxed">{item.summary}</p>
      <p className="mt-3 text-sm text-muted">
        {item.inCatalog
          ? "Some seed spices in this family are already in the shop. Use the links in the header or send a wholesale note."
          : "This family is not a priced retail catalogue on spicycenter.com yet. Send a free enquiry with variety, grade, kilos and destination."}
      </p>
      <p className="mt-3 text-sm text-muted">Examples buyers mention: {item.examples.join(", ")}.</p>
      <FreeEnquiryCtas productName={item.name} />
      <div className="mt-8">
        <WholesaleQuoteForm defaultProduct={item.name} />
      </div>
    </div>
  );
}
