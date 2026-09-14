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
      <div className="mt-4 space-y-4 text-muted leading-relaxed">
        <p>
          The UK is our primary delivery market. Choose United Kingdom in the header, enter a postcode, and confirm the
          shipping quote on each product. We do not promise a local warehouse for every SKU.
        </p>
        <p>
          Configurable shipping (default ₹750/kg, admin-editable) is shown separately from product price. Import duty and VAT
          are extra unless a rate is explicitly configured as inclusive. Food-information and allergen fields exist so
          distance-selling rules can be met.
        </p>
        <p>
          Home cooks usually start with 100g–1kg of cumin, turmeric, chilli and coriander. Caterers and grocers move to 5kg
          and 10kg+. Search understands jeera, haldi, Cuminum cyminum and “25kg”.
        </p>
        <p>
          Some dried spices from India can face increased official controls. We would rather tell you that on a compliance
          note than hide it behind a lifestyle banner.
        </p>
      </div>
      <ul className="mt-8 space-y-2">
        <li><Link className="text-nav" href="/uk/indian-spices">Indian spices UK catalogue</Link></li>
        <li><Link className="text-nav" href="/uk/bulk-indian-spices">Bulk Indian spices UK</Link></li>
        <li><Link className="text-nav" href="/uk/indian-spices-wholesale">Indian spices wholesale UK</Link></li>
        <li><Link className="text-nav" href="/legal/shipping">UK shipping rules</Link></li>
        <li><Link className="text-nav" href="/legal/food-information">Food information</Link></li>
      </ul>
    </div>
  );
}
