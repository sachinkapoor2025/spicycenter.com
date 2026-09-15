import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type SpiceComparison = {
  slug: string;
  a: string;
  b: string;
  title: string;
  metaDescription: string;
  intro: string;
  flavour: string;
  whenA: string;
  whenB: string;
  verdict: string;
  relatedRecipes?: string[];
};

const EDITORIAL: SpiceComparison[] = [
  {
    slug: "whole-spices-vs-ground-spices",
    a: "cumin",
    b: "cumin",
    title: "Whole spices vs ground spices",
    metaDescription: "When to buy whole Indian spices versus powder for a UK kitchen — aroma, storage, tadka, and grinding.",
    intro: "Whole seeds and pods hold volatile oils longer than pre-ground powder. UK supermarket jars often sit for months; that is why a fresh 100g of whole cumin can out-aroma a large tub of powder.",
    flavour: "Whole spices bloom in hot fat (tadka) or a dry pan. Powder dissolves into gravies and marinades. Neither is ‘healthier’; they are different tools.",
    whenA: "Choose whole for tadka, rice, pickles, and any spice you use less than weekly.",
    whenB: "Choose ground when you cook Indian food most days and will finish the pack in a few months.",
    verdict: "Keep whole cumin, coriander, cardamom, clove and pepper on the shelf; keep small tins of turmeric, chilli and coriander powder for daily dal.",
    relatedRecipes: ["jeera-rice", "dal-tadka", "everyday-curry-base"],
  },
  {
    slug: "kashmiri-chilli-vs-regular-chilli",
    a: "kashmiri-chilli",
    b: "dried-red-chilli",
    title: "Kashmiri chilli vs regular Indian chilli",
    metaDescription: "Kashmiri chilli vs generic dried red chilli: colour versus heat for tandoori, butter chicken and everyday curry.",
    intro: "UK recipes that ask for a brick-red gravy usually want Kashmiri chilli. A generic ‘hot chilli powder’ will brown the sauce and sting more.",
    flavour: "Kashmiri lots are bred and traded for colour with milder heat. Generic dried red chilli (often Guntur-type in Indian packs) is hotter and less pigmented.",
    whenA: "Use Kashmiri chilli for tandoori colour, butter chicken, rogan josh, and tikka marinades.",
    whenB: "Use regular dried red chilli when you want heat in tadka, pickle, or Andhra-style fry.",
    verdict: "Many UK cooks keep both: Kashmiri for colour, a hotter chilli for bite. We do not print Scoville numbers we have not measured.",
    relatedRecipes: ["tandoori-marinade", "butter-chicken", "rogan-josh"],
  },
  {
    slug: "kashmiri-chilli-vs-byadgi-chilli",
    a: "kashmiri-chilli",
    b: "byadgi-chilli",
    title: "Kashmiri chilli vs Byadgi chilli",
    metaDescription: "Two colour chillies: Kashmiri vs Karnataka Byadgi — similar job, different regional kitchens.",
    intro: "Both are used for red colour more than maximum heat. They are not the same lot and should not be labelled interchangeably on a pack.",
    flavour: "Kashmiri is the North Indian tandoori reference. Byadgi is the Karnataka colour chilli in bisi bele bath and many commercial masalas.",
    whenA: "Kashmiri chilli for Punjabi and Kashmiri gravies sold into the UK.",
    whenB: "Byadgi when you are cooking Karnataka food or a masala that specifies it.",
    verdict: "Buy the named variety. ‘Deggi mirch’ blends are a different product again.",
    relatedRecipes: ["bisi-bele-bath", "rogan-josh"],
  },
  {
    slug: "green-cardamom-vs-black-cardamom",
    a: "green-cardamom",
    b: "black-cardamom",
    title: "Black cardamom vs green cardamom",
    metaDescription: "Green cardamom (elaichi) vs black cardamom (badi elaichi): sweet aroma versus smoky pods in biryani and curry.",
    intro: "They share a family resemblance and a Hindi root name, but they are not substitutes one-for-one.",
    flavour: "Green cardamom is floral, used in sweets, chai, and korma. Black cardamom is larger, often smoky, used in savoury rice and meat.",
    whenA: "Green cardamom in chai, phirni, biryani topping, and garam masala.",
    whenB: "Black cardamom in biryani pot, nihari, and some Punjabi meat gravies — one pod goes a long way.",
    verdict: "Do not swap them in desserts. In biryani, many cooks use both.",
    relatedRecipes: ["masala-chai", "biryani", "saffron-phirni"],
  },
  {
    slug: "garam-masala-vs-curry-powder",
    a: "garam-masala",
    b: "madras-curry-powder",
    title: "Garam masala vs curry powder",
    metaDescription: "Garam masala vs Madras curry powder — when to finish a curry versus when to build a British-Indian sauce.",
    intro: "Curry powder is a British-Indian blend (often coriander-forward with turmeric). Garam masala is a finishing mix of warming spices. They are not the same tin.",
    flavour: "Garam masala is typically cumin, coriander, cardamom, clove, cinnamon/cassia, pepper — added late. Madras-style curry powder is often turmeric-yellow and used earlier in the cook.",
    whenA: "Garam masala at the end of dal, keema, and many North Indian gravies.",
    whenB: "Curry powder when a UK recipe specifically asks for it, or for a quick Anglo-Indian sauce.",
    verdict: "If you are cooking from an Indian household recipe, reach for named whole spices plus garam masala — not a generic curry powder.",
    relatedRecipes: ["everyday-curry-base", "keema", "chicken-tikka-masala"],
  },
  {
    slug: "cumin-vs-caraway",
    a: "cumin",
    b: "caraway",
    title: "Cumin vs caraway",
    metaDescription: "Cumin (jeera) vs caraway — why UK bakers and Indian cooks should not treat them as the same seed.",
    intro: "They look similar in a jar. They do not taste the same. Cumin is the backbone of Indian tadka; caraway is rye bread and Central European cooking.",
    flavour: "Cumin is warm, earthy, slightly bitter. Caraway is more anise-like.",
    whenA: "Cumin in dal tadka, jeera rice, jeera aloo, and most Indian savoury dishes.",
    whenB: "Caraway in rye bread, cabbage, and some European sausages — not a jeera substitute.",
    verdict: "If a UK shop mislabels them, smell the jar: jeera should smell like Indian restaurant tadka, not like rye.",
    relatedRecipes: ["jeera-rice", "jeera-aloo", "dal-tadka"],
  },
  {
    slug: "cumin-vs-black-cumin",
    a: "cumin",
    b: "black-cumin",
    title: "Cumin vs black cumin",
    metaDescription: "Jeera vs kala jeera (black cumin) — related kitchen uses, different aroma and price.",
    intro: "Black cumin (kala jeera) is not nigella (kalonji), and it is not caraway. Check the botanical name on the guide.",
    flavour: "Regular cumin is the everyday tadka seed. Black cumin is finer, more floral, used more sparingly in some North Indian and Kashmiri cooking.",
    whenA: "Everyday jeera for tadka and rice.",
    whenB: "Black cumin when a Kashmiri or specialty recipe names it.",
    verdict: "Do not substitute nigella for black cumin — different plant, different flavour.",
    relatedRecipes: ["jeera-rice", "rogan-josh"],
  },
  {
    slug: "turmeric-vs-saffron-for-colour",
    a: "turmeric",
    b: "saffron",
    title: "Turmeric vs saffron for colour",
    metaDescription: "Turmeric vs saffron: cheap yellow colour versus genuine threads — they are not interchangeable.",
    intro: "Turmeric stains food yellow-orange and costs little. Saffron is the dried stigma of Crocus sativus and is one of the most expensive culinary spices. Using turmeric ‘instead of saffron’ changes the dish.",
    flavour: "Turmeric is earthy and slightly bitter; it is a curry backbone, not a floral finish. Saffron is honey-hay aroma in tiny doses.",
    whenA: "Turmeric in dal, curry bases, mustard tadka rice, and marinades.",
    whenB: "Saffron in biryani, phirni, and rich rice — bloom threads in warm milk first.",
    verdict: "Never sell or describe turmeric as saffron. Colour is not identity. We do not make medical claims for curcumin or saffron.",
    relatedRecipes: ["dal-tadka", "biryani", "saffron-phirni"],
  },
  {
    slug: "cassia-vs-cinnamon",
    a: "cassia",
    b: "cinnamon",
    title: "Cassia vs true cinnamon",
    metaDescription: "Indian dalchini (cassia) vs Cinnamomum verum — bark, flavour, and what the pack should say.",
    intro: "Most ‘cinnamon’ in Indian cooking is cassia (Cinnamomum cassia / related). True cinnamon (C. verum) is thinner-barked and milder. Labels should not blur the species.",
    flavour: "Cassia is punchier, common in garam masala and biryani pots. True cinnamon is more delicate, often preferred in baking.",
    whenA: "Cassia quills in Indian savoury cooking and masala chai.",
    whenB: "True cinnamon when a recipe or customer asks for Cinnamomum verum.",
    verdict: "We treat them as different spices on this site. Confirm species if you have a dietary reason to avoid cassia coumarin in quantity — that is a labelling/nutrition issue, not a scare headline.",
    relatedRecipes: ["masala-chai", "biryani"],
  },
  {
    slug: "indian-bay-leaf-vs-mediterranean-bay-leaf",
    a: "indian-bay-leaf",
    b: "indian-bay-leaf",
    title: "Indian bay leaf vs Mediterranean bay leaf",
    metaDescription: "Tejpatta (Cinnamomum tamala) vs Laurus nobilis — different leaves, different biryani.",
    intro: "Indian bay leaf (tejpatta) is a Cinnamomum leaf. European bay (Laurus nobilis) is the soup-leaf in a bouquet garni. They are not botanical twins.",
    flavour: "Tejpatta is cassia-like, used in biryani and garam pots. Mediterranean bay is herbal and eucalyptus-leaning.",
    whenA: "Indian bay leaf in biryani, pulao, and many North Indian gravies.",
    whenB: "Mediterranean bay in stocks and stews — not a 1:1 tejpatta swap.",
    verdict: "If your UK bay leaves smell like a roast dinner, they are probably Laurus, not tejpatta.",
    relatedRecipes: ["biryani"],
  },
  {
    slug: "black-pepper-vs-white-pepper",
    a: "black-pepper",
    b: "white-pepper",
    title: "Black pepper vs white pepper",
    metaDescription: "Same vine, different processing: black pepper vs white pepper in Indian and UK cooking.",
    intro: "White pepper is usually the same species with the outer fruit removed. Heat profile and aroma change with processing.",
    flavour: "Black pepper is fruity-pungent, the Malabar staple. White pepper is muskier, used where black specks are unwanted or in some Chinese and cream sauces.",
    whenA: "Black pepper in Kerala pepper chicken, rasam, and everyday seasoning.",
    whenB: "White pepper in pale sauces or recipes that specify it.",
    verdict: "For Indian cooking, start with whole black pepper and crush as needed.",
    relatedRecipes: ["pepper-chicken", "rasam"],
  },
  {
    slug: "mustard-vs-nigella",
    a: "mustard",
    b: "nigella",
    title: "Mustard seed vs nigella (kalonji)",
    metaDescription: "Rai vs kalonji — both small blackish seeds, completely different tadkas.",
    intro: "Nigella is often sold as ‘black onion seed’ in the UK. It is not mustard, and it is not black cumin.",
    flavour: "Mustard pops in hot oil for South Indian and Bengali tadka. Nigella is onion-like, used on naan and in some pickles and nigella-tempered vegetables.",
    whenA: "Mustard seed for sambar, lemon rice, poha, and Bengali fish.",
    whenB: "Nigella on breads, in panch phoron, and some pickles.",
    verdict: "If the seed pops aggressively in oil, you probably have mustard. Kalonji is quieter.",
    relatedRecipes: ["sambar", "lemon-rice", "pickle-tadka"],
  },
  {
    slug: "fenugreek-seeds-vs-kasuri-methi",
    a: "fenugreek",
    b: "fenugreek-leaves",
    title: "Fenugreek seeds vs kasuri methi",
    metaDescription: "Methi dana vs dried fenugreek leaves — bitter seeds versus the finishing herb on butter chicken.",
    intro: "Same plant family in the kitchen, different jobs. Seeds are bitter and used sparingly in sambar powder and pickles. Kasuri methi is crumbled over North Indian gravies.",
    flavour: "Seeds need toasting or soaking to tame bitterness. Leaves are aromatic when crushed in the palm.",
    whenA: "Fenugreek seeds in sambar blends, pickles, and some vegetable tadkas.",
    whenB: "Kasuri methi at the end of butter chicken, methi malai, and tandoori marinades.",
    verdict: "Do not dump a teaspoon of seeds into a butter chicken thinking it replaces kasuri methi.",
    relatedRecipes: ["sambar", "butter-chicken", "methi-thepla"],
  },
  {
    slug: "amchur-vs-tamarind",
    a: "amchur",
    b: "tamarind",
    title: "Amchur vs tamarind",
    metaDescription: "Dry mango powder vs tamarind pulp — two souring agents for Indian cooking.",
    intro: "Amchur is dried green mango, convenient in a UK cupboard. Tamarind is a sticky fruit pulp essential to sambar and many South and West Indian gravies.",
    flavour: "Amchur is dry, fruity-sour, added near the end. Tamarind is deeper, darker sour, usually extracted in water first.",
    whenA: "Amchur on chaat, chole, and dry potato dishes.",
    whenB: "Tamarind in sambar, rasam, puliyodarai, and many fish curries.",
    verdict: "They both add sourness but they do not taste the same. Lemon is a third option, not a perfect substitute for either.",
    relatedRecipes: ["chana-masala", "sambar", "chaat"],
  },
  {
    slug: "asafoetida-vs-onion-garlic",
    a: "asafoetida",
    b: "asafoetida",
    title: "Asafoetida (hing) in onion-free cooking",
    metaDescription: "How hing is used when onion and garlic are skipped — culinary note, not medical advice.",
    intro: "Asafoetida is a resin (usually compounded with flour). A pinch in hot ghee is a classic Jain and many Brahmin tadkas, and it also appears alongside onion in everyday dal.",
    flavour: "Raw hing smells sulphurous; cooked in fat it turns savoury.",
    whenA: "Use hing in dal tadka, sambar, and kadhi, especially when you are not using onion-garlic.",
    whenB: "If you already have a full onion-garlic base, hing is optional — a pinch still adds depth.",
    verdict: "Buy compounded hing as sold for cooking. A grain of raw resin goes further than you think.",
    relatedRecipes: ["dal-tadka", "sambar", "upma"],
  },
  {
    slug: "guntur-chilli-vs-teja-chilli",
    a: "guntur-sannam",
    b: "guntur-teja",
    title: "Guntur Sannam vs Teja chilli",
    metaDescription: "Andhra chilli lots: Sannam versus Teja — trade names, heat, and why packs should name the variety.",
    intro: "Guntur is a market as much as a place. Sannam and Teja are distinct chilli types traded from that belt.",
    flavour: "Teja is typically talked about as hotter; Sannam is a workhorse chilli for masala and powder. Actual heat varies by lot.",
    whenA: "Sannam when a recipe wants Andhra chilli without naming Teja.",
    whenB: "Teja when you specifically want that hotter Andhra profile.",
    verdict: "We will not invent SHU figures. Read the variety on the pack.",
    relatedRecipes: ["vindaloo", "keema"],
  },
];

export function loadComparisons(): SpiceComparison[] {
  const path = ["data/comparisons.json", "../../data/comparisons.json"]
    .map((p) => join(process.cwd(), p))
    .find((p) => existsSync(p));
  const fromFile: { slug: string; a: string; b: string; title: string }[] = path
    ? JSON.parse(readFileSync(path, "utf-8"))
    : [];
  const bySlug = new Map(EDITORIAL.map((c) => [c.slug, c]));
  for (const row of fromFile) {
    if (!bySlug.has(row.slug)) {
      bySlug.set(row.slug, {
        ...row,
        metaDescription: `${row.title} — culinary differences for UK cooks. Not medical advice.`,
        intro: `${row.title} compared for cooking, not as medicines.`,
        flavour: "See each spice guide for flavour notes.",
        whenA: `Use ${row.a.replace(/-/g, " ")} when the recipe names it.`,
        whenB: `Use ${row.b.replace(/-/g, " ")} when the recipe names it.`,
        verdict: "Buy the named spice. Labels should match the lot.",
      });
    }
  }
  return [...bySlug.values()];
}

export function getComparison(slug: string): SpiceComparison | undefined {
  const aliases: Record<string, string> = {
    "cinnamon-vs-cassia": "cassia-vs-cinnamon",
    "black-cardamom-vs-green-cardamom": "green-cardamom-vs-black-cardamom",
  };
  const resolved = aliases[slug] ?? slug;
  return loadComparisons().find((c) => c.slug === resolved);
}
