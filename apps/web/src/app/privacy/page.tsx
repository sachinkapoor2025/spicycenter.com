import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses, and protects your information when you shop at SpicyCenter.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-6">Privacy Policy</h1>
      <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
        <p>
          {site.name} (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains how we handle
          information when you use {site.domain}.
        </p>
        <h2 className="text-xl font-bold text-primary">Information we collect</h2>
        <p>
          When you shop or contact us, we may collect your name, email, phone number, shipping address, order details,
          and payment status from our payment partners (Stripe or Razorpay). We do not store full card numbers.
        </p>
        <h2 className="text-xl font-bold text-primary">How we use information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Process and deliver your orders</li>
          <li>Send order updates and respond to support requests</li>
          <li>Improve our website and customer experience</li>
          <li>Comply with legal obligations</li>
        </ul>
        <h2 className="text-xl font-bold text-primary">Sharing</h2>
        <p>
          We share data only with service providers needed to fulfill orders (payment processors, shipping partners)
          and when required by law. We do not sell your personal information.
        </p>
        <h2 className="text-xl font-bold text-primary">Contact</h2>
        <p>
          Questions about privacy? Email{" "}
          <a href={`mailto:${site.supportEmail}`} className="text-nav underline">
            {site.supportEmail}
          </a>
          .
        </p>
        <p className="text-slate-500 text-sm">Last updated: June 2025</p>
        <p>
          <Link href="/" className="text-nav font-semibold hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
