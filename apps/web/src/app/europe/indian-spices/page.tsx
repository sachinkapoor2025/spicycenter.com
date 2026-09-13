import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Indian spices Europe",
  description: "Retail and bulk Indian spices for European customers when country shipping is configured.",
  path: "/europe/indian-spices",
});

export default function Page() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Indian spices in Europe</h1>
      <p className="mt-3 text-muted">EU distance-selling food information must be available before purchase. See <Link href="/legal/food-information" className="text-nav">food information</Link>.</p>
      <p className="mt-4"><Link href="/europe/bulk-indian-spices" className="text-nav">Bulk spices Europe</Link></p>
    </div>
  );
}
