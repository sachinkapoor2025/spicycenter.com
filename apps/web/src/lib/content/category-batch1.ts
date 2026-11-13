/** Approved category-page copy for the eight storefront category pages. */

export type CategoryBatch1Page = {
  slug:
    | "whole-spices"
    | "ground-spices"
    | "indian-masalas"
    | "herbs"
    | "seeds"
    | "indian-chillies"
    | "premium-spices"
    | "bulk-spices";
  title: string;
  description: string;
  h1: string;
  paragraphs: string[];
  faqs: { q: string; a: string }[];
};

export const categoryBatch1Pages: Record<string, CategoryBatch1Page> = {
  "whole-spices": {
    slug: "whole-spices",
    title: "Whole Indian Spices in Bulk | SpicyCenter",
    description:
      "Source whole Indian spices in bulk, from green cardamom and black pepper to star anise and nutmeg. Packs from 100 gm to 1 metric ton. Send an enquiry.",
    h1: "Whole Indian Spices",
    paragraphs: [
      "A whole spice keeps its oils locked inside until the moment you crush, toast or simmer it. That is why chefs and spice blenders so often buy whole and grind in-house: the aroma is fuller, and the spice holds up far longer on the shelf.",
      "This range covers the whole spices Indian kitchens lean on every day. Green and black cardamom, black and white pepper, long pepper, star anise, nutmeg, Indian bay leaf, roasted cumin, black cumin, amchur, tamarind and kokum. All are sourced from India and supplied in pack sizes from 100 gm up to 1 metric ton.",
      "You will not find a price on the page, because grade, crop and packaging all change the number. Pick the spices you need, tell us the quantity and where it is going, and we will reply with availability and a quote.",
    ],
    faqs: [
      {
        q: "Why buy whole spices instead of ground?",
        a: "Whole spices lose flavour much more slowly than ground ones. If you crush or grind them just before use, you get a stronger aroma and more control over texture. Ground spices are quicker and more consistent, so plenty of kitchens keep both.",
      },
      {
        q: "Can I try a small quantity before a large order?",
        a: "Yes. Choose Sample request on the enquiry form and tell us which spice you would like to try. We will confirm what can be arranged.",
      },
      {
        q: "What pack sizes are available?",
        a: "Pack sizes run from 100 gm up to 1 metric ton. Tell us the quantity you need and we will confirm the options.",
      },
      {
        q: "How should I store whole spices?",
        a: "Keep them in airtight containers in a cool, dry place, away from heat and direct sunlight. Stored this way, whole spices hold their aroma for much longer than ground ones.",
      },
      {
        q: "Can I order several whole spices in one enquiry?",
        a: "Yes. List each spice and the quantity you need in a single enquiry, and we will reply to all of them together.",
      },
    ],
  },
  "ground-spices": {
    slug: "ground-spices",
    title: "Ground Indian Spices Wholesale | SpicyCenter",
    description:
      "Bulk ground Indian spices: cumin, coriander, black pepper, fenugreek, mustard and more. 100 gm to 1 metric ton. Enquire for a wholesale quote.",
    h1: "Ground Indian Spices",
    paragraphs: [
      "Ground spices are the workhorses of a busy kitchen. They dissolve into a sauce, colour a gravy evenly and save the time of grinding by hand. For restaurants, caterers and food manufacturers, that consistency matters as much as flavour.",
      "The powders on this page include cumin, coriander, black pepper, fenugreek, mustard, fennel, nutmeg, amchur and asafoetida. All are sourced from India.",
      "Colour, aroma and oil content shift with the harvest and the grind, so we confirm specifications with each quote instead of printing one description for every lot. Send us your quantity and destination to get started.",
    ],
    faqs: [
      {
        q: "How long do ground spices stay fresh?",
        a: "Ground spices fade faster than whole ones because more of their surface is exposed to air. Keep them in airtight containers, away from heat and direct light. We do not print best-before claims on the website, so ask us about shelf life when you enquire.",
      },
      {
        q: "I mostly need colour, not heat. What should I choose?",
        a: "This page does not list a mild colour chilli. The powders here are single spices, including cumin, coriander, black pepper, fenugreek, mustard, fennel, nutmeg, amchur and asafoetida. Tell us the colour and heat you need in your enquiry and we will point you to the right product.",
      },
      {
        q: "What is the largest quantity I can order?",
        a: "Pack sizes go up to 1 metric ton. If you need more than that, say so in your enquiry and we will talk it through.",
      },
      {
        q: "Are ground spices available for every spice in the catalogue?",
        a: "No. This page lists single-spice powders, including cumin, coriander, black pepper, fenugreek, mustard, fennel, nutmeg, amchur and asafoetida, plus black pepper crushed. It does not list every ground spice in the catalogue. If you do not see the form you want, ask us in your enquiry.",
      },
      {
        q: "Can I get a sample of a ground spice?",
        a: "Yes. Choose Sample request on the enquiry form, name the spice, and we will confirm what can be arranged.",
      },
    ],
  },
  "indian-masalas": {
    slug: "indian-masalas",
    title: "Indian Masala Blends in Bulk | SpicyCenter",
    description:
      "Traditional Indian masala blends including garam masala, sambar and chettinad, supplied in bulk from India. Send an enquiry with your quantity.",
    h1: "Indian Masalas",
    paragraphs: [
      "A good masala is not a handful of spices thrown together. It is a balance that cooks have adjusted over generations, and it changes from one region to the next.",
      "Our blends include garam masala, sambar masala and chettinad masala, along with other traditional mixes. Each one is listed with its own photograph, so you know exactly what you are enquiring about.",
      "Because a masala is a mix of ingredients, the full ingredient and allergen details need to be settled before a shipment is agreed. Tell us your destination country in the enquiry and we will confirm what applies.",
    ],
    faqs: [
      {
        q: "What is the difference between garam masala and curry powder?",
        a: "Garam masala is a blend of warming spices, usually added near the end of cooking for aroma. Curry powder is a ready-to-use blend that usually leans on turmeric and goes in earlier. They are not interchangeable. Our spice guide has a full comparison.",
      },
      {
        q: "Do your masalas list ingredients and allergens?",
        a: "Yes. Multi-ingredient masalas must list their ingredients and allergens before a shipment is agreed.",
      },
      {
        q: "Do you supply masalas for private-label brands?",
        a: "Yes. The form does not ask you to select a buyer type. Choose Commercial order, Sample request or Generic product enquiry, name the masala, and describe the private-label requirement in your message. We will confirm what is possible.",
      },
      {
        q: "Which masala blends do you supply?",
        a: "The catalogue includes garam masala, sambar masala and chettinad masala, along with other traditional blends. Browse the listings, or tell us in your enquiry what you are looking for.",
      },
      {
        q: "Can I get a sample of a masala before ordering?",
        a: "Yes. Choose Sample request on the enquiry form and tell us which blend you would like to try.",
      },
    ],
  },
  herbs: {
    slug: "herbs",
    title: "Dried Indian Herbs in Bulk | SpicyCenter",
    description:
      "Dried Indian herbs and seasonings, including kasuri methi and Indian bay leaf, supplied in bulk from India. Enquire for availability and a quote.",
    h1: "Herbs & Seasonings",
    paragraphs: [
      "Dried herbs do a different job from spices. They bring a green, savoury or slightly bitter note that rounds a dish off instead of driving it.",
      "Our range includes fenugreek leaves, better known as kasuri methi, and Indian bay leaf. Kasuri methi is crushed between the palms and stirred into butter-based gravies and flatbread doughs near the end. Indian bay leaf, or tej patta, smells gentler and closer to cinnamon than the European bay leaf, and goes into rice, biryani and slow-cooked dishes.",
      "Both are sourced from India and offered in pack sizes from 100 gm to 1 metric ton. Share your quantity and destination in an enquiry and we will reply with availability.",
    ],
    faqs: [
      {
        q: "What is kasuri methi?",
        a: "Dried fenugreek leaves. They have a bitter-maple aroma and are widely used in North Indian curries, parathas and marinades. Do not confuse them with fenugreek seeds, which are a separate product.",
      },
      {
        q: "Is Indian bay leaf the same as European bay leaf?",
        a: "No. They come from different trees. Indian bay leaf has a cinnamon-like scent, while European bay leaf is more herbal. They are not direct substitutes.",
      },
      {
        q: "Can I order fenugreek as seeds, leaves and powder?",
        a: "Yes. Fenugreek is listed in all three forms. Tell us which one you need when you enquire.",
      },
      {
        q: "How should I store kasuri methi?",
        a: "In an airtight container, away from moisture, heat and light. Crush it between your palms just before adding it to the dish, which wakes the aroma.",
      },
      {
        q: "Can you ship dried herbs outside India?",
        a: "Yes. We deliver worldwide through enquiry. Tell us your destination and we will confirm shipping options, rates and any duties or taxes with your quote.",
      },
    ],
  },
  seeds: {
    slug: "seeds",
    title: "Indian Spice Seeds in Bulk | SpicyCenter",
    description:
      "Bulk Indian spice seeds: cumin, coriander, fenugreek, fennel, mustard, nigella and ajwain. 100 gm to 1 metric ton. Send an enquiry for a quote.",
    h1: "Seeds & Grains",
    paragraphs: [
      "Plenty of Indian dishes begin the same way: hot oil in a pan and a spoonful of seeds. Within seconds they crackle and fill the kitchen with aroma. That is the tadka, and the seeds behind it are the heart of this category.",
      "We supply cumin, coriander, fenugreek, fennel, mustard, nigella and ajwain, along with other seed spices. Some are used whole in tempering, others are dry-roasted and ground. All are sourced from India.",
      "Seeds vary by crop and cleaning level, so we confirm details with each quote. Tell us your quantity and where it should go.",
    ],
    faqs: [
      {
        q: "What is the difference between cumin and black cumin?",
        a: "Cumin, or jeera, is the common brown seed with a warm, earthy flavour. Black cumin is smaller and darker, and is used in biryani and rich gravies. They are different spices and do not replace each other.",
      },
      {
        q: "What are nigella seeds?",
        a: "Small black seeds with a slightly oniony, peppery taste. They are sprinkled on naan and used in pickles and vegetable dishes. You may also see them sold as kalonji.",
      },
      {
        q: "Can I order a small pack of seeds first?",
        a: "Pack sizes start at 100 gm, so a small trial is possible. Mention it in your enquiry.",
      },
      {
        q: "Which seeds are used for tempering (tadka)?",
        a: "Cumin and mustard seeds are the usual starters, often with fenugreek or ajwain depending on the dish. They go into hot oil first, so their flavour spreads through everything that follows.",
      },
      {
        q: "Are seeds also available ground?",
        a: "Several are. Cumin, coriander, fenugreek, fennel and mustard are listed as powders as well as whole seeds. Ask us if you need a form that is not shown.",
      },
    ],
  },
  "indian-chillies": {
    slug: "indian-chillies",
    title: "Dried Indian Chillies in Bulk | SpicyCenter",
    description:
      "Dried Indian chillies including Kashmiri chilli whole, flakes and powder. Packs from 100 gm to 1 metric ton. Send an enquiry for a wholesale quote.",
    h1: "Dried Chillies & Dried Ingredients",
    paragraphs: [
      "Chilli is not only about heat. Some Indian chillies are bought mainly for colour and others for the burn, and knowing which one you need saves a lot of trial and error.",
      "Kashmiri chilli is the best-known colour chilli. It gives gravies a deep red shade with mild heat. We supply it whole, as flakes and as powder. This category also holds other dried chillies and kitchen essentials, so browse the listings or tell us what you are looking for.",
      "Heat, colour and size depend on the variety and the crop, so we confirm these details with each quote. Send an enquiry with your quantity and destination.",
    ],
    faqs: [
      {
        q: "Is Kashmiri chilli very hot?",
        a: "No. It is valued for its vivid red colour and mild heat, which is why it is a favourite for tandoori marinades and gravies. Our spice guide compares it with regular chilli.",
      },
      {
        q: "Should I choose whole chillies, flakes or powder?",
        a: "Whole chillies keep longest and suit tempering. Flakes add texture and visible colour. Powder blends fastest into sauces and masalas.",
      },
      {
        q: "Do dried chillies from India need extra documents?",
        a: "Some destinations ask for extra documents on dried spices from India. Tell us your country in the enquiry and we will confirm what applies.",
      },
      {
        q: "How should I store dried chillies?",
        a: "Keep them in an airtight container in a cool, dry place. Damp is their main enemy, because moisture leads to mould and a dull colour.",
      },
      {
        q: "Why is there no price on the page?",
        a: "Variety, crop, grade and packaging all affect the price of dried chillies. We quote for your actual order once you send your quantity and destination.",
      },
    ],
  },
  "premium-spices": {
    slug: "premium-spices",
    title: "Premium Indian Spices | SpicyCenter",
    description:
      "A selected range of premium Indian spices for buyers who want a higher standard of selection. Enquire for availability, grades and a quote.",
    h1: "Premium Indian Spices",
    paragraphs: [
      "The premium page currently lists green cardamom, as whole pods and as powder.",
      "Both are sourced from India. Tell us which form you need, the quantity and the destination, and we will confirm availability.",
      "There is no list price on the page. Send an enquiry and we will quote for the green cardamom you ask for.",
    ],
    faqs: [
      {
        q: "What makes a spice premium?",
        a: "In general, a better visual and purity selection: more uniform, cleaner and brighter. What that means in practice depends on the spice, so we confirm the grade for the lot before you order.",
      },
      {
        q: "Is every premium spice always available?",
        a: "No. Availability depends on the crop and the lot. Send an enquiry and we will reply with what we can offer.",
      },
      {
        q: "Which pack sizes are available for premium spices?",
        a: "Pack sizes run from 100 gm up to 1 metric ton, depending on availability. Tell us the quantity you need and we will confirm.",
      },
      {
        q: "Can I get a sample before ordering?",
        a: "Yes. Choose Sample request on the enquiry form and name the spice. We will confirm what can be arranged.",
      },
      {
        q: "Why is there no price on the page?",
        a: "Grade, crop and packaging set the price of each lot, so we quote it for your order. Send an enquiry with your quantity and destination.",
      },
    ],
  },
  "bulk-spices": {
    slug: "bulk-spices",
    title: "Bulk Indian Spices Supplier | SpicyCenter",
    description:
      "Buy Indian spices in bulk for restaurants, importers and distributors. Pack sizes up to 1 metric ton. Send your quantity for a quote.",
    h1: "Bulk Indian Spices",
    paragraphs: [
      "Buying spices in bulk is a different job from buying a jar. You are thinking about consistency from one lot to the next, how it is packed, how it will travel, and what paperwork the destination needs.",
      "SpicyCenter supplies bulk Indian spices to restaurants, hotels, caterers, grocers, manufacturers, importers and distributors. Pack sizes include 5 kg, 10 kg, 15 kg, 20 kg and 25 kg, all the way up to 1 metric ton, across whole spices, ground spices and masalas.",
      "Tell us what you need, how much, and where it is going. We reply with availability and a quote for your order, along with shipping options and guidance on any duties or taxes that apply to your destination.",
    ],
    faqs: [
      {
        q: "What quantities can I order in bulk?",
        a: "Bulk packs include 5, 10, 15, 20 and 25 kg bags, up to 1 metric ton. Tell us the amount you need and we will confirm the options.",
      },
      {
        q: "Can I put several spices in one enquiry?",
        a: "Yes. List every spice and the quantity for each in a single enquiry, and we will answer them together.",
      },
      {
        q: "How does shipping work for bulk orders?",
        a: "Shipping depends on your quantity, destination and shipping method. We confirm the options, the rates and any duties or taxes with your quote.",
      },
      {
        q: "Can I get a sample before placing a bulk order?",
        a: "Yes. Choose Sample request on the enquiry form and tell us which spice you want to test.",
      },
      {
        q: "Which businesses do you supply in bulk?",
        a: "Restaurants, hotels, caterers, grocers, manufacturers, importers and distributors. The form does not ask you to select a business type. Choose Commercial order, Sample request or Generic product enquiry, enter your company, and describe what you need in the message.",
      },
    ],
  },
};

export function getCategoryBatch1(slug: string): CategoryBatch1Page | undefined {
  return categoryBatch1Pages[slug];
}
