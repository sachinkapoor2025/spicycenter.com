import type { Metadata } from "next";
import Link from "next/link";
import { site, whatsappChatUrl } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Returns & Satisfaction Guarantee",
  description: `SpicyCorner returns, replacements, and satisfaction guarantee for spice orders delivered in the USA.`,
  path: "/returns",
});

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-6">Returns &amp; Satisfaction Guarantee</h1>
      <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
        <p>
          At {site.name}, we want every spice delivery to feel special. If something goes wrong with your
          order, we will make it right.
        </p>
        <h2 className="text-xl font-bold text-primary">Damaged or incorrect items</h2>
        <p>
          Contact us within <strong>48 hours</strong> of delivery with your order number and photos. We offer a
          replacement or full refund for items that arrive damaged, defective, or incorrect.
        </p>
        <h2 className="text-xl font-bold text-primary">Delivery issues</h2>
        <p>
          If your spice has not arrived within the estimated 5–7 day window, reach out on{" "}
          <a
            href={whatsappChatUrl("Hi SpicyCorner, my order has not arrived yet.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-nav underline"
          >
            WhatsApp
          </a>{" "}
          or email {site.supportEmail}. We will track your shipment and resolve the issue
          promptly.
        </p>
        <h2 className="text-xl font-bold text-primary">Cancellations</h2>
        <p>
          Orders can be cancelled before dispatch. Once shipped within the USA, cancellations may not be possible —
          contact us immediately and we will do our best to help.
        </p>
        <h2 className="text-xl font-bold text-primary">How to request help</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Email:{" "}
            <a href={`mailto:${site.supportEmail}`} className="text-nav underline">
              {site.supportEmail}
            </a>
          </li>
          <li>
            <a
              href={whatsappChatUrl("Hi SpicyCorner, I need help with a return.")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nav underline"
            >
              WhatsApp
            </a>
          </li>
          <li>
            <Link href="/contact" className="text-nav underline">
              Contact form
            </Link>
          </li>
        </ul>
        <p className="text-slate-500 text-sm">Last updated: June 2025</p>
        <Link href="/" className="text-nav font-semibold hover:underline inline-block">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
