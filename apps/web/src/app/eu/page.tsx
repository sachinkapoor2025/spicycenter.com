import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Indian spices Europe",
  description: "EU expansion for Indian spices. Country pages only when shipping and compliance are configured.",
  path: "/eu",
});

export default function EuPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Indian spices for the EU</h1>
      <p className="mt-4 text-muted">
        Secondary market. We will not publish empty doorway pages for every member state. When a country has a shipping
        rate and food-information workflow, it gets a landing page.
      </p>
      <p className="mt-4"><Link href="/europe/indian-spices" className="text-nav">Europe spices overview →</Link></p>
    </div>
  );
}
