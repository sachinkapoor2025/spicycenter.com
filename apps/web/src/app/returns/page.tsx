import type { Metadata } from "next";
import Link from "next/link";
import { ReturnsPolicy } from "@/components/ReturnsPolicy";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Returns & Satisfaction Guarantee",
  description: "SpicyCenter returns policy for damaged, incorrect or missing spice orders.",
  path: "/returns",
});

export default function ReturnsPage() {
  return (
    <div className="w-full px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-6">Returns &amp; Satisfaction Guarantee</h1>
      <ReturnsPolicy />
      <p className="mt-6 text-sm">
        <Link href="/legal/returns" className="text-nav font-semibold hover:underline">
          Legal returns policy
        </Link>
      </p>
    </div>
  );
}
