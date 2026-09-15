import type { SpiceEntity } from "@spicycorner/shared";

/** Common Hindi / regional names for storefront display. Overlay only — does not rewrite spices.json. */
export const SPICE_HINDI_NAMES: Record<string, string> = {
  cinnamon: "दालचीनी (true cinnamon — confirm species)",
  "dried-galangal": "गैलांगल",
  cubeb: "कबाब चीनी",
  anise: "सौंफ जैसा अनिस (Pimpinella)",
  caraway: "शाहजीरा (often confused with cumin)",
  "celery-seed": "अजवाइन जैसा सेलरी बीज",
  "dried-garlic": "लहसुन (सूखा)",
  kokum: "कोकम",
  "white-pepper": "सफ़ेद मिर्च",
  "dried-red-chilli": "सूखी लाल मिर्च",
  "byadgi-chilli": "ब्याडगी मिर्च",
  "guntur-sannam": "गुंटूर सन्नम मिर्च",
  "guntur-teja": "गुंटूर तेजा मिर्च",
  "s4-chilli": "S4 मिर्च",
  "s10-chilli": "S10 मिर्च",
  "resham-patti": "रेशम पट्टी मिर्च",
  "mathania-chilli": "मथानिया मिर्च",
  "jwala-chilli": "ज्वाला मिर्च",
  "sankeshwari-chilli": "सांकेश्वरी मिर्च",
  "mundu-chilli": "मुंडू मिर्च",
  "ramnad-mundu": "रामनद मुंडू मिर्च",
  "kanthari-chilli": "कंठारी मिर्च",
  "bhut-jolokia": "भुत जोलोकिया",
  "boria-chilli": "बोरिया मिर्च",
  "dhani-chilli": "धानी मिर्च",
  "salem-chilli": "सेलम मिर्च",
  "wonder-hot-chilli": "वंडर हॉट मिर्च",
  "longi-chilli": "लोंगी मिर्च",
  "tomato-chilli": "टमाटर मिर्च",
  "round-chilli": "गोल मिर्च",
  "garam-masala": "गरम मसाला",
  "chaat-masala": "चाट मसाला",
  "biryani-masala": "बिरयानी मसाला",
  "tandoori-masala": "तंदूरी मसाला",
  "chicken-masala": "चिकन मसाला",
  "meat-masala": "मीट मसाला",
  "fish-masala": "फिश मसाला",
  "curry-masala": "करी मसाला",
  "kitchen-king": "किचन किंग मसाला",
  "chole-masala": "छोले मसाला",
  "rajma-masala": "राजमा मसाला",
  "pav-bhaji-masala": "पाव भाजी मसाला",
  "sambar-masala": "सांभर मसाला",
  "rasam-powder": "रसम पाउडर",
  "madras-curry-powder": "मद्रास करी पाउडर",
  "vindaloo-masala": "विंदालू मसाला",
  "korma-masala": "कोरमा मसाला",
  "butter-chicken-masala": "बटर चिकन मसाला",
  "tikka-masala": "टिक्का मसाला",
  "chettinad-masala": "चेट्टिनाड मसाला",
  "goda-masala": "गोडा मसाला",
  "kolhapuri-masala": "कोल्हापुरी मसाला",
  "malvani-masala": "मालवणी मसाला",
  "panch-phoron": "पंच फोरन",
  "pickle-masala": "अचार मसाला",
  "tea-masala": "चाय मसाला",
  "fenugreek-leaves": "कसूरी मेथी",
  "dried-coriander-leaves": "सूखा धनिया पत्ता",
};

const BROKEN_GALANGAL = "dried-galangal";

export function displayHindiName(spice: SpiceEntity): string {
  if (spice.hindiName?.trim()) return spice.hindiName;
  if (spice.slug === BROKEN_GALANGAL) return "गैलांगल";
  return SPICE_HINDI_NAMES[spice.slug] ?? spice.indianNames?.[0] ?? "—";
}

export function withDisplayNames(spice: SpiceEntity): SpiceEntity {
  const hindi = displayHindiName(spice);
  return {
    ...spice,
    hindiName: hindi === "—" ? spice.hindiName : hindi,
  };
}

export function spiceGuideGroup(spice: SpiceEntity): string {
  const slug = spice.slug;
  if (spice.forms.includes("blend") || slug.includes("masala") || slug.endsWith("-powder")) {
    if (["sambar-masala", "rasam-powder", "madras-curry-powder", "vindaloo-masala", "chettinad-masala"].includes(slug)) {
      return "South Indian blends";
    }
    if (["goda-masala", "kolhapuri-masala", "malvani-masala", "panch-phoron"].includes(slug)) {
      return "Regional blends";
    }
    return "Masalas & blends";
  }
  if (slug.includes("chilli") || slug === "bhut-jolokia") return "Indian chillies";
  if (["black-pepper", "white-pepper", "long-pepper", "cubeb"].includes(slug)) return "Peppers";
  if (["turmeric", "dried-ginger", "dried-galangal"].includes(slug)) return "Rhizomes & roots";
  if (["dried-curry-leaves", "dried-mint", "fenugreek-leaves", "dried-coriander-leaves", "indian-bay-leaf"].includes(slug)) {
    return "Leaves & herbs";
  }
  if (["saffron", "green-cardamom", "black-cardamom", "clove", "mace", "nutmeg", "star-anise", "cinnamon", "cassia"].includes(slug)) {
    return "Aromatics & premium";
  }
  return "Seeds & everyday spices";
}

export function wholeVsGroundCopy(spice: SpiceEntity): string {
  const forms = spice.forms;
  const name = spice.canonicalName;
  const hasWhole = forms.some((f) => ["whole", "seeds", "leaves"].includes(f));
  const hasGround = forms.some((f) => ["powder", "crushed", "flakes", "blend"].includes(f));
  if (hasWhole && hasGround) {
    return `${name} is sold whole (or as seed/leaf) and as a ground form. Whole keeps aroma longer in a UK cupboard; grind or crush just before cooking when you can. Powder is convenient for daily dal, curry and marinades — buy a pack you will finish in a few months.`;
  }
  if (hasGround && !hasWhole) {
    return `${name} is typically used as a powder or blend. Keep the tin airtight, away from the hob steam, and replace when the aroma has gone flat.`;
  }
  return `${name} is usually used whole. Toast briefly in dry pan or hot fat, then leave whole in the dish or grind. Do not confuse toasting with burning — bitter notes mean it went too far.`;
}

export function nutritionDisclaimer(spice: SpiceEntity): string {
  if (spice.nutrition?.trim()) return spice.nutrition;
  return `${spice.canonicalName} is a culinary seasoning. Nutrition values are pack-specific and must match the label for UK/EU sale. We do not claim that this spice treats, cures or prevents disease.`;
}

export function parseProductSpiceTag(tags?: string[]): { spiceId?: string; form?: string; pack?: string } {
  const out: { spiceId?: string; form?: string; pack?: string } = {};
  for (const tag of tags ?? []) {
    if (tag.startsWith("spice:")) out.spiceId = tag.slice(6);
    else if (tag.startsWith("form:")) out.form = tag.slice(5);
    else if (tag.startsWith("pack:")) out.pack = tag.slice(5);
  }
  return out;
}

export function packUniqueBlurb(name: string, pack?: string, form?: string): string {
  const packLabel = pack ?? "this pack";
  const formLabel = form ? form.replace(/-/g, " ") : "this form";
  if (pack === "100g") {
    return `This ${packLabel} ${formLabel} pack is sized for a UK household trying the spice or topping up a masala tin — enough for several weeks of tadka and rice, not a restaurant sack.`;
  }
  if (pack === "200g") {
    return `This ${packLabel} pack suits weekly Indian cooking at home: enough ${formLabel} ${name.replace(/—.*$/, "").trim()} for dals and curries without the aroma going stale in a large bag.`;
  }
  if (pack === "500g") {
    return `A ${packLabel} bag is a mid-size refill for cooks who use ${formLabel} often. Store airtight; ground spices fade faster than whole.`;
  }
  if (pack === "1kg" || pack === "1000g") {
    return `This 1kg pack is for busy home kitchens or small catering. Split into jars so you are not opening the full kilo every night.`;
  }
  if (pack === "5kg") {
    return `A 5kg pack sits between retail and wholesale. Best if you will use this ${formLabel} within the stated shelf window.`;
  }
  if (pack && /kg/.test(pack)) {
    return `This ${packLabel} listing is a bulk size (wholesale starts at 10kg). Confirm grade and origin on the lot, not from a generic state story.`;
  }
  return `This listing is the ${formLabel} SKU for ${name}. Shared spice facts live on the guide; this page is about this pack and form.`;
}
