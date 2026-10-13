export type SourcingGuide = {
  slug: string;
  title: string;
  description: string;
  listingTitle: string;
  listingDescription: string;
  sections: { heading: string; body: string }[];
};

export const SOURCING_GUIDES: SourcingGuide[] = [
  {
    slug: "bulk-sourcing",
    title: "Bulk Spice Sourcing from India",
    listingTitle: "Bulk Spice Sourcing from India",
    listingDescription:
      "Learn how to source spices from India, understand supplier options and prepare an enquiry for your business requirements.",
    description:
      "A practical guide for importers, distributors and businesses sourcing spices, masalas and food ingredients from India. Share your required quantity and destination so our team can discuss suitable options.",
    sections: [
      {
        heading: "What this service is",
        body: "SpicyCenter helps businesses source Indian spices, masalas and food ingredients. The catalogue lists spices you can enquire about by name, form and grade. Rice, pulses and makhana can also be requested as sourcing enquiries even when they are not yet listed as retail products. Enter the quantity that suits your requirements. Preferred packaging, availability and pricing can be confirmed during the quotation process. We do not publish a single offer that applies to every product or destination.",
      },
      {
        heading: "What we confirm on enquiry",
        body: "Certificates, geographical-indication wording, packing specifications and shipping details depend on the product, the lot and the destination. We do not publish those claims until they can be supported for your enquiry. The enquiry form is free to submit. If you need samples or extra documents, say so on the form and we will discuss what can be arranged. We do not invent supplier relationships, guaranteed stock or sailing dates.",
      },
    ],
  },
  {
    slug: "packaging",
    title: "Packaging Options for Export",
    listingTitle: "Packaging Options for Export",
    listingDescription:
      "Food-grade packaging options can be discussed and confirmed based on the product and destination.",
    description:
      "Educational notes on food-grade packing, moisture protection and storage for Indian spices. Available packaging options can be discussed based on the product and destination.",
    sections: [
      {
        heading: "How packaging is chosen",
        body: "Share your preferred packaging and required quantity in the enquiry form. Buyers often ask about bags, cartons, lining, desiccant and export marks. Those details depend on the spice, the form and the destination — they are not a universal specification on this page. Our team can confirm suitable packaging, availability and pricing during the quotation process. We do not promise that every packaging type is available for every product.",
      },
      {
        heading: "Storage",
        body: "Dried spices should be stored in cool, dry conditions away from strong light. Lots that are sensitive to moisture may need extra lining. We do not claim a shelf-life figure that the pack label does not carry. Storage and packing notes for a named lot are confirmed during the quotation process.",
      },
    ],
  },
  {
    slug: "import-documentation",
    title: "Import Documentation Guide",
    listingTitle: "Import Documentation Guide",
    listingDescription:
      "Learn about common import documents and destination-specific requirements when sourcing spices.",
    description:
      "Educational notes on documents buyers often ask for when importing spices. This is not legal advice, and it is not a promise that every shipment includes every paper. Share your required quantity and destination so our team can discuss suitable options.",
    sections: [
      {
        heading: "Common buyer questions",
        body: "Importers often ask about a commercial invoice, packing list, certificate of origin, and phytosanitary or laboratory tests. Those requests are general educational examples. Exact requirements depend on the product, the shipment and the destination. SpicyCenter will say what we can supply for a named lot. We will not list certificates we cannot issue, and we do not guarantee that every document is available for every enquiry.",
      },
      {
        heading: "What we confirm on enquiry",
        body: "Document needs vary by country and by product. Share the destination and the quantity that suits your requirements, together with any papers your buyer or customs broker has asked for. The enquiry form is free to submit. Extra document support, if it can be arranged for that lot, is discussed during the quotation process rather than published as a standard add-on on this page.",
      },
    ],
  },
  {
    slug: "whole-versus-ground",
    title: "Whole Spices vs. Powder",
    listingTitle: "Whole Spices vs. Powder",
    listingDescription:
      "Information on the different forms, grades and uses of whole spices, ground spices and blended masalas to help you choose the right option for your business.",
    description:
      "Buyer notes on whole spices, ground spices and blended masalas. The right form depends on how you will use the product. This is culinary guidance, not a health claim.",
    sections: [
      {
        heading: "Form matters on the quote",
        body: "Whole seed, crushed spice and powder are different products, not interchangeable lines on the same enquiry. Powder can lose aroma faster in storage, so some buyers prefer whole spices when they will grind closer to use. Blended masalas are a further choice when a ready mix is required. None of these formats is universally better. The suitable option depends on your application, and culinary use is not a medical claim.",
      },
      {
        heading: "What to include in an enquiry",
        body: "Tell us the spice or blend, the form you prefer, and the quantity that suits your requirements. Product availability, grade, packaging and pricing can be confirmed during the quotation process. We do not promise that every format or quantity is available for every product.",
      },
    ],
  },
  {
    slug: "gcc-import",
    title: "GCC Spice Import Notes",
    listingTitle: "GCC Spice Import Notes",
    listingDescription:
      "Helpful information for buyers in UAE, Saudi Arabia, Qatar, Oman, Kuwait and Bahrain. Import rules, certificates and transit details may vary by country.",
    description:
      "Educational notes for buyers sourcing spices for UAE, Saudi Arabia, Qatar, Oman, Kuwait and Bahrain. Transit, documents and packing details depend on the destination and the shipment. Share your required quantity and destination so our team can discuss suitable options.",
    sections: [
      {
        heading: "What this page covers",
        body: "Buyers in GCC markets often ask about Halal paperwork, Arabic-language labels and heat during sea transit. Those are common discussion points, not a single set of rules for every Gulf country. Exact requirements depend on the destination, the product and the shipment, and should be confirmed with the relevant authorities or a qualified import professional. SpicyCenter can discuss what we can support on an enquiry. We do not invent a warehouse in Dubai or a guaranteed customs clearance time.",
      },
      {
        heading: "How to enquire",
        body: "Use the free enquiry form. Name the destination emirate or kingdom, the spice and form you need, and the quantity that suits your requirements. Preferred packaging, availability, pricing and any extra document or sample support can be discussed during the quotation process if they can be arranged for that lot. We do not promise that every paper or service is available for every destination.",
      },
    ],
  },
  {
    slug: "africa-import",
    title: "Africa Spice Import Notes",
    listingTitle: "Africa Spice Import Notes",
    listingDescription:
      "Key points for importers in African countries. Port, duty, certification and other requirements may differ by country.",
    description:
      "Educational notes for importers sourcing spices for African markets. Port, duty and certificate requirements differ by country. Share your required quantity and destination so our team can discuss suitable options.",
    sections: [
      {
        heading: "What to confirm for your destination",
        body: "Nigeria, Kenya, South Africa, Ghana and other markets have different food-import rules. This page does not publish a duty rate, phytosanitary list or clearance time that applies to every African country. Exact requirements depend on the destination, the product and the shipment, and should be confirmed with the relevant authorities or a qualified import professional. Ask on the enquiry and we will say what we can support for a named lot.",
      },
      {
        heading: "How to enquire",
        body: "Use the free enquiry form. Send the destination port or city, the spice and whether you need whole or ground, and the quantity that suits your requirements. Preferred packaging, availability, pricing and any document support can be discussed during the quotation process if they can be arranged for that lot. We do not invent stock, shipping services or guaranteed clearance times.",
      },
    ],
  },
  {
    slug: "latam-import",
    title: "Latin America Spice Import Notes",
    listingTitle: "Latin America Spice Import Notes",
    listingDescription:
      "Useful information for buyers in Mexico, Brazil and other Latin American countries. Import procedures and documentation may vary by destination.",
    description:
      "Educational notes for buyers sourcing spices for Mexico, Brazil and other Latin American countries. Import procedures and documents vary by destination. This is not a local-warehouse claim. Share your required quantity and destination so our team can discuss suitable options.",
    sections: [
      {
        heading: "Scope",
        body: "Spanish- or Portuguese-language paperwork, cold-chain questions and local product registration are common buyer-side topics. Dried spices do not usually need a cold chain, but exact import rules depend on the destination country, the product and the shipment. Confirm current requirements with the relevant authorities or a qualified import professional. We do not claim a bonded warehouse in São Paulo or Mexico City, and we do not publish a single set of rules for the whole region.",
      },
      {
        heading: "How to enquire",
        body: "Use the free enquiry form. Tell us the country or city of delivery, the spice names and preferred form, and the quantity that suits your requirements. We quote from India. Preferred packaging, availability, pricing and any document support can be discussed during the quotation process if they can be arranged for that lot. We do not invent certified stock, shipping services or guaranteed clearance times.",
      },
    ],
  },
];

export function getSourcingGuide(slug: string): SourcingGuide | undefined {
  return SOURCING_GUIDES.find((g) => g.slug === slug);
}
