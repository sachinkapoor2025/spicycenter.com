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
  {
    slug: "how-to-source-bulk-spices",
    title: "How to Source Bulk Spices from India",
    listingTitle: "How to Source Bulk Spices from India",
    listingDescription: "A practical sequence for importers who need an Indian spice supplier rather than a retail pack.",
    description: "How a buyer can brief a sourcing partner, compare supplier quotations and keep unconfirmed details marked as pending.",
    sections: [
      { heading: "Start with the requirement", body: "Name the spice, form, quantity, destination and the grade you need. A catalogue photo is not a confirmation of stock." },
      { heading: "Compare what comes back", body: "Ask for price, MOQ, packaging, lead time and documents. If a supplier has not answered a field, leave it pending rather than filling it in." },
      { heading: "Agree the roles", body: "Confirm who invoices, who ships and who is the exporter of record before anyone treats a quotation as an order." },
    ],
  },
  {
    slug: "questions-for-a-spice-supplier",
    title: "Questions to Ask Before Selecting an Indian Spice Supplier",
    listingTitle: "Questions to Ask a Spice Supplier",
    listingDescription: "Questions that help a buyer compare suppliers without treating a directory listing as a guarantee.",
    description: "A short list of questions for product capability, documents, samples and the date a supplier was last reviewed.",
    sections: [
      { heading: "Capability", body: "Which products and forms can you offer for this destination, and what is the usual MOQ?" },
      { heading: "Evidence", body: "Which documents can you provide for this lot, and when do they expire? A document received is not the same as an independent inspection." },
      { heading: "Commercial terms", body: "What is the quotation validity, the lead time and who pays for a sample?" },
    ],
  },
  {
    slug: "compare-cumin-grades",
    title: "How to Compare Different Grades of Cumin",
    listingTitle: "Comparing Cumin Grades",
    listingDescription: "What to ask when two cumin quotations use different grade names.",
    description: "Cumin grades should be compared from the supplier's specification for the lot, not from a generic label on a website.",
    sections: [
      { heading: "Ask for the specification", body: "Compare purity, seed size, admixture and whether the offer is whole seed or powder. Do not assume two sellers mean the same thing by premium." },
      { heading: "Match the use", body: "A kitchen, a packer and an extractor may need different forms. Say which one you are buying for." },
      { heading: "Keep unknowns pending", body: "If origin, test results or price validity are missing, record them as pending confirmation." },
    ],
  },
  {
    slug: "rfq-checklist",
    title: "Complete RFQ Checklist for Bulk Spice Buyers",
    listingTitle: "RFQ Checklist for Spice Buyers",
    listingDescription: "The details that make a bulk spice requirement clear enough to send to suppliers.",
    description: "Use this checklist before asking SpicyCenter or a supplier for a quotation.",
    sections: [
      { heading: "Product", body: "Product name, form, grade or specification, and any test or document you need." },
      { heading: "Quantity and packing", body: "Quantity, unit, packaging and whether the target price is a firm limit or only a guide." },
      { heading: "Destination", body: "Country, port if known, and the delivery timeline. Do not assume a route is available until it is confirmed." },
    ],
  },
  {
    slug: "sample-to-order",
    title: "Understanding the Sample-to-Order Process",
    listingTitle: "From Sample to Order",
    listingDescription: "How a spice sample should be requested and what it does not prove.",
    description: "A sample shows the lot that was sent. It does not by itself prove later production, a certificate or a shipping date.",
    sections: [
      { heading: "Request it in writing", body: "Say which product, which specification and who pays for the sample and the courier." },
      { heading: "Review the sample against the brief", body: "Check form, colour and aroma against the requirement you sent. Ask for the specification that belongs to that sample." },
      { heading: "Separate the order", body: "A later order still needs its own price, quantity, documents and delivery terms." },
    ],
  },
  {
    slug: "export-documents",
    title: "Important Export Documents for International Spice Buyers",
    listingTitle: "Export Documents for Spice Buyers",
    listingDescription: "Documents buyers often ask about, and why they must be confirmed for the shipment.",
    description: "Commercial invoices, packing lists and extra health or residue papers depend on the product and the destination. This page does not publish a universal document list.",
    sections: [
      { heading: "Ask for the shipment, not a generic pack", body: "A document that applied to an earlier lot may not apply to the next one." },
      { heading: "Separate received from verified", body: "A file received from a supplier is not the same as a check by SpicyCenter or by the destination authority." },
      { heading: "Confirm who prepares it", body: "The exporter, the importer and any inspection company should be named in the order, not assumed from this website." },
    ],
  },
  {
    slug: "evaluate-turmeric-suppliers",
    title: "How to Evaluate Bulk Turmeric Suppliers",
    listingTitle: "Evaluating Turmeric Suppliers",
    listingDescription: "What to compare when more than one supplier offers turmeric.",
    description: "Compare turmeric offers on form, curcumin or colour only when the supplier states them, plus price, MOQ, packing and lead time.",
    sections: [
      { heading: "Form", body: "Say whether you need fingers or powder. Do not treat them as interchangeable." },
      { heading: "Specification", body: "If a curcumin or colour value matters, ask the supplier to state it for the lot. Do not copy a number from another listing." },
      { heading: "Commercial comparison", body: "Put price, currency, MOQ, packaging, lead time and validity side by side. Leave blanks as pending." },
    ],
  },
  {
    slug: "factors-when-sourcing",
    title: "Factors to Consider When Sourcing Indian Spices",
    listingTitle: "Factors in Indian Spice Sourcing",
    listingDescription: "The commercial points that change a spice requirement from one buyer to the next.",
    description: "Quantity, grade, packaging, destination rules and who carries the shipment all change the quotation. None of them is fixed on a product page.",
    sections: [
      { heading: "The lot", body: "Agricultural products vary. Ask which season and process the offer refers to." },
      { heading: "The destination", body: "Import papers and labelling depend on the country. Confirm them for that destination." },
      { heading: "The commercial role", body: "A sourcing introduction is not the same as owning the stock or being the exporter. Agree the role in writing." },
    ],
  },
];

export function getSourcingGuide(slug: string): SourcingGuide | undefined {
  return SOURCING_GUIDES.find((g) => g.slug === slug);
}
