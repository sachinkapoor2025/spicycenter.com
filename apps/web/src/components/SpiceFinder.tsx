"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const DISHES = [
  "Biryani",
  "Curry",
  "Dal",
  "Tandoori",
  "Chaat",
  "Pickle",
  "Tea",
  "Dessert",
  "Seafood",
  "Meat",
  "Vegetarian",
  "South Indian",
  "North Indian",
] as const;

const MAP: Record<string, { spice: string; slug: string; why: string; flavour: string; qty: string }[]> = {
  Biryani: [
    { spice: "Cumin", slug: "cumin", why: "Earthy base in many rice masalas", flavour: "Warm, nutty", qty: "1–2 tsp seeds per 500g rice (recipe-dependent)" },
    { spice: "Green cardamom", slug: "green-cardamom", why: "Sweet aroma in layered rice", flavour: "Floral, camphor", qty: "A few pods" },
    { spice: "Indian bay leaf", slug: "indian-bay-leaf", why: "Tejpatta in dum cooking", flavour: "Woody cinnamon-clove", qty: "1–2 leaves" },
  ],
  Curry: [
    { spice: "Coriander", slug: "coriander", why: "Body of most dry masalas", flavour: "Citrus, nutty", qty: "2 tsp powder per typical curry" },
    { spice: "Turmeric", slug: "turmeric", why: "Colour and earthy bitterness", flavour: "Earthy", qty: "½ tsp" },
    { spice: "Kashmiri chilli", slug: "kashmiri-chilli", why: "Colour with milder heat", flavour: "Mild, red", qty: "To taste" },
  ],
  Dal: [
    { spice: "Cumin", slug: "cumin", why: "Classic tadka", flavour: "Warm", qty: "1 tsp" },
    { spice: "Asafoetida", slug: "asafoetida", why: "Savoury finish in many dals — check gluten in compounded hing", flavour: "Allium-like", qty: "Pinch" },
    { spice: "Turmeric", slug: "turmeric", why: "Simmered with lentils", flavour: "Earthy", qty: "½ tsp" },
  ],
  Tandoori: [
    { spice: "Kashmiri chilli", slug: "kashmiri-chilli", why: "Red colour, manageable heat", flavour: "Mild", qty: "Marinade to taste" },
    { spice: "Cumin", slug: "cumin", why: "Roasted earthy note", flavour: "Warm", qty: "1 tsp" },
  ],
  Chaat: [
    { spice: "Chaat Masala", slug: "chaat-masala", why: "Sour-salty finishing blend", flavour: "Tangy", qty: "Sprinkle" },
    { spice: "Amchur", slug: "amchur", why: "Dried mango sourness", flavour: "Tart", qty: "½ tsp" },
  ],
  Pickle: [
    { spice: "Mustard seed", slug: "mustard", why: "Pungent pickle base — allergen", flavour: "Pungent", qty: "Recipe-dependent" },
    { spice: "Fenugreek", slug: "fenugreek", why: "Bitter backbone of many achaars", flavour: "Bitter-maple", qty: "Recipe-dependent" },
  ],
  Tea: [
    { spice: "Green cardamom", slug: "green-cardamom", why: "Masala chai", flavour: "Floral", qty: "2–3 pods" },
    { spice: "Dried ginger", slug: "dried-ginger", why: "Heat in winter chai", flavour: "Hot, dry", qty: "Pinch" },
  ],
  Dessert: [
    { spice: "Green cardamom", slug: "green-cardamom", why: "Milk sweets and kheer", flavour: "Sweet-floral", qty: "Ground seeds" },
    { spice: "Saffron", slug: "saffron", why: "Colour and aroma in festive sweets", flavour: "Honey-hay", qty: "A few strands" },
  ],
  Seafood: [
    { spice: "Mustard seed", slug: "mustard", why: "Bengali and coastal tempering", flavour: "Pungent", qty: "Tempering" },
    { spice: "Kokum", slug: "kokum", why: "Konkan souring", flavour: "Sour, fruity", qty: "A few rinds" },
  ],
  Meat: [
    { spice: "Black cardamom", slug: "black-cardamom", why: "Smoky gravies", flavour: "Smoky", qty: "1 pod" },
    { spice: "Clove", slug: "clove", why: "Garam masala heat", flavour: "Sweet-pungent", qty: "2–3" },
  ],
  Vegetarian: [
    { spice: "Cumin", slug: "cumin", why: "Universal vegetable tadka", flavour: "Earthy", qty: "1 tsp" },
    { spice: "Coriander", slug: "coriander", why: "Dry sabzi masala", flavour: "Citrus", qty: "1–2 tsp" },
  ],
  "South Indian": [
    { spice: "Mustard seed", slug: "mustard", why: "Tempering with curry leaf", flavour: "Pungent", qty: "½ tsp" },
    { spice: "Dried curry leaf", slug: "dried-curry-leaves", why: "South Indian aroma", flavour: "Citrus-nutty", qty: "A sprig equivalent" },
    { spice: "Asafoetida", slug: "asafoetida", why: "Sambar and rasam", flavour: "Pungent", qty: "Pinch" },
  ],
  "North Indian": [
    { spice: "Cumin", slug: "cumin", why: "Jeera tadka", flavour: "Warm", qty: "1 tsp" },
    { spice: "Garam Masala", slug: "garam-masala", why: "Finishing blend", flavour: "Warm-sweet", qty: "½ tsp" },
  ],
};

export function SpiceFinder() {
  const [dish, setDish] = useState<(typeof DISHES)[number]>("Biryani");
  const results = useMemo(() => MAP[dish] ?? [], [dish]);

  return (
    <div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="font-semibold mb-3">What are you cooking?</legend>
        {DISHES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDish(d)}
            className={`rounded-full px-3 py-1.5 text-sm border ${dish === d ? "bg-nav text-white border-nav" : "border-[#dcc9a8] bg-white"}`}
          >
            {d}
          </button>
        ))}
      </fieldset>
      <div className="grid gap-4 mt-8">
        {results.map((r) => (
          <article key={r.slug} className="card-spice p-5">
            <h3 className="font-serif text-xl">{r.spice}</h3>
            <p className="text-sm mt-1"><strong>Why:</strong> {r.why}</p>
            <p className="text-sm"><strong>Flavour:</strong> {r.flavour}</p>
            <p className="text-sm"><strong>Typical quantity:</strong> {r.qty} (adjust to taste; not a professional recipe spec).</p>
            <div className="flex gap-3 mt-3 text-sm">
              <Link className="text-nav font-semibold" href={`/spice-guide/${r.slug}`}>Guide</Link>
              <Link className="text-nav font-semibold" href={`/spices/${r.slug}`}>View in catalogue</Link>
              <Link className="text-nav font-semibold" href={`/bulk-spices/${r.slug}`}>Buy bulk</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
