import type { Metadata } from "next";
import Link from "next/link";
import { faqs, site } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
    title: "FAQ — Indian spices, bulk orders and UK shipping",
  description:
    "Questions about retail packs, 10kg wholesale, market prices, allergens and UK/EU delivery.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd data={faqJsonLd(faqs)} />
      <h1 className="text-3xl font-bold text-primary mb-2">Frequently Asked Questions</h1>
      <p className="text-slate-600 mb-8">
        Short answers about packs, wholesale, shipping and food information with {site.name}.
      </p>
      <div className="space-y-4">
        {faqs.map((f) => (
          <details key={f.q} className="border border-slate-200 rounded-lg p-5 bg-white group">
            <summary className="font-semibold text-primary cursor-pointer list-none flex justify-between items-start gap-4">
              <span>{f.q}</span>
              <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="text-slate-600 mt-3 leading-relaxed">
              {f.q === "What is the minimum bulk order?" ? (
                <>
                  <Link href="/wholesale" className="text-nav font-semibold hover:underline">
                    Wholesale Indian spices
                  </Link>{" "}
                  start at 10kg per bulk line. Larger bags (25kg, 50kg, 100kg+) and custom quantities can be quoted.
                </>
              ) : f.q === "How is UK shipping calculated?" ? (
                <>
                  Shipping is quoted in GBP for{" "}
                  <Link href="/uk" className="text-nav font-semibold hover:underline">
                    Indian spices UK
                  </Link>{" "}
                  deliveries (EUR where an EU country rate is configured) from a per-kilogram rule. Import duty and VAT are extra unless a rule is marked inclusive.
                </>
              ) : f.q === "What is the difference between whole and ground spices?" ? (
                <>
                  See{" "}
                  <Link href="/spice-guide/comparisons/whole-spices-vs-ground-spices" className="text-nav font-semibold hover:underline">
                    whole spices vs ground spices
                  </Link>
                  : whole spices keep aroma longer; grind or crush just before cooking when you can. Ground spices are convenient for everyday tadka and masala blends but fade faster if stored warm or in light.
                </>
              ) : (
                f.a
              )}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
