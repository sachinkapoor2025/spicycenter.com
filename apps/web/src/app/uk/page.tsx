import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Indian spices UK | Buy online and wholesale",
  description:
    "Indian spices for the United Kingdom — retail packs and 10kg+ wholesale. GBP checkout display, postcode shipping quotes, food information and allergen fields.",
  path: "/uk",
});

export default function UkPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Indian spices for the United Kingdom</h1>
      <div className="mt-4 space-y-4 text-muted leading-relaxed">
        <p>
          The UK is our primary delivery market. Choose United Kingdom in the header, enter a postcode, and confirm the
          shipping quote on each product. Prices can be shown in GBP. We do not promise a local warehouse for every SKU.
        </p>
        <p>
          Shipping is quoted at checkout from a weight-based rule (configured in admin). Import duty and VAT are extra
          unless a rate is explicitly marked inclusive. Food-information and allergen fields exist so distance-selling
          rules can be met.
        </p>
        <p>
          Home cooks usually start with 100g–1kg of cumin, turmeric, chilli and coriander. Caterers and grocers move to
          5kg and 10kg+. Search understands jeera, haldi, Cuminum cyminum and “25kg”.
        </p>
        <p>
          Some dried spices from India can face increased official controls. We would rather tell you that on a
          compliance note than hide it behind a lifestyle banner.
        </p>
      </div>
      <p className="mt-8 text-muted leading-relaxed">
        Browse the{" "}
        <Link className="text-nav font-semibold hover:underline" href="/spices">
          Indian spice catalogue
        </Link>
        , request{" "}
        <Link className="text-nav font-semibold hover:underline" href="/uk/indian-spices-wholesale">
          Indian spice wholesale UK
        </Link>
        , or read{" "}
        <Link className="text-nav font-semibold hover:underline" href="/legal/shipping">
          UK shipping
        </Link>{" "}
        notes before you enquire.
      </p>
    </div>
  );
}
