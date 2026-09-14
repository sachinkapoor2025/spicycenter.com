export const WHOLESALE_LANDINGS: Record<
  string,
  { title: string; h1: string; description: string; intro: string; product?: string }
> = {
  "indian-spices": {
    title: "Indian spices wholesale — 10kg minimum | SpicyCenter",
    h1: "Indian spices wholesale",
    description:
      "Wholesale Indian spices for UK and European trade. 10kg minimum. Request a quote for cumin, turmeric, pepper, chilli and masalas.",
    intro:
      "Use this page if you buy Indian spices for resale or a professional kitchen. Tell us the spice, form, pack size and delivery country. We quote; we do not publish a fake list price for every commercial lot.",
  },
  cumin: {
    title: "Cumin wholesale (jeera) 10kg+ | SpicyCenter UK & EU",
    h1: "Cumin (jeera) wholesale",
    description: "Bulk Indian cumin seeds and powder from 10kg. Wholesale quotes for UK and European buyers.",
    intro:
      "Cumin (jeera, Cuminum cyminum) is sold whole or ground. Wholesale starts at 10kg. Grade and origin (for example Unjha lots) are confirmed on the quote, not invented on this page.",
    product: "Cumin",
  },
  turmeric: {
    title: "Turmeric wholesale (haldi) 10kg+ | SpicyCenter",
    h1: "Turmeric (haldi) wholesale",
    description: "Bulk Indian turmeric powder and fingers from 10kg for UK and European kitchens and manufacturers.",
    intro:
      "Turmeric (haldi) is usually quoted as powder or dried fingers. 10kg minimum. Curcumin claims for health are not made here — this is a culinary ingredient.",
    product: "Turmeric",
  },
  "black-pepper": {
    title: "Black pepper wholesale 10kg+ | SpicyCenter",
    h1: "Black pepper wholesale",
    description: "Bulk Indian black pepper for restaurants, grocers and importers. 10kg minimum. UK and EU delivery quotes.",
    intro:
      "Black pepper (kali mirch) is quoted by form (whole, crushed, powder) and, where it applies, garbled vs ungarbled. Kerala origin is stated only when the lot supports it.",
    product: "Black pepper",
  },
  coriander: {
    title: "Coriander wholesale (dhania) 10kg+ | SpicyCenter",
    h1: "Coriander (dhania) wholesale",
    description: "Bulk coriander seed and powder from 10kg for UK and European buyers.",
    intro: "Coriander seed is distinct from fresh leaf. Wholesale packs start at 10kg. Colour (yellow vs green lots) is a buying note, not a health claim.",
    product: "Coriander",
  },
  chilli: {
    title: "Indian chilli wholesale 10kg+ | SpicyCenter",
    h1: "Indian chilli wholesale",
    description: "Bulk Indian chilli — named varieties where the lot supports it. 10kg minimum for UK and EU trade.",
    intro:
      "Chilli wholesale needs a variety or heat note (for example Kashmiri for colour, Guntur for heat). We will not print a GI name we cannot stand behind on that shipment.",
    product: "Indian chilli",
  },
  cardamom: {
    title: "Cardamom wholesale 10kg+ | SpicyCenter",
    h1: "Cardamom wholesale",
    description: "Bulk green or black cardamom from 10kg. Wholesale quotes for UK and European buyers.",
    intro: "Green cardamom and black cardamom are different spices. Say which you need, and whether you want whole pods.",
    product: "Cardamom",
  },
  restaurants: {
    title: "Spice supplier for restaurants UK & Europe | SpicyCenter",
    h1: "Spice supplier for restaurants",
    description: "Indian spices for restaurant kitchens — 10kg wholesale minimum. Quote for UK and listed EU countries.",
    intro:
      "Restaurant buyers typically need cumin, turmeric, chilli, coriander and garam masala in 10kg bags, plus smaller retail packs for garnish. Tell us weekly usage if you know it.",
  },
  hotels: {
    title: "Hotel spice supplier UK & Europe | SpicyCenter",
    h1: "Spice supplier for hotels",
    description: "Bulk Indian spices for hotel kitchens. 10kg minimum. UK and European delivery quotes.",
    intro: "Hotel kitchens often mix retail packs for a la carte and 10kg+ bags for banqueting. Request a quote with sites and pack sizes.",
  },
  caterers: {
    title: "Catering spice supplier UK | SpicyCenter",
    h1: "Spice supplier for caterers",
    description: "Indian spices for catering companies. Bulk from 10kg. UK and EU quotes.",
    intro: "Caterers usually need reliable repeat lots of cumin, chilli and garam masala. We quote by weight and destination — not a fake nationwide 24-hour promise.",
  },
  "food-manufacturers": {
    title: "Spice supplier for food manufacturers | SpicyCenter",
    h1: "Spices for food manufacturers",
    description: "Ingredient spices for manufacturing. 10kg minimum, larger lots quoted. UK and EU.",
    intro: "Manufacturers should tell us spec (mesh, grade, moisture) and annual volume. Certificates are attached only when they exist for that lot.",
  },
  "grocery-retailers": {
    title: "Indian spice wholesaler for grocery retailers | SpicyCenter",
    h1: "Spices for grocery retailers",
    description: "Wholesale Indian spices for grocers and independent retailers. 10kg minimum.",
    intro: "Retailers can mix 100g–1kg consumer packs with 10kg back-of-house bags. Ask for labelled retail packs vs bulk bags.",
  },
  importers: {
    title: "Indian spice importer supply UK & Europe | SpicyCenter",
    h1: "Spices for importers",
    description: "Talk to SpicyCenter if you import or redistribute Indian spices into the UK or Europe. 10kg minimum on this form; larger lots quoted.",
    intro: "Importers should include destination country, preferred pack and any increased-control spices. We do not hide official-control notes.",
  },
  distributors: {
    title: "Indian spice distributor supply | SpicyCenter",
    h1: "Spices for distributors",
    description: "Wholesale Indian spices for distributors serving UK and European foodservice and retail.",
    intro: "Distributors: send the SKU list you need and the countries you cover. Quotes are lot-specific.",
  },
  uk: {
    title: "Indian spice wholesale UK | SpicyCenter",
    h1: "Indian spice wholesale UK",
    description:
      "Bulk Indian spices for the United Kingdom. 10kg minimum. Restaurants, grocers, manufacturers and importers.",
    intro:
      "The UK is our primary wholesale market. Select United Kingdom, enter a postcode, and request a quote. Shipping is shown at checkout in GBP where conversion applies — weight-based rules are configured in admin, not as a hidden extra. Import duty and VAT are extra unless a rate is marked inclusive.",
    product: "Indian spices",
  },
};

export const WHOLESALE_SLUGS = Object.keys(WHOLESALE_LANDINGS);
