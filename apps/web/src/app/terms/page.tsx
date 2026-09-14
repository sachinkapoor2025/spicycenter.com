import type { Metadata } from "next";
import Link from "next/link";
import { site, whatsappChatUrl } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms & Conditions",
  description: `Terms and conditions for shopping on ${site.name} — spice delivery to the USA.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-6">Terms &amp; Conditions</h1>
      <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
        <p>
          Welcome to {site.name}.com. By placing an order on our website, you agree to the following terms.
        </p>
        <h2 className="text-xl font-bold text-primary">Orders &amp; delivery</h2>
        <p>
          We deliver spice items to addresses within the United States. Delivery times are estimates (typically 5–7
          business days) and may vary by location. You are responsible for providing an accurate US shipping address
          at checkout.
        </p>
        <h2 className="text-xl font-bold text-primary">Pricing &amp; payment</h2>
        <p>
          Prices are shown in USD or INR at checkout. Payment is processed securely through Stripe (USD) or Razorpay
          (INR). We do not store card details on our servers.
        </p>
        <h2 className="text-xl font-bold text-primary">Cancellations &amp; support</h2>
        <p>
          For order changes, cancellations, or delivery issues, contact us at{" "}
          <a href={`mailto:${site.supportEmail}`} className="text-nav underline">
            {site.supportEmail}
          </a>{" "}
          or{" "}
          <a
            href={whatsappChatUrl("Hi SpicyCenter, I have a question about my order.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-nav underline"
          >
            WhatsApp
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
