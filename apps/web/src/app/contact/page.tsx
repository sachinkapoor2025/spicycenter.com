import type { Metadata } from "next";
import { pageMetadata, contactPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { RfqForm } from "@/components/RfqForm";
import { loadSpiceEntities } from "@/lib/spice-data";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = pageMetadata({
  title: "Contact SpicyCenter: Indian Spice Supplier",
  description:
    "Get in touch with SpicyCenter about Indian spices and bulk enquiries for the UK, Europe and worldwide. Email or WhatsApp our team.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={contactPageJsonLd()} />
      <ContactForm />
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="font-serif text-2xl text-primary">Submit a sourcing requirement</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Use this form for a product, quantity and destination. Order questions can stay in the contact form above.
        </p>
        <div className="mt-6">
          <RfqForm products={loadSpiceEntities().map((spice) => spice.canonicalName)} />
        </div>
      </section>
    </>
  );
}
