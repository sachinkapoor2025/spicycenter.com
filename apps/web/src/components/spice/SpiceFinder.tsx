"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ALL_SPICE_ENTITIES } from "@/lib/spice/entities";
import { getProductsBySpice } from "@/lib/spice/catalog";

const DISHES: Record<string, string[]> = {
  Biryani: ["green-cardamom", "black-cumin", "mace", "clove", "cinnamon"],
  Curry: ["cumin", "coriander", "turmeric", "kashmiri-chilli"],
  Dal: ["cumin", "turmeric", "asafoetida", "mustard"],
  Tandoori: ["kashmiri-chilli", "kasuri-methi", "tandoori-masala"],
  Chaat: ["chaat-masala", "amchur", "cumin"],
  Pickle: ["mustard", "fenugreek", "fennel", "nigella"],
  Tea: ["green-cardamom", "ginger", "clove", "cinnamon"],
  Dessert: ["green-cardamom", "saffron", "nutmeg"],
  Seafood: ["kokum", "mustard", "curry-leaf", "tamarind"],
  Meat: ["black-cardamom", "clove", "black-pepper"],
  Vegetarian: ["cumin", "coriander", "turmeric"],
  "South Indian": ["mustard", "curry-leaf", "asafoetida", "sambar-masala"],
  "North Indian": ["cumin", "garam-masala", "kasuri-methi"],
};

export function SpiceFinder() {
  const [dish, setDish] = useState("Biryani");
  const slugs = DISHES[dish] ?? [];
  const results = useMemo(() => slugs.map((slug) => ALL_SPICE_ENTITIES.find((s) => s.slug === slug)).filter(Boolean), [slugs]);

  return (
    <div>
      <label className="block text-sm font-medium mb-2">What are you cooking?</label>
      <select value={dish} onChange={(e) => setDish(e.target.value)} className="border rounded px-3 py-2 mb-6">
        {Object.keys(DISHES).map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <ul className="space-y-4">
        {results.map((s) => {
          if (!s) return null;
          const product = getProductsBySpice(s.slug)[0];
          return (
            <li key={s.slug} className="card-spice p-5">
              <h2 className="font-serif text-xl">{s.canonicalName}</h2>
              <p className="text-sm mt-1">Why: {s.culinaryUses.join(", ")}</p>
              <p className="text-sm">Flavour: {s.flavourProfile} · Heat: {s.heatLevel}</p>
              <div className="mt-3 flex gap-3 text-sm">
                {product && <Link className="text-nav font-semibold" href={`/spices/${product.slug}`}>View in catalogue</Link>}
                <Link className="text-nav font-semibold" href="/wholesale">Buy bulk</Link>
                <Link className="text-nav" href={`/spice-guide/${s.slug}`}>Guide</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
