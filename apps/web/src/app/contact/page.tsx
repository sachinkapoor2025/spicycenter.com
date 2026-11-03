import type { Metadata } from "next";
import { pageMetadata, contactPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
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
    </>
  );
}
