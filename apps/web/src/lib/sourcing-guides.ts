export type SourcingGuide = {
  slug: string;
  title: string;
  description: string;
  sections: { heading: string; body: string }[];
};

export const SOURCING_GUIDES: SourcingGuide[] = [
  {
    slug: "bulk-sourcing",
    title: "Bulk spice sourcing from India",
    description: "How SpicyCenter takes 10kg+ wholesale and 100kg+ export enquiries. Free to submit.",
    sections: [
      {
        heading: "What this service is",
        body: "SpicyCenter quotes Indian spices for retail (UK/EU), wholesale from 10kg, and cargo-style bulk from 100kg. Rice, pulses and makhana can be requested as sourcing enquiries even when they are not yet retail SKUs.",
      },
      {
        heading: "What we do not invent",
        body: "We do not publish a fake MOQ, lab certificate, GI claim or sailing date until the lot supports it. The enquiry form is free. Optional sample or document add-ons are charged only if you select them on a UK/EU 100kg+ quote.",
      },
    ],
  },
  {
    slug: "packaging",
    title: "Packaging and storage for export spices",
    description: "Food-grade packing and moisture notes for Indian spices. Specific pack sizes are confirmed on quote.",
    sections: [
      {
        heading: "Typical trade packs",
        body: "Retail jars and 100g–5kg bags sit alongside 10kg, 25kg and 50kg wholesale bags. Export lining, desiccant and carton marks are agreed on the enquiry — not promised as a universal spec on this page.",
      },
      {
        heading: "Storage",
        body: "Dried spices need cool, dry storage away from strong light. Moisture-sensitive lots may need extra lining. We do not claim a shelf-life number that the pack label does not carry.",
      },
    ],
  },
  {
    slug: "import-documentation",
    title: "Import documentation education",
    description: "Educational notes on documents buyers often ask for. Not legal advice and not a promise that every shipment includes every paper.",
    sections: [
      {
        heading: "Common buyer questions",
        body: "Importers often ask about commercial invoice, packing list, certificate of origin, and phytosanitary or lab tests. Requirements differ by destination. SpicyCenter will say what we can supply for a named lot — we will not list certificates we cannot issue.",
      },
      {
        heading: "Optional help",
        body: "UK/EU 100kg+ enquiries can add an optional documentation add-on. The standard enquiry stays free if you skip add-ons. United States and Canada bulk enquiries are not charged online.",
      },
    ],
  },
  {
    slug: "whole-versus-ground",
    title: "Whole spices versus powder",
    description: "Buyer notes on form, grind and shelf behaviour. Not a health claim.",
    sections: [
      {
        heading: "Form matters on the quote",
        body: "Whole seed, crushed and powder are different SKUs. Powder can stale faster. Tell us the form you need. Culinary use is not a medical claim.",
      },
    ],
  },
  {
    slug: "gcc-import",
    title: "GCC spice import notes",
    description: "Educational UAE/Saudi/Qatar/Oman buyer notes. Transit, certs and MOQ are confirmed on a named quote.",
    sections: [
      {
        heading: "What this page covers",
        body: "Gulf buyers often ask about Halal paperwork, Arabic labels, and heat during sea transit. SpicyCenter can discuss those on an enquiry. We do not invent a warehouse in Dubai or a guaranteed customs clearance time.",
      },
      {
        heading: "How to enquire",
        body: "Use a free wholesale or 100kg+ bulk form. Name the destination emirate or kingdom, pack size and spice form. Optional UK/EU sample add-ons do not apply as an online charge for every GCC destination.",
      },
    ],
  },
  {
    slug: "africa-import",
    title: "Africa spice import notes",
    description: "Educational notes for African importers. Port, duty and certificate lists differ by country.",
    sections: [
      {
        heading: "What we will not invent",
        body: "Nigeria, Kenya, South Africa, Ghana and other markets have different food-import rules. This page does not publish a fake HS duty or phytosanitary list. Ask on the enquiry and we confirm against the lot.",
      },
      {
        heading: "Enquiry",
        body: "Send destination port, kilos and whether you need whole or ground. Standard enquiry is free.",
      },
    ],
  },
  {
    slug: "latam-import",
    title: "Latin America spice import notes",
    description: "Educational notes for Mexico, Brazil and other LATAM buyers. Not a local warehouse claim.",
    sections: [
      {
        heading: "Scope",
        body: "Spanish- or Portuguese-language paperwork, cold-chain (not required for dry spices), and local registration are buyer-side topics. We do not claim a bonded warehouse in São Paulo or Mexico City.",
      },
      {
        heading: "Enquiry",
        body: "Tell us country, city of delivery, kilos and spice names. We quote from India. We do not invent certified stock we do not hold.",
      },
    ],
  },
];

export function getSourcingGuide(slug: string): SourcingGuide | undefined {
  return SOURCING_GUIDES.find((g) => g.slug === slug);
}
