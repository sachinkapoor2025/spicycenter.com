import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Indian spices UK",
  description: "Buy Indian spices in the UK — retail and wholesale. Shipping, food information and import controls explained.",
  path: "/uk",
});

export default function UkPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Indian spices for the United Kingdom</h1>
      <p className="mt-4 text-muted">
        Primary market. Configurable shipping (default ₹750/kg, admin-editable). Food-information and allergen fields
        exist so distance-selling rules can be met. Some dried spices from India can face increased official controls.
      </p>
      <ul className="mt-6 space-y-2">
        <li><Link className="text-nav" href="/uk/indian-spices">Indian spices UK</Link></li>
        <li><Link className="text-nav" href="/uk/bulk-indian-spices">Bulk Indian spices UK</Link></li>
        <li><Link className="text-nav" href="/uk/indian-spices-wholesale">Indian spices wholesale UK</Link></li>
      </ul>
    </div>
  );
}
