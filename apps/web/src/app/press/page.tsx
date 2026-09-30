import type { Metadata } from "next";
import Link from "next/link";
import { site, whatsappChatUrl } from "@/lib/site";
import { siteUrl } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { SiteLogoLink } from "@/components/SiteLogo";

export const metadata: Metadata = pageMetadata({
  title: "Press Kit & Media",
  description: `Media resources, brand story, and contact information for journalists covering ${site.name} and spice delivery to the USA.`,
  path: "/press",
});

export default function PressPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-6">Press Kit</h1>
      <div className="space-y-8 text-slate-700 leading-relaxed">
        <div>
          <SiteLogoLink size="desktop" className="mb-4" />
          <p className="text-sm text-slate-500">High-resolution logo available on request</p>
        </div>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">About {site.name}</h2>
          <p>
            {site.name} ({siteUrl}) is a dedicated online spice shop operated by Divit Global Ventures, selling
            Indian spice catalogue for worldwide business enquiries. Origin: India.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">Taglines</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Main tagline: {site.tagline}</li>
            <li>Homepage: {site.homepageTagline}</li>
            <li>{site.homepageSubline}</li>
            <li>{site.promise}</li>
          </ul>
          <p className="text-sm mt-3">
            Social profiles and link previews should use the logo and these lines together. Share image: {siteUrl}{site.socialImage}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">Key facts</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Indian spice catalogue. Origin: India.</li>
            <li>One enquiry per product. The buyer types the quantity.</li>
            <li>Prices are not published on the website.</li>
            <li>Worldwide delivery arranged through enquiry</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">Media contact</h2>
          <p>
            Email:{" "}
            <a href={`mailto:${site.supportEmail}`} className="text-nav underline">
              {site.supportEmail}
            </a>
            <br />
            WhatsApp:{" "}
            <a
              href={whatsappChatUrl("Hi SpicyCenter, media enquiry.")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nav underline"
            >
              Chat on WhatsApp
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">Suggested story angles</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Dedicated spice e-commerce with 5–7 day delivery</li>
            <li>How families prep seasonal yards and parties with same-week delivery</li>
            <li>Premium spice decor and spices for 2026 season shopping</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">AI &amp; machine-readable resources</h2>
          <p className="text-sm">
            <Link href="/llms.txt" className="text-nav underline">
              llms.txt
            </Link>
            {" · "}
            <Link href="/llms-full.txt" className="text-nav underline">
              llms-full.txt
            </Link>
            {" · "}
            <Link href="/humans.txt" className="text-nav underline">
              humans.txt
            </Link>
          </p>
        </section>

        <Link href="/about" className="text-nav font-semibold hover:underline">
          Read full About Us →
        </Link>
      </div>
    </div>
  );
}
