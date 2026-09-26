/**
 * Builds a structured Indian spice catalogue.
 * SKUs are real variety × form × pack combinations — not invented botanical species.
 * Selling prices are DRAFT placeholders. Market prices are not fabricated.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = "2026-09-13T00:00:00.000Z";

const DEFAULT_COMPLIANCE = {
  ingredients: "Single-ingredient spice as named on the pack. Multi-ingredient masalas list components on the product.",
  allergens: "Packed in a facility that may handle mustard, sesame, celery, and other spices. Always read the pack.",
  countryOfOrigin: "India",
  countryOfPacking: "To be confirmed by the food business operator",
  packer: "To be completed in admin before sale",
  importer: "UK/EU importer details must be completed in admin before sale",
  responsibleFoodBusinessOperator: "To be completed in admin before sale",
  bestBefore: "Shown on pack / lot; do not invent dates on the website",
  storageConditions: "Store airtight, cool, dry, and away from direct sunlight",
  usageInstructions: "Culinary use. Cook as directed in recipes.",
  batchNumber: "Assigned at packing",
  lotNumber: "Assigned at packing",
  nutritionInformation: "Nutrition declaration to be completed per pack size before EU/UK sale",
  certification: "Only display certifications that the lot actually holds",
  ukImportStatus: "Review current UK increased-control lists for dried spices from India before shipping",
  euImportStatus: "Review EU official-control lists for foods of non-animal origin before shipping",
  requiredDocuments: "Commercial invoice, packing list; additional health/residue docs when the commodity requires them",
  testingRequirements: "Admin-managed: pesticide, microbiological, aflatoxin, and residue testing as applicable",
  pesticideTesting: true,
  microbiologicalTesting: true,
  aflatoxinTesting: true,
  residueTesting: true,
  certificateRequired: false,
  laboratoryTestRequired: false,
  lastComplianceReview: "",
};

function spice(partial) {
  return {
    commonNames: [],
    indianNames: [],
    regionalNames: [],
    growingRegions: [],
    culinaryUses: [],
    relatedSpiceIds: [],
    similarSpiceIds: [],
    alternativeSpiceIds: [],
    recipeSlugs: [],
    aliases: [],
    grades: [
      { gradeName: "Standard", description: "Admin-configured commercial grade", applies: true },
      { gradeName: "Premium", description: "Admin-configured higher visual/purity selection", applies: true },
      { gradeName: "Export Grade", description: "Only show when export specifications exist for the lot", applies: true },
      { gradeName: "Machine Cleaned", description: "Machine cleaned — confirm process for the lot", applies: true },
    ],
    images: [
      {
        imageUrl: "",
        license: "placeholder",
        usageRights: "No competitor or Google Images scrape. Replace with owned/licensed photography.",
        altText: `${partial.canonicalName} — photography pending licensed source`,
      },
    ],
    faqs: [],
    featured: false,
    featuredKnowledge: false,
    status: "active",
    verificationStatus: "requires_manual_verification",
    compliance: { ...DEFAULT_COMPLIANCE, ingredients: partial.canonicalName },
    ...partial,
  };
}

const spices = [
  spice({
    id: "cumin",
    canonicalName: "Cumin",
    slug: "cumin",
    hindiName: "जीरा",
    sanskritName: "Jiraka",
    botanicalName: "Cuminum cyminum",
    botanicalFamily: "Apiaceae",
    commonNames: ["Cumin", "Cumin seeds", "Jeera"],
    indianNames: ["Jeera", "Jeerige", "Jeerakam", "Jira"],
    regionalNames: ["Jeera", "Safed jeera"],
    aliases: ["cumin", "jeera", "जीरा", "जैरा", "cuminum cyminum", "cumin seeds", "cumin powder", "whole cumin", "bulk cumin"],
    origin: "India (widely cultivated; historically associated with the Eastern Mediterranean and South Asia)",
    originRegion: "Rajasthan, Gujarat",
    growingRegions: ["Rajasthan", "Gujarat", "Uttar Pradesh"],
    shortDescription: "Warm, earthy seed spice central to Indian tadka, rice, and masalas.",
    description:
      "Cumin (Cuminum cyminum) is a small ridged seed used whole or ground. Indian production is concentrated in western growing belts, including Gujarat and Rajasthan. Flavour is warm, earthy and slightly bitter-nutty. Traditional culinary and wellness uses exist in South Asian cooking; those traditions are not medical claims.",
    history:
      "Cumin has been traded for centuries across West, Central and South Asia. In Indian kitchens it is a foundational tempering spice rather than a garnish.",
    cultivation: "Grown as a cool-season crop. Exact agronomy varies by district and irrigation.",
    harvestSeason: "Typically harvested in late winter to early spring in major Indian belts (season varies by year).",
    processing: "Dried, cleaned (including machine or sortex cleaning where specified), then packed whole or milled.",
    forms: ["seeds", "whole", "powder", "roasted"],
    flavourProfile: "Warm, earthy, nutty, slightly bitter",
    aromaProfile: "Strong, warm, penetrating",
    colour: "Greenish-brown to brown seeds; tan powder",
    heatLevel: "none",
    culinaryUses: ["Biryani", "Jeera rice", "Dal tadka", "Curry", "Raita", "Pickle"],
    traditionalUses:
      "Cumin has a long history of use in traditional culinary and wellness practices. Traditional use is not the same as scientifically established medical evidence.",
    storage: "Airtight, cool, dry, dark. Ground cumin loses aroma faster than whole seed.",
    shelfLife: "Whole seed typically keeps aroma longer than powder; follow pack best-before.",
    nutrition: "Nutrition declaration is lot- and pack-specific and must be completed before UK/EU sale.",
    relatedSpiceIds: ["black-cumin", "caraway", "fennel", "coriander"],
    similarSpiceIds: ["caraway", "black-cumin"],
    alternativeSpiceIds: ["caraway"],
    recipeSlugs: ["jeera-rice", "dal-tadka", "biryani"],
    featured: true,
    featuredKnowledge: true,
    faqs: [
      {
        q: "What is cumin?",
        a: "Cumin is the dried seed of Cuminum cyminum, known as jeera in Hindi, used whole or ground in Indian cooking.",
      },
      {
        q: "Where does Indian cumin come from?",
        a: "Major Indian production includes Gujarat (notably Unjha market trade) and Rajasthan. Origin on a pack must match the actual lot.",
      },
      {
        q: "Can I buy 25kg cumin?",
        a: "Yes. Bulk cumin starts at a 10kg minimum. 25kg is a standard wholesale pack size; request a quote for custom quantities.",
      },
    ],
  }),
  spice({
    id: "black-cumin",
    canonicalName: "Black cumin",
    slug: "black-cumin",
    hindiName: "काला जीरा",
    botanicalName: "Bunium persicum",
    botanicalFamily: "Apiaceae",
    commonNames: ["Black cumin", "Kala jeera", "Shahi jeera"],
    aliases: ["kala jeera", "shahi jeera", "black cumin", "bunium persicum"],
    origin: "Himalayan / Central Asian highlands; used in North Indian and Kashmiri cooking",
    growingRegions: ["Himachal Pradesh", "Jammu and Kashmir", "Uttarakhand"],
    shortDescription: "Smaller, darker seeds than common cumin; used in biryani and rich gravies.",
    description:
      "Black cumin / kala jeera (often Bunium persicum, also called shahi jeera in trade) is not the same as nigella (kalonji). Confirm botanical identity on the lot. Flavour is more floral and camphor-like than Cuminum cyminum.",
    forms: ["seeds", "whole"],
    flavourProfile: "Floral, earthy, slightly smoky",
    heatLevel: "none",
    culinaryUses: ["Biryani", "Korma", "Pulao"],
    relatedSpiceIds: ["cumin", "nigella", "caraway"],
    featuredKnowledge: true,
  }),
  spice({
    id: "turmeric",
    canonicalName: "Turmeric",
    slug: "turmeric",
    hindiName: "हल्दी",
    botanicalName: "Curcuma longa",
    botanicalFamily: "Zingiberaceae",
    aliases: ["turmeric", "haldi", "हल्दी", "curcuma longa", "turmeric powder", "turmeric fingers"],
    origin: "India",
    originRegion: "Andhra Pradesh, Tamil Nadu, Karnataka, Odisha, Maharashtra",
    growingRegions: ["Andhra Pradesh", "Telangana", "Tamil Nadu", "Karnataka", "Odisha", "Maharashtra"],
    shortDescription: "Rhizome sold as dried fingers or powder; earthy, bitter-warm colouring spice.",
    description:
      "Turmeric is the dried rhizome of Curcuma longa. Indian trade distinguishes fingers and ground powder, and regional types such as Alleppey and Erode. Curcumin is a constituent of turmeric; turmeric the spice and isolated curcumin are not interchangeable products. Do not treat culinary turmeric as a medicine.",
    forms: ["whole", "powder"],
    flavourProfile: "Earthy, bitter, warm, slightly peppery",
    colour: "Deep orange-yellow",
    heatLevel: "none",
    culinaryUses: ["Curry", "Dal", "Pickle", "Rice", "Mustard oil pickles"],
    traditionalUses:
      "Turmeric has a long history of use in traditional culinary and ceremonial practices. Traditional use is not a clinical claim.",
    relatedSpiceIds: ["dried-ginger", "dried-galangal"],
    recipeSlugs: ["curry", "dal-tadka"],
    featured: true,
    featuredKnowledge: true,
  }),
  spice({
    id: "black-pepper",
    canonicalName: "Black pepper",
    slug: "black-pepper",
    hindiName: "काली मिर्च",
    botanicalName: "Piper nigrum",
    botanicalFamily: "Piperaceae",
    aliases: ["black pepper", "kali mirch", "piper nigrum", "malabar pepper", "tellicherry", "pepper garbled"],
    origin: "India — Western Ghats / Kerala Malabar coast historically",
    originRegion: "Kerala, Karnataka",
    growingRegions: ["Kerala", "Karnataka", "Tamil Nadu"],
    shortDescription: "Dried pepper berries; garbled and ungarbled grades appear in Indian market reports.",
    description:
      "Black pepper is the dried berry of Piper nigrum. Kerala Malabar pepper is a recognised origin story. Market reports often split garbled and ungarbled pepper, which is why a single generic “pepper price” is insufficient.",
    forms: ["whole", "crushed", "powder"],
    flavourProfile: "Pungent, piney, hot-aromatic",
    heatLevel: "medium",
    culinaryUses: ["Curry", "Meat", "Garam masala", "Rasam"],
    relatedSpiceIds: ["long-pepper", "cubeb", "white-pepper"],
    featured: true,
    featuredKnowledge: true,
  }),
  spice({
    id: "green-cardamom",
    canonicalName: "Green cardamom",
    slug: "green-cardamom",
    hindiName: "इलायची",
    botanicalName: "Elettaria cardamomum",
    botanicalFamily: "Zingiberaceae",
    aliases: ["green cardamom", "elaichi", "elachi", "elettaria cardamomum", "alleppey cardamom"],
    origin: "India — Western Ghats",
    originRegion: "Kerala (Alleppey / Idukki), Karnataka, Tamil Nadu",
    growingRegions: ["Kerala", "Karnataka", "Tamil Nadu"],
    shortDescription: "Small green pods; sweet-camphor aroma for sweets, tea, and biryani.",
    description:
      "Green cardamom is Elettaria cardamomum. Alleppey green cardamom refers to Kerala-origin trade. Black cardamom (Amomum/Lanxangia) is a different spice.",
    forms: ["whole", "powder", "seeds"],
    flavourProfile: "Sweet, floral, camphor, eucalyptus-like",
    heatLevel: "none",
    culinaryUses: ["Biryani", "Tea", "Sweets", "Korma", "Garam masala"],
    relatedSpiceIds: ["black-cardamom"],
    recipeSlugs: ["biryani", "masala-chai"],
    featured: true,
    featuredKnowledge: true,
  }),
  spice({
    id: "black-cardamom",
    canonicalName: "Black cardamom",
    slug: "black-cardamom",
    hindiName: "बड़ी इलायची",
    botanicalName: "Amomum subulatum",
    botanicalFamily: "Zingiberaceae",
    aliases: ["black cardamom", "badi elaichi", "amomum subulatum"],
    origin: "Eastern Himalaya",
    growingRegions: ["Sikkim", "West Bengal", "Northeast India"],
    shortDescription: "Large smoked pods used in savoury North Indian cooking.",
    description: "Black cardamom is typically Amomum subulatum in Indian trade, dried with a characteristic smoky note. Not a substitute 1:1 for green cardamom.",
    forms: ["whole"],
    flavourProfile: "Smoky, camphor, resinous",
    heatLevel: "none",
    culinaryUses: ["Curry", "Meat", "Biryani", "Garam masala"],
    relatedSpiceIds: ["green-cardamom"],
    featuredKnowledge: true,
  }),
  spice({
    id: "coriander",
    canonicalName: "Coriander",
    slug: "coriander",
    hindiName: "धनिया",
    botanicalName: "Coriandrum sativum",
    botanicalFamily: "Apiaceae",
    aliases: ["coriander", "dhania", "dhaniya", "coriandrum sativum", "coriander seeds", "coriander powder"],
    origin: "India",
    originRegion: "Rajasthan, Gujarat, Madhya Pradesh",
    growingRegions: ["Rajasthan", "Gujarat", "Madhya Pradesh", "Andhra Pradesh"],
    shortDescription: "Citrusy seed, whole or ground; distinct from fresh coriander leaf.",
    description: "Coriander seed is Coriandrum sativum. Dried seed and fresh leaf (cilantro) share a plant but are different culinary ingredients.",
    forms: ["seeds", "whole", "powder"],
    flavourProfile: "Citrus, warm, nutty",
    heatLevel: "none",
    culinaryUses: ["Curry", "Masala", "Pickle", "Garam masala"],
    relatedSpiceIds: ["cumin", "fennel", "ajwain"],
    recipeSlugs: ["curry"],
    featured: true,
    featuredKnowledge: true,
  }),
  spice({
    id: "kashmiri-chilli",
    canonicalName: "Kashmiri chilli",
    slug: "kashmiri-chilli",
    hindiName: "कश्मीरी मिर्च",
    botanicalName: "Capsicum annuum",
    botanicalFamily: "Solanaceae",
    aliases: ["kashmiri chilli", "kashmiri chili", "kashmiri mirch", "kashmiri chilli powder"],
    origin: "India — Kashmir and other regions producing Kashmiri-type pods",
    growingRegions: ["Jammu and Kashmir", "Himachal Pradesh"],
    shortDescription: "Mild heat, vivid red colour — widely used for colour in gravies.",
    description:
      "Kashmiri chilli is a mild Capsicum annuum type valued for colour. Colour and heat vary by cultivar and harvest. Not interchangeable with Guntur Teja.",
    forms: ["whole", "powder", "flakes"],
    flavourProfile: "Mild, slightly sweet, smoky-fruity",
    heatLevel: "mild",
    culinaryUses: ["Tandoori", "Butter chicken", "Curry", "Rogan josh"],
    relatedSpiceIds: ["byadgi-chilli", "guntur-sannam", "dried-red-chilli"],
    featured: true,
    featuredKnowledge: true,
  }),
  spice({
    id: "fenugreek",
    canonicalName: "Fenugreek",
    slug: "fenugreek",
    hindiName: "मेथी",
    botanicalName: "Trigonella foenum-graecum",
    botanicalFamily: "Fabaceae",
    aliases: ["fenugreek", "methi", "methi dana", "kasuri methi", "trigonella"],
    origin: "India",
    growingRegions: ["Rajasthan", "Gujarat", "Madhya Pradesh", "Uttar Pradesh"],
    shortDescription: "Bitter-maple seeds and dried leaves (kasuri methi).",
    description: "Fenugreek seeds and dried leaves are related but used differently. Seeds are bitter; kasuri methi is aromatic dried leaf.",
    forms: ["seeds", "leaves", "powder"],
    flavourProfile: "Bitter, maple-like, savoury",
    heatLevel: "none",
    culinaryUses: ["Curry", "Pickle", "Paratha", "Methi malai"],
    traditionalUses: "Fenugreek appears in traditional culinary and household practices. That is not a disease-treatment claim.",
    relatedSpiceIds: ["mustard", "ajwain"],
    featuredKnowledge: true,
  }),
  spice({
    id: "clove",
    canonicalName: "Clove",
    slug: "clove",
    hindiName: "लौंग",
    botanicalName: "Syzygium aromaticum",
    botanicalFamily: "Myrtaceae",
    aliases: ["clove", "cloves", "laung", "lavang", "syzygium aromaticum"],
    origin: "Cultivated in India (Kerala and other southern districts) and globally",
    growingRegions: ["Kerala", "Tamil Nadu", "Karnataka"],
    shortDescription: "Dried flower buds; intense eugenol aroma.",
    description: "Cloves are dried unopened flower buds of Syzygium aromaticum. Kerala is an Indian growing region. Strong spice — small quantities.",
    forms: ["whole", "powder"],
    flavourProfile: "Warm, sweet-pungent, numbing",
    heatLevel: "medium",
    culinaryUses: ["Biryani", "Garam masala", "Tea", "Meat", "Pickle"],
    relatedSpiceIds: ["cinnamon", "cassia", "green-cardamom"],
    featuredKnowledge: true,
  }),
  spice({
    id: "cassia",
    canonicalName: "Cassia",
    slug: "cassia",
    hindiName: "दालचीनी (often labelled; confirm species)",
    botanicalName: "Cinnamomum cassia",
    botanicalFamily: "Lauraceae",
    aliases: ["cassia", "chinese cinnamon", "dalchini", "cinnamomum cassia"],
    origin: "Traded widely in India; species must be declared on pack where required",
    growingRegions: ["Kerala", "Northeast India"],
    shortDescription: "Hard bark quills commonly sold as dalchini in Indian retail.",
    description:
      "Cassia (Cinnamomum cassia and related cassia barks) is what many Indian kitchens call dalchini. True cinnamon (Cinnamomum verum) is thinner, more fragile bark. Do not label cassia as Ceylon cinnamon unless the lot is that species.",
    forms: ["whole", "powder"],
    flavourProfile: "Sweet, woody, stronger than Ceylon cinnamon",
    heatLevel: "none",
    culinaryUses: ["Biryani", "Garam masala", "Tea", "Sweets"],
    relatedSpiceIds: ["cinnamon", "clove"],
    featuredKnowledge: true,
  }),
  spice({
    id: "cinnamon",
    canonicalName: "Cinnamon (Cinnamomum verum)",
    slug: "cinnamon",
    botanicalName: "Cinnamomum verum",
    botanicalFamily: "Lauraceae",
    aliases: ["cinnamon", "true cinnamon", "ceylon cinnamon", "cinnamomum verum"],
    origin: "True cinnamon is associated with Sri Lanka; Indian listings must match the botanical lot",
    growingRegions: ["Kerala"],
    shortDescription: "True cinnamon — only sell under this name when the species is verified.",
    description: "Cinnamomum verum is true cinnamon. If the lot is cassia, list it as cassia. This entity exists so the catalogue does not blur the two.",
    forms: ["whole", "powder"],
    flavourProfile: "Sweet, delicate, citrus-woody",
    heatLevel: "none",
    culinaryUses: ["Sweets", "Tea", "Rice"],
    relatedSpiceIds: ["cassia"],
    verificationStatus: "requires_manual_verification",
  }),
  spice({
    id: "saffron",
    canonicalName: "Saffron",
    slug: "saffron",
    hindiName: "केसर",
    botanicalName: "Crocus sativus",
    botanicalFamily: "Iridaceae",
    aliases: ["saffron", "kesar", "zafran", "crocus sativus", "kashmir saffron"],
    origin: "India — Kashmir GI saffron where certified; otherwise declare actual origin",
    growingRegions: ["Jammu and Kashmir"],
    shortDescription: "Dried Crocus stigmas. Sell by gram, never as a generic 1kg grocery spice.",
    description:
      "Saffron is the dried stigma of Crocus sativus. Kashmir saffron is a protected origin when genuine. Pack sizes are grams, not kilograms. Do not invent GI certification.",
    forms: ["whole"],
    flavourProfile: "Honey, hay, bitter-floral",
    heatLevel: "none",
    culinaryUses: ["Biryani", "Sweets", "Tea", "Rabri"],
    featured: true,
    featuredKnowledge: true,
  }),
  spice({
    id: "fennel",
    canonicalName: "Fennel seed",
    slug: "fennel",
    hindiName: "सौंफ",
    botanicalName: "Foeniculum vulgare",
    botanicalFamily: "Apiaceae",
    aliases: ["fennel", "saunf", "sauf", "foeniculum"],
    origin: "India",
    growingRegions: ["Gujarat", "Rajasthan", "West Bengal"],
    shortDescription: "Sweet anise-like seeds used as spice and mukhwas.",
    description: "Fennel seed (saunf) is Foeniculum vulgare. Distinct from anise and from star anise.",
    forms: ["seeds", "powder"],
    flavourProfile: "Sweet, anise, cooling",
    heatLevel: "none",
    culinaryUses: ["Pickle", "Sweets", "Curry", "Mukhwas"],
    relatedSpiceIds: ["anise", "star-anise", "cumin"],
  }),
  spice({
    id: "mustard",
    canonicalName: "Mustard seed",
    slug: "mustard",
    hindiName: "राई / सरसों",
    botanicalName: "Brassica juncea / Brassica nigra / Sinapis alba",
    botanicalFamily: "Brassicaceae",
    aliases: ["mustard", "rai", "sarson", "black mustard", "yellow mustard"],
    origin: "India",
    growingRegions: ["Rajasthan", "Gujarat", "Uttar Pradesh", "Madhya Pradesh"],
    shortDescription: "Black, brown, or yellow seeds for tadka and pickles. Allergen: mustard.",
    description: "Indian kitchens use brown/black mustard (rai) and yellow mustard. Mustard is a major allergen and must be labelled.",
    forms: ["seeds", "powder"],
    flavourProfile: "Pungent, nutty when tempered",
    heatLevel: "medium",
    culinaryUses: ["Pickle", "Tadka", "Fish curry", "Sambar"],
    relatedSpiceIds: ["fenugreek", "nigella"],
  }),
  spice({
    id: "nigella",
    canonicalName: "Nigella",
    slug: "nigella",
    hindiName: "कलौंजी",
    botanicalName: "Nigella sativa",
    botanicalFamily: "Ranunculaceae",
    aliases: ["nigella", "kalonji", "kalaunji", "nigella sativa", "black onion seed"],
    origin: "India and wider West/South Asia",
    growingRegions: ["Uttar Pradesh", "Rajasthan", "Punjab"],
    shortDescription: "Small black seeds (kalonji), not black cumin.",
    description: "Nigella sativa is kalonji. It is frequently confused with kala jeera. Keep them as separate entities.",
    forms: ["seeds"],
    flavourProfile: "Oregano-onion, slightly bitter",
    heatLevel: "none",
    culinaryUses: ["Naan", "Pickle", "Vegetables"],
    relatedSpiceIds: ["black-cumin", "mustard"],
  }),
  spice({
    id: "ajwain",
    canonicalName: "Ajwain",
    slug: "ajwain",
    hindiName: "अजवाइन",
    botanicalName: "Trachyspermum ammi",
    botanicalFamily: "Apiaceae",
    aliases: ["ajwain", "ajowan", "carom", "carom seeds", "bishop's weed"],
    origin: "India",
    growingRegions: ["Rajasthan", "Gujarat", "Madhya Pradesh"],
    shortDescription: "Thyme-like, pungent carom seeds.",
    description: "Ajwain (Trachyspermum ammi) is used in parathas, pakoras, and lentils. Strong thymol aroma.",
    forms: ["seeds"],
    flavourProfile: "Sharp, thyme, bitter-hot",
    heatLevel: "mild",
    culinaryUses: ["Paratha", "Pakora", "Dal", "Fish"],
    relatedSpiceIds: ["thyme-note", "cumin"],
  }),
  spice({
    id: "star-anise",
    canonicalName: "Star anise",
    slug: "star-anise",
    hindiName: "चक्र फूल",
    botanicalName: "Illicium verum",
    botanicalFamily: "Schisandraceae",
    aliases: ["star anise", "chakri phool", "badian"],
    origin: "Imported and re-exported in Indian spice trade; declare origin on pack",
    growingRegions: ["Northeast India"],
    shortDescription: "Star-shaped pods, liquorice aroma; used in garam masala and biryani.",
    description: "Star anise is Illicium verum. Japanese star anise (Illicium anisatum) is toxic and must never be substituted.",
    forms: ["whole", "powder"],
    flavourProfile: "Liquorice, sweet-warm",
    heatLevel: "none",
    culinaryUses: ["Biryani", "Garam masala", "Phirni", "Meat"],
    relatedSpiceIds: ["anise", "fennel"],
  }),
  spice({
    id: "bay-leaf",
    canonicalName: "Indian bay leaf",
    slug: "indian-bay-leaf",
    hindiName: "तेजपत्ता",
    botanicalName: "Cinnamomum tamala",
    botanicalFamily: "Lauraceae",
    aliases: ["tejpatta", "tej patta", "indian bay leaf", "cinnamomum tamala"],
    origin: "India — Himalayan foothills",
    growingRegions: ["Uttarakhand", "Himachal Pradesh", "Sikkim", "Northeast India"],
    shortDescription: "Tejpatta — cassia-family leaf, not Mediterranean Laurus nobilis.",
    description: "Indian bay leaf (Cinnamomum tamala) is used in biryani and gravies. Mediterranean bay (Laurus nobilis) is a different species.",
    forms: ["leaves", "whole"],
    flavourProfile: "Cinnamon-clove, woody",
    heatLevel: "none",
    culinaryUses: ["Biryani", "Curry", "Pulao"],
    relatedSpiceIds: ["cassia"],
  }),
  spice({
    id: "mace",
    canonicalName: "Mace",
    slug: "mace",
    hindiName: "जावित्री",
    botanicalName: "Myristica fragrans (aril)",
    botanicalFamily: "Myristicaceae",
    aliases: ["mace", "javitri", "javitri"],
    origin: "India — Kerala nutmeg gardens",
    growingRegions: ["Kerala"],
    shortDescription: "The aril of nutmeg; sold separately from the nutmeg kernel.",
    description: "Mace and nutmeg come from the same fruit. Market data often lists them as different forms, which is why grades matter.",
    forms: ["whole", "powder"],
    flavourProfile: "Warm, finer than nutmeg, peppery-sweet",
    heatLevel: "none",
    culinaryUses: ["Biryani", "Sweets", "Garam masala", "Meat"],
    relatedSpiceIds: ["nutmeg"],
  }),
  spice({
    id: "nutmeg",
    canonicalName: "Nutmeg",
    slug: "nutmeg",
    hindiName: "जायफल",
    botanicalName: "Myristica fragrans",
    botanicalFamily: "Myristicaceae",
    aliases: ["nutmeg", "jaiphal", "jaiphal", "myristica"],
    origin: "India — Kerala",
    growingRegions: ["Kerala"],
    shortDescription: "Kernel of the nutmeg fruit. UK import controls can apply to nutmeg/mace/cardamom categories.",
    description: "Nutmeg is Myristica fragrans kernel. Some dried spice categories from India currently face increased official controls — treat as a compliance workflow, not a marketing footnote.",
    forms: ["whole", "powder"],
    flavourProfile: "Warm, sweet, woody",
    heatLevel: "none",
    culinaryUses: ["Sweets", "Garam masala", "Bechamel-style sauces", "Meat"],
    relatedSpiceIds: ["mace"],
  }),
  spice({
    id: "dried-ginger",
    canonicalName: "Dried ginger",
    slug: "dried-ginger",
    hindiName: "सौंठ",
    botanicalName: "Zingiber officinale",
    botanicalFamily: "Zingiberaceae",
    aliases: ["sonth", "saunth", "dried ginger", "ginger powder"],
    origin: "India",
    growingRegions: ["Kerala", "Karnataka", "Assam", "Meghalaya", "Odisha"],
    shortDescription: "Dried rhizome (sonth), whole or powdered.",
    description: "Dried ginger is distinct from fresh ginger. Kerala ginger is a known origin story.",
    forms: ["whole", "powder"],
    flavourProfile: "Hot, dry, citrus-woody",
    heatLevel: "medium",
    culinaryUses: ["Tea", "Sweets", "Ayurvedic culinary mixes", "Curry"],
    relatedSpiceIds: ["turmeric", "dried-galangal"],
  }),
  spice({
    id: "dried-galangal",
    canonicalName: "Dried galangal",
    slug: "dried-galangal",
    botanicalName: "Alpinia galanga",
    botanicalFamily: "Zingiberaceae",
    aliases: ["galangal", "kulanjan"],
    origin: "India and Southeast Asia; declare lot origin",
    growingRegions: ["Northeast India", "Kerala"],
    shortDescription: "Dried rhizome related to ginger, more camphoraceous.",
    description: "Galangal is not ginger. Used in some regional and Indo-Southeast recipes.",
    forms: ["whole", "powder"],
    flavourProfile: "Pine, camphor, pepper",
    heatLevel: "mild",
    culinaryUses: ["Curry", "Soup-style gravies"],
    relatedSpiceIds: ["dried-ginger"],
  }),
  spice({
    id: "asafoetida",
    canonicalName: "Asafoetida",
    slug: "asafoetida",
    hindiName: "हींग",
    botanicalName: "Ferula assa-foetida",
    botanicalFamily: "Apiaceae",
    aliases: ["hing", "asafoetida", "heeng"],
    origin: "Resin imported and compounded in India; compounded hing often contains wheat or rice flour — allergen critical",
    growingRegions: ["Himachal Pradesh"],
    shortDescription: "Resin spice (hing). Compounded products may contain gluten.",
    description: "Asafoetida is a gum-resin. Many retail “hing” products are compounded with starch. Ingredients and allergens are mandatory, not optional.",
    forms: ["powder"],
    flavourProfile: "Allium-like, pungent",
    heatLevel: "none",
    culinaryUses: ["Dal", "Sambar", "Kadhi", "Pickle"],
  }),
  spice({
    id: "amchur",
    canonicalName: "Amchur",
    slug: "amchur",
    hindiName: "अमचूर",
    botanicalName: "Mangifera indica (dried unripe mango)",
    aliases: ["amchur", "amchoor", "mango powder"],
    origin: "India",
    growingRegions: ["Uttar Pradesh", "Bihar", "Andhra Pradesh"],
    shortDescription: "Dried raw mango powder for sourness.",
    description: "Amchur is dried unripe mango, used instead of or alongside tamarind/anardana for sour notes.",
    forms: ["powder", "whole"],
    flavourProfile: "Tart, fruity",
    heatLevel: "none",
    culinaryUses: ["Chaat", "Vegetables", "Chole", "Marinades"],
    relatedSpiceIds: ["tamarind"],
  }),
  spice({
    id: "tamarind",
    canonicalName: "Tamarind",
    slug: "tamarind",
    hindiName: "इमली",
    botanicalName: "Tamarindus indica",
    aliases: ["tamarind", "imli", "puli"],
    origin: "India",
    growingRegions: ["Andhra Pradesh", "Tamil Nadu", "Karnataka", "Maharashtra"],
    shortDescription: "Sour pulp, block or concentrate.",
    description: "Tamarind pulp is essential to South Indian rasam, sambar, and chutneys.",
    forms: ["whole", "blend"],
    flavourProfile: "Sour, caramel, fruity",
    heatLevel: "none",
    culinaryUses: ["Sambar", "Rasam", "Chutney", "Chole"],
    relatedSpiceIds: ["amchur"],
  }),
  spice({
    id: "long-pepper",
    canonicalName: "Long pepper",
    slug: "long-pepper",
    hindiName: "पीपली",
    botanicalName: "Piper longum",
    botanicalFamily: "Piperaceae",
    aliases: ["long pepper", "pippali", "pipli"],
    origin: "India",
    growingRegions: ["Western Ghats", "Northeast India", "West Bengal"],
    shortDescription: "Piper longum spikes, hotter and sweeter than black pepper.",
    description: "Long pepper (pippali) is used in some spice blends and traditional culinary preparations. Not a medicine page.",
    forms: ["whole", "powder"],
    flavourProfile: "Hot, sweet, complex",
    heatLevel: "hot",
    culinaryUses: ["Masala", "Pickle", "Meat"],
    relatedSpiceIds: ["black-pepper", "cubeb"],
  }),
  spice({
    id: "cubeb",
    canonicalName: "Cubeb",
    slug: "cubeb",
    botanicalName: "Piper cubeba",
    botanicalFamily: "Piperaceae",
    aliases: ["cubeb", "tailed pepper", "kabab chini"],
    origin: "Traded in India as kabab chini; declare origin",
    growingRegions: ["Northeast India"],
    shortDescription: "Tailed pepper berries used in some Mughlai and pickling mixes.",
    description: "Cubeb (Piper cubeba) is distinct from black pepper. Used sparingly in garam masala variants and pickles.",
    forms: ["whole"],
    flavourProfile: "Peppery, allspice-like",
    heatLevel: "medium",
    culinaryUses: ["Garam masala", "Pickle", "Meat"],
    relatedSpiceIds: ["black-pepper", "long-pepper"],
  }),
  spice({
    id: "poppy",
    canonicalName: "White poppy seed",
    slug: "poppy-seed",
    hindiName: "खसखस",
    botanicalName: "Papaver somniferum (culinary seed)",
    aliases: ["khus khus", "khas khas", "white poppy", "posto"],
    origin: "India — regulated commodity; follow destination food-law for poppy seed",
    growingRegions: ["Madhya Pradesh", "Rajasthan", "Uttar Pradesh"],
    shortDescription: "White poppy seed (posto / khus khus) for thickening gravies.",
    description: "Culinary white poppy seed is used in Bengali posto and many kormas. Import rules for poppy seed can be strict — compliance field required.",
    forms: ["seeds"],
    flavourProfile: "Nutty, creamy",
    heatLevel: "none",
    culinaryUses: ["Korma", "Posto", "Sweets"],
  }),
  spice({
    id: "sesame",
    canonicalName: "Sesame seed",
    slug: "sesame",
    hindiName: "तिल",
    botanicalName: "Sesamum indicum",
    aliases: ["sesame", "til", "white sesame", "black sesame"],
    origin: "India",
    growingRegions: ["Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh", "West Bengal"],
    shortDescription: "White or black sesame. Allergen: sesame.",
    description: "Sesame is a mandatory allergen in UK/EU labelling. Gujarat is a major Indian producing state.",
    forms: ["seeds"],
    flavourProfile: "Nutty, toasty",
    heatLevel: "none",
    culinaryUses: ["Ladoo", "Chikki", "Curry", "Tempering"],
  }),
  spice({
    id: "anise",
    canonicalName: "Anise seed",
    slug: "anise",
    botanicalName: "Pimpinella anisum",
    botanicalFamily: "Apiaceae",
    aliases: ["anise", "aniseed", "saunf-anise"],
    origin: "Traded in India; often confused with fennel — keep botanical distinct",
    growingRegions: ["Rajasthan", "Uttar Pradesh"],
    shortDescription: "True aniseed, smaller and different from fennel saunf.",
    description: "Anise (Pimpinella anisum) is not fennel and not star anise. Catalogue them separately.",
    forms: ["seeds"],
    flavourProfile: "Liquorice, sweet",
    heatLevel: "none",
    culinaryUses: ["Sweets", "Digestive mixes"],
    relatedSpiceIds: ["fennel", "star-anise"],
  }),
  spice({
    id: "caraway",
    canonicalName: "Caraway",
    slug: "caraway",
    botanicalName: "Carum carvi",
    botanicalFamily: "Apiaceae",
    aliases: ["caraway", "shia jeera", "carum carvi"],
    origin: "Used in Indian cooking; often confused with cumin",
    growingRegions: ["Himachal Pradesh", "Jammu and Kashmir"],
    shortDescription: "Caraway is not cumin; useful comparison page target.",
    description: "Caraway (Carum carvi) resembles cumin visually to untrained buyers. Flavour is more anise-rye.",
    forms: ["seeds"],
    flavourProfile: "Anise, rye, warm",
    heatLevel: "none",
    culinaryUses: ["Breads", "Cabbage-style dishes", "Some Kashmiri cooking"],
    relatedSpiceIds: ["cumin", "black-cumin"],
  }),
  spice({
    id: "dill-seed",
    canonicalName: "Dill seed",
    slug: "dill-seed",
    hindiName: "सूवा / सोल्वा",
    botanicalName: "Anethum graveolens",
    aliases: ["dill", "sowa", "suva", "dill seeds"],
    origin: "India",
    growingRegions: ["Rajasthan", "Gujarat", "Punjab"],
    shortDescription: "Dried dill seed for pickles and some dals.",
    description: "Dill seed is distinct from dill weed (leaf).",
    forms: ["seeds"],
    flavourProfile: "Grassy, caraway-like",
    heatLevel: "none",
    culinaryUses: ["Pickle", "Dal", "Vegetables"],
  }),
  spice({
    id: "celery-seed",
    canonicalName: "Celery seed",
    slug: "celery-seed",
    botanicalName: "Apium graveolens",
    aliases: ["celery seed", "ajmod"],
    origin: "India and global; allergen: celery in EU",
    growingRegions: ["Punjab", "Uttar Pradesh"],
    shortDescription: "Celery seed — EU allergen.",
    description: "Celery is a listed EU allergen. Mandatory on packs that contain it.",
    forms: ["seeds"],
    flavourProfile: "Bitter, parsley-celery",
    heatLevel: "none",
    culinaryUses: ["Pickle", "Spice blends"],
  }),
  spice({
    id: "dried-curry-leaf",
    canonicalName: "Dried curry leaf",
    slug: "dried-curry-leaves",
    hindiName: "कढ़ी पत्ता",
    botanicalName: "Murraya koenigii",
    aliases: ["curry leaves", "kadi patta", "karuveppilai", "murraya koenigii"],
    origin: "India",
    growingRegions: ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh"],
    shortDescription: "Dried Murraya koenigii leaves for South Indian tempering.",
    description: "Curry leaf is not curry powder. Dried leaves are milder than fresh.",
    forms: ["leaves"],
    flavourProfile: "Citrus, nutty, roasted when fried",
    heatLevel: "none",
    culinaryUses: ["Sambar", "Rasam", "South Indian tadka", "Chutney"],
  }),
  spice({
    id: "dried-mint",
    canonicalName: "Dried mint",
    slug: "dried-mint",
    hindiName: "पुदीना",
    botanicalName: "Mentha spp.",
    aliases: ["dried mint", "pudina"],
    origin: "India",
    growingRegions: ["Uttar Pradesh", "Punjab", "Rajasthan"],
    shortDescription: "Dried mint for raita, chaat, and some rice dishes.",
    description: "Dried mint is a herb, catalogued with spices because it ships and sells with the dry spice range.",
    forms: ["leaves"],
    flavourProfile: "Cool, menthol",
    heatLevel: "none",
    culinaryUses: ["Chaat", "Raita", "Biryani"],
  }),
  spice({
    id: "dried-garlic",
    canonicalName: "Dried garlic",
    slug: "dried-garlic",
    botanicalName: "Allium sativum",
    aliases: ["dried garlic", "garlic flakes", "garlic powder"],
    origin: "India",
    growingRegions: ["Madhya Pradesh", "Rajasthan", "Gujarat"],
    shortDescription: "Dehydrated garlic flakes or powder.",
    description: "Dried garlic is a convenience form. Flavour is harsher than fresh.",
    forms: ["flakes", "powder"],
    flavourProfile: "Pungent, savoury",
    heatLevel: "none",
    culinaryUses: ["Curry", "Marinades", "Masala"],
  }),
  spice({
    id: "kokum",
    canonicalName: "Kokum",
    slug: "kokum",
    botanicalName: "Garcinia indica",
    aliases: ["kokum", "amsul"],
    origin: "India — Western Ghats / Konkan",
    growingRegions: ["Maharashtra", "Goa", "Karnataka", "Kerala"],
    shortDescription: "Dried kokum rind, souring agent of the Konkan coast.",
    description: "Kokum (Garcinia indica) is used in sol kadhi and fish curries. Not interchangeable with tamarind in flavour.",
    forms: ["whole"],
    flavourProfile: "Sour, fruity, slightly smoky",
    heatLevel: "none",
    culinaryUses: ["Fish curry", "Sol kadhi", "Maharashtrian cooking"],
    relatedSpiceIds: ["tamarind"],
  }),
  spice({
    id: "white-pepper",
    canonicalName: "White pepper",
    slug: "white-pepper",
    botanicalName: "Piper nigrum (decorticated)",
    aliases: ["white pepper", "safed mirch"],
    origin: "India — processed from ripe pepper berries",
    growingRegions: ["Kerala", "Karnataka"],
    shortDescription: "Decorticated pepper; different flavour from black pepper.",
    description: "White pepper is Piper nigrum with the outer skin removed. Same species, different process and flavour.",
    forms: ["whole", "powder"],
    flavourProfile: "Musty-hot, less floral than black pepper",
    heatLevel: "medium",
    culinaryUses: ["Light-coloured sauces", "Some Chinese-Indian dishes"],
    relatedSpiceIds: ["black-pepper"],
  }),
  spice({
    id: "dried-red-chilli",
    canonicalName: "Dried red chilli (generic Indian)",
    slug: "dried-red-chilli",
    botanicalName: "Capsicum annuum / Capsicum frutescens",
    aliases: ["dried red chilli", "lal mirch", "red chilli"],
    origin: "India",
    growingRegions: ["Andhra Pradesh", "Telangana", "Karnataka", "Rajasthan", "Madhya Pradesh"],
    shortDescription: "Generic dried red chilli when a named cultivar is not specified.",
    description: "Prefer named cultivars (Guntur, Byadgi, Kashmiri) when the lot is identified. This entity is the fallback generic chilli.",
    forms: ["whole", "powder", "flakes", "crushed"],
    flavourProfile: "Hot, fruity or smoky depending on cultivar",
    heatLevel: "hot",
    culinaryUses: ["Curry", "Pickle", "Tadka"],
  }),
];

const chilliVarieties = [
  ["kashmiri-chilli", "Kashmiri chilli", "mild", ["Jammu and Kashmir"]],
  ["byadgi-chilli", "Byadgi chilli", "mild", ["Karnataka"]],
  ["guntur-sannam", "Guntur Sannam chilli", "hot", ["Andhra Pradesh"]],
  ["guntur-teja", "Guntur Teja chilli", "very_hot", ["Andhra Pradesh"]],
  ["s4-chilli", "S4 chilli", "hot", ["Andhra Pradesh"]],
  ["s10-chilli", "S10 chilli", "hot", ["Andhra Pradesh"]],
  ["resham-patti", "Resham Patti chilli", "medium", ["Madhya Pradesh"]],
  ["mathania-chilli", "Mathania chilli", "medium", ["Rajasthan"]],
  ["jwala-chilli", "Jwala chilli", "hot", ["Gujarat"]],
  ["sankeshwari-chilli", "Sankeshwari chilli", "hot", ["Maharashtra"]],
  ["mundu-chilli", "Mundu chilli", "medium", ["Tamil Nadu"]],
  ["ramnad-mundu", "Ramnad Mundu chilli", "medium", ["Tamil Nadu"]],
  ["kanthari-chilli", "Kanthari chilli", "very_hot", ["Kerala"]],
  ["bhut-jolokia", "Bhut Jolokia", "very_hot", ["Assam", "Northeast India"]],
  ["boria-chilli", "Boria chilli", "medium", ["Gujarat"]],
  ["dhani-chilli", "Dhani chilli", "hot", ["Rajasthan"]],
  ["salem-chilli", "Salem chilli", "hot", ["Tamil Nadu"]],
  ["wonder-hot-chilli", "Wonder Hot chilli", "hot", ["Andhra Pradesh"]],
  ["longi-chilli", "Longi chilli", "medium", ["Rajasthan"]],
  ["tomato-chilli", "Tomato chilli", "mild", ["Karnataka"]],
  ["round-chilli", "Round chilli", "medium", ["Tamil Nadu"]],
];

for (const [id, name, heat, regions] of chilliVarieties) {
  if (spices.some((s) => s.id === id)) continue;
  spices.push(
    spice({
      id,
      canonicalName: name,
      slug: id,
      botanicalName: "Capsicum annuum",
      botanicalFamily: "Solanaceae",
      aliases: [name.toLowerCase(), id.replace(/-/g, " ")],
      origin: "India",
      growingRegions: regions,
      shortDescription: `Named Indian chilli cultivar: ${name}.`,
      description: `${name} is a recognised Indian chilli type used in regional cooking. Heat and colour vary by harvest. Forms include whole, flakes and powder.`,
      forms: ["whole", "powder", "flakes"],
      heatLevel: heat,
      culinaryUses: ["Curry", "Pickle", "Masala", "Tandoori"],
      relatedSpiceIds: ["kashmiri-chilli", "byadgi-chilli", "guntur-teja", "dried-red-chilli"],
    })
  );
}

const masalas = [
  "Garam Masala",
  "Chaat Masala",
  "Biryani Masala",
  "Tandoori Masala",
  "Chicken Masala",
  "Meat Masala",
  "Fish Masala",
  "Curry Masala",
  "Kitchen King",
  "Chole Masala",
  "Rajma Masala",
  "Pav Bhaji Masala",
  "Sambar Masala",
  "Rasam Powder",
  "Madras Curry Powder",
  "Vindaloo Masala",
  "Korma Masala",
  "Butter Chicken Masala",
  "Tikka Masala",
  "Chettinad Masala",
  "Goda Masala",
  "Kolhapuri Masala",
  "Malvani Masala",
  "Panch Phoron",
  "Pickle Masala",
  "Tea Masala",
];

for (const name of masalas) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  spices.push(
    spice({
      id: slug,
      canonicalName: name,
      slug,
      aliases: [name.toLowerCase(), slug.replace(/-/g, " ")],
      origin: "India (blended)",
      growingRegions: ["Maharashtra", "Tamil Nadu", "Punjab", "West Bengal"],
      shortDescription: `Indian spice blend: ${name}. Ingredients must be listed before sale.`,
      description: `${name} is a traditional Indian blend. Exact recipes vary by mill. Multi-ingredient packs require a full ingredients list, allergens, and QUID where applicable. Do not invent a secret formula as if it were a certified standard.`,
      forms: ["blend", "powder"],
      flavourProfile: "Blend-dependent",
      heatLevel: name.includes("Kolhapuri") || name.includes("Vindaloo") || name.includes("Chettinad") ? "hot" : "medium",
      culinaryUses: [name.replace(" Masala", ""), "Curry"],
    })
  );
}

const extraWhole = [
  ["fenugreek-leaves", "Dried fenugreek leaves", "Trigonella foenum-graecum", ["leaves"], "kasuri methi"],
  ["dried-coriander-leaves", "Dried coriander leaves", "Coriandrum sativum", ["leaves"], "sukha dhania patta"],
];
for (const [id, name, bot, forms, alias] of extraWhole) {
  spices.push(
    spice({
      id,
      canonicalName: name,
      slug: id,
      botanicalName: bot,
      aliases: [alias, name.toLowerCase()],
      origin: "India",
      growingRegions: ["Rajasthan", "Gujarat"],
      shortDescription: name,
      description: `${name} is a dried herb used in Indian cooking.`,
      forms,
      heatLevel: "none",
      culinaryUses: ["Curry", "Garnish"],
    })
  );
}

const categories = [
  ["whole-spices", "Whole Spices"],
  ["ground-spices", "Ground Spices"],
  ["indian-chillies", "Indian Chillies"],
  ["seeds", "Seeds"],
  ["herbs", "Herbs"],
  ["dried-herbs", "Dried Herbs"],
  ["roots", "Roots"],
  ["barks", "Barks"],
  ["flowers", "Flowers"],
  ["premium-spices", "Premium Spices"],
  ["regional-spices", "Regional Spices"],
  ["indian-masalas", "Indian Masalas"],
  ["spice-blends", "Spice Blends"],
  ["tea-spices", "Tea Spices"],
  ["pickling-spices", "Pickling Spices"],
  ["speciality-spices", "Speciality Spices"],
  ["bulk-spices", "Bulk Spices"],
];

const categoryByForm = {
  whole: "whole-spices",
  seeds: "seeds",
  powder: "ground-spices",
  flakes: "indian-chillies",
  crushed: "ground-spices",
  roasted: "whole-spices",
  leaves: "dried-herbs",
  blend: "indian-masalas",
};

const chilliIds = new Set(chilliVarieties.map((c) => c[0]).concat(["kashmiri-chilli", "dried-red-chilli"]));
const seedIds = new Set(["cumin", "coriander", "fennel", "fenugreek", "mustard", "nigella", "ajwain", "anise", "caraway", "dill-seed", "celery-seed", "poppy", "sesame"]);
const rootIds = new Set(["turmeric", "dried-ginger", "dried-galangal"]);
const barkIds = new Set(["cassia", "cinnamon"]);
const flowerIds = new Set(["clove", "saffron", "mace"]);
const premiumIds = new Set(["saffron", "green-cardamom", "vanilla"]);
const teaIds = new Set(["green-cardamom", "clove", "cassia", "dried-ginger", "tea-masala"]);
const pickleIds = new Set(["mustard", "fenugreek", "nigella", "fennel", "amchur"]);

function categoryFor(spiceId, form) {
  if (chilliIds.has(spiceId) || spiceId.includes("chilli")) return "indian-chillies";
  if (form === "blend") return "indian-masalas";
  if (rootIds.has(spiceId)) return "roots";
  if (barkIds.has(spiceId)) return "barks";
  if (flowerIds.has(spiceId)) return "flowers";
  if (seedIds.has(spiceId) && (form === "seeds" || form === "whole")) return "seeds";
  return categoryByForm[form] || "whole-spices";
}

function additionalCats(spiceId, form, channel) {
  const extra = [];
  if (premiumIds.has(spiceId)) extra.push("premium-spices");
  if (teaIds.has(spiceId)) extra.push("tea-spices");
  if (pickleIds.has(spiceId)) extra.push("pickling-spices");
  if (channel === "bulk") extra.push("bulk-spices");
  if (["kerala", "rajasthan"].length) extra.push("regional-spices");
  if (form === "blend") extra.push("spice-blends");
  return [...new Set(extra)];
}

/** Draft INR selling prices per kg — not Indian market reference. */
const draftPerKg = {
  cumin: 520,
  coriander: 280,
  turmeric: 240,
  "black-pepper": 900,
  "green-cardamom": 4200,
  "black-cardamom": 1800,
  clove: 1100,
  cassia: 480,
  cinnamon: 1600,
  fennel: 320,
  fenugreek: 180,
  mustard: 160,
  nigella: 420,
  ajwain: 300,
  "star-anise": 700,
  "indian-bay-leaf": 380,
  mace: 2200,
  nutmeg: 900,
  saffron: 250000,
  "kashmiri-chilli": 480,
  "dried-ginger": 420,
  "dried-garlic": 360,
  asafoetida: 1800,
  amchur: 320,
  tamarind: 180,
  sesame: 260,
  default: 400,
};

function perKg(id) {
  if (draftPerKg[id]) return draftPerKg[id];
  if (id.includes("chilli")) return 420;
  if (masalas.map((m) => m.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).includes(id)) return 380;
  return draftPerKg.default;
}

function packsFor(spice, form) {
  if (spice.id === "saffron") {
    return [
      { label: "1g", kg: 0.001, channel: "retail" },
      { label: "2g", kg: 0.002, channel: "retail" },
      { label: "5g", kg: 0.005, channel: "retail" },
      { label: "10g", kg: 0.01, channel: "retail" },
    ];
  }
  if (form === "blend") {
    return [
      { label: "100g", kg: 0.1, channel: "retail" },
      { label: "200g", kg: 0.2, channel: "retail" },
      { label: "500g", kg: 0.5, channel: "retail" },
      { label: "1kg", kg: 1, channel: "retail" },
      { label: "10kg", kg: 10, channel: "bulk" },
      { label: "25kg", kg: 25, channel: "bulk" },
    ];
  }
  const retail = [
    { label: "100g", kg: 0.1, channel: "retail" },
    { label: "200g", kg: 0.2, channel: "retail" },
    { label: "500g", kg: 0.5, channel: "retail" },
    { label: "1kg", kg: 1, channel: "retail" },
    { label: "2kg", kg: 2, channel: "retail" },
    { label: "5kg", kg: 5, channel: "retail" },
  ];
  const bulk = [
    { label: "10kg", kg: 10, channel: "bulk" },
    { label: "25kg", kg: 25, channel: "bulk" },
    { label: "50kg", kg: 50, channel: "bulk" },
  ];
  // Keep combinations commercially sensible: not every form needs 2kg + 5kg + 50kg
  if (form === "flakes" || form === "crushed" || form === "roasted" || form === "leaves") {
    return [
      { label: "100g", kg: 0.1, channel: "retail" },
      { label: "500g", kg: 0.5, channel: "retail" },
      { label: "1kg", kg: 1, channel: "retail" },
      { label: "10kg", kg: 10, channel: "bulk" },
    ];
  }
  return [...retail, ...bulk];
}

function formsFor(s) {
  const forms = s.forms?.length ? s.forms : ["whole"];
  // Avoid duplicate whole+seeds SKUs
  const unique = [];
  for (const f of forms) {
    if (f === "seeds" && forms.includes("whole")) continue;
    unique.push(f);
  }
  return unique.length ? unique : ["whole"];
}

const products = [];
const bulkTiers = [];

for (const s of spices) {
  for (const form of formsFor(s)) {
    for (const pack of packsFor(s, form)) {
      const slug = `${s.slug}-${form}-${pack.label.toLowerCase()}`.replace(/\s+/g, "");
      const kgPrice = perKg(s.id);
      const bulkDiscount = pack.channel === "bulk" ? 0.82 : 1;
      const price = Math.max(1, Math.round(kgPrice * pack.kg * bulkDiscount * 100) / 100);
      const cat = categoryFor(s.id, form);
      const name =
        pack.channel === "bulk"
          ? `${s.canonicalName} ${form} — ${pack.label} bulk`
          : `${s.canonicalName} ${form} — ${pack.label}`;
      products.push({
        slug,
        name,
        description: `${s.shortDescription} Form: ${form}. Available bulk quantities: 100 gm, 200 gm, 500 gm, 1 kg, 5 kg, 10 kg, 15 kg, 20 kg, 25 kg, 1 metric ton. Origin: India. Enquire for availability.`,
        price,
        currency: "INR",
        categorySlug: cat,
        additionalCategorySlugs: additionalCats(s.id, form, pack.channel),
        images: [],
        sku: `SC-${s.id.slice(0, 8).toUpperCase()}-${form.slice(0, 3).toUpperCase()}-${pack.label.replace(/\./g, "")}`,
        inventory: pack.channel === "bulk" ? 50 : 200,
        tags: [
          `spice:${s.id}`,
          `form:${form}`,
          `channel:${pack.channel}`,
          `pack:${pack.label}`,
          `weightKg:${pack.kg}`,
          "draft-pricing",
        ],
        seoTitle: `${s.canonicalName} ${form} ${pack.label} | SpicyCorner`,
        seoDescription: `Buy ${s.canonicalName} (${s.hindiName || s.canonicalName}) as ${form} in ${pack.label}. Retail and bulk Indian spices for UK and EU customers.`,
        published: true,
        weightOz: Math.max(0.04, pack.kg * 35.274),
        createdAt: ts,
        updatedAt: ts,
      });
      if (pack.channel === "bulk") {
        bulkTiers.push({
          productSlug: slug,
          minQuantityKg: pack.kg,
          maxQuantityKg: pack.kg,
          pricePerKg: Math.round(kgPrice * 0.82 * 100) / 100,
          currency: "INR",
          grade: "Standard",
          packaging: `${pack.label} bag`,
          effectiveFrom: "2026-09-13",
        });
      }
    }
  }
}

const marketPrices = spices
  .filter((s) => s.featuredKnowledge || s.featured)
  .map((s) => ({
    spiceId: s.id,
    market: s.id === "cumin" ? "Unjha" : s.id === "black-pepper" ? "Cochin" : "India — unspecified",
    city: s.id === "cumin" ? "Unjha" : s.id === "black-pepper" ? "Kochi" : "",
    state: s.growingRegions?.[0] || "",
    grade: s.id === "black-pepper" ? "Garbled (admin to confirm)" : "Unspecified — set in admin",
    minPrice: null,
    maxPrice: null,
    averagePrice: null,
    unit: s.id === "saffron" ? "g" : "kg",
    currency: "INR",
    priceDate: "2026-09-13",
    source: "Not imported — awaiting trusted source adapter (e.g. Spices Board India where permitted)",
    sourceUrl: "",
    notes:
      "Indicative Indian market prices must be imported or entered with date, market, grade and source. Empty values are intentional so the site does not fabricate today's rates.",
    verificationStatus: "pending_market_data",
  }));

const recipes = [
  { slug: "jeera-rice", title: "Jeera rice", spiceIds: ["cumin"], cuisine: "North Indian", summary: "Basmati tempered with cumin seeds." },
  { slug: "dal-tadka", title: "Dal tadka", spiceIds: ["cumin", "turmeric", "asafoetida", "dried-red-chilli"], cuisine: "North Indian", summary: "Lentils finished with a spice tempering." },
  { slug: "biryani", title: "Biryani", spiceIds: ["green-cardamom", "black-cardamom", "clove", "cassia", "indian-bay-leaf", "cumin", "saffron"], cuisine: "Indian", summary: "Layered rice; spices vary by region." },
  { slug: "curry", title: "Everyday Indian curry base", spiceIds: ["cumin", "coriander", "turmeric", "kashmiri-chilli"], cuisine: "Indian", summary: "Cumin, coriander, turmeric and chilli as a starting masala." },
  { slug: "masala-chai", title: "Masala chai", spiceIds: ["green-cardamom", "clove", "cassia", "dried-ginger"], cuisine: "Indian", summary: "Tea spices; recipes vary by household." },
  { slug: "sambar", title: "Sambar", spiceIds: ["sambar-masala", "tamarind", "dried-curry-leaves", "mustard", "asafoetida"], cuisine: "South Indian", summary: "Lentil-vegetable stew with tamarind and mustard tempering." },
];

const comparisons = [
  { slug: "cumin-vs-black-cumin", a: "cumin", b: "black-cumin", title: "Cumin vs black cumin" },
  { slug: "cumin-vs-caraway", a: "cumin", b: "caraway", title: "Cumin vs caraway" },
  { slug: "cassia-vs-cinnamon", a: "cassia", b: "cinnamon", title: "Cassia vs cinnamon" },
  { slug: "green-cardamom-vs-black-cardamom", a: "green-cardamom", b: "black-cardamom", title: "Green cardamom vs black cardamom" },
  { slug: "kashmiri-chilli-vs-byadgi-chilli", a: "kashmiri-chilli", b: "byadgi-chilli", title: "Kashmiri chilli vs Byadgi chilli" },
  { slug: "guntur-chilli-vs-teja-chilli", a: "guntur-sannam", b: "guntur-teja", title: "Guntur Sannam vs Teja chilli" },
  { slug: "whole-spices-vs-ground-spices", a: "cumin", b: "cumin", title: "Whole spices vs ground spices" },
  { slug: "garam-masala-vs-curry-powder", a: "garam-masala", b: "madras-curry-powder", title: "Garam masala vs curry powder" },
  { slug: "indian-bay-leaf-vs-mediterranean-bay-leaf", a: "indian-bay-leaf", b: "indian-bay-leaf", title: "Indian bay leaf vs Mediterranean bay leaf" },
];

const catalogCategories = categories.map((c, i) => ({
  slug: c[0],
  name: c[1],
  description: `${c[1]} from the SpicyCorner Indian spice catalogue.`,
  image: "",
  sortOrder: i,
  published: true,
  createdAt: ts,
  updatedAt: ts,
}));

const dataDir = join(root, "data");
const scriptsData = join(root, "scripts/data");
mkdirSync(dataDir, { recursive: true });
mkdirSync(scriptsData, { recursive: true });

writeFileSync(join(dataDir, "spices.json"), JSON.stringify(spices, null, 2));
writeFileSync(join(dataDir, "products.json"), JSON.stringify(products, null, 2));
writeFileSync(join(dataDir, "market-prices.json"), JSON.stringify(marketPrices, null, 2));
writeFileSync(join(dataDir, "bulk-price-tiers.json"), JSON.stringify(bulkTiers, null, 2));
writeFileSync(join(dataDir, "recipes.json"), JSON.stringify(recipes, null, 2));
writeFileSync(join(dataDir, "comparisons.json"), JSON.stringify(comparisons, null, 2));
writeFileSync(
  join(dataDir, "shipping-rates.json"),
  JSON.stringify(
    {
      notes: "UK ₹750/kg is the default configurable rate, not a claim that duty/VAT is included.",
      rates: [
        {
          id: "uk-inr-per-kg",
          zone: "UK",
          country: "GB",
          perKgCharge: 750,
          currency: "INR",
          minimumWeightKg: 1,
          includesCustomsDuty: false,
          includesVat: false,
        },
      ],
    },
    null,
    2
  )
);

const csvHeader = "name,slug,category,common_names,indian_names,botanical_name,region,form,description,grade,status,verification\n";
const csvRows = spices.map((s) => {
  const row = [
    s.canonicalName,
    s.slug,
    s.forms?.[0] || "",
    (s.commonNames || []).join("|"),
    (s.indianNames || []).join("|"),
    s.botanicalName || "",
    (s.growingRegions || []).join("|"),
    (s.forms || []).join("|"),
    (s.shortDescription || "").replace(/"/g, "'"),
    "admin-configured",
    s.status,
    s.verificationStatus,
  ];
  return row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
});
writeFileSync(join(dataDir, "spices.csv"), csvHeader + csvRows.join("\n"));

writeFileSync(
  join(scriptsData, "spicycenter-catalog.json"),
  JSON.stringify({ categories: catalogCategories, products }, null, 2)
);

console.log(
  JSON.stringify(
    {
      spices: spices.length,
      products: products.length,
      bulkTiers: bulkTiers.length,
      marketPriceRows: marketPrices.length,
      recipes: recipes.length,
    },
    null,
    2
  )
);
