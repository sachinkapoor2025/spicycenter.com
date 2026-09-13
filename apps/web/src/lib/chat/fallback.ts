import { site, navItems, faqs, whatsappChatUrl } from "@/lib/site";
import { siteUrl } from "@/lib/env";

const OFF_TOPIC_REPLY = `I'm here to help with SpicyCorner — Indian spices, bulk orders, shipping, and checkout. Is there a spice I can help you find?

Browse: [All Products](${siteUrl}/products) · [WhatsApp](${whatsappChatUrl()})`;

const SITE_KEYWORDS =
  /\b(spice|spices|cumin|turmeric|chilli|chili|masala|wholesale|bulk|uk|eu|shipping|deliver|order|payment|stripe|razorpay|product|cart|price|track|support|spicycorner|jeera|haldi|elaichi)\b/i;

function categoriesReply(): string {
  const links = navItems.map((n) => `- [${n.label}](${siteUrl}${n.href})`).join("\n");
  return `We sell Indian spices for retail and 10kg+ wholesale:\n\n${links}\n\nConfirm shipping on the product page. Indicative market prices are not invoice prices.`;
}

function deliveryReply(): string {
  return `UK shipping is a configurable per-kg rate (default ₹750/kg). Duty and VAT are separate unless a rule says they are included.\n\nMore: [Shipping](${siteUrl}/shipping)`;
}

function spiceReply(): string {
  return `SpicyCorner is an Indian spice shop — whole spices, powders, chillies, masalas, and bulk packs.\n\nStart here: [Shop spices](${siteUrl}/spices) · [Spice guide](${siteUrl}/spice-guide) · [Wholesale](${siteUrl}/wholesale)`;
}

function orderWorldwideReply(): string {
  return `Primary market is the UK. Other countries depend on configured shipping. Confirm the quote on the product page.\n\n[UK spices](${siteUrl}/uk) · [Shop](${siteUrl}/products)`;
}

function paymentReply(): string {
  return `Checkout uses Stripe and/or Razorpay where enabled. We never store card details.\n\nQuestions? [WhatsApp](${whatsappChatUrl()}) or ${site.supportEmail}.`;
}

function greetingReply(): string {
  return `Welcome to SpicyCorner. I can help you find Indian spices, bulk packs, or shipping answers.\n\n- [Whole spices](${siteUrl}/spices/whole-spices)\n- [Chillies](${siteUrl}/spices/indian-chillies)\n- [Wholesale](${siteUrl}/wholesale)`;
}

function findFaqMatch(query: string): string | null {
  const q = query.toLowerCase();
  for (const f of faqs) {
    const words = f.q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    if (words.filter((w) => q.includes(w)).length >= 2) return `**${f.q}**\n${f.a}`;
  }
  return null;
}

export function isOnTopic(query: string): boolean {
  return SITE_KEYWORDS.test(query);
}

export function fallbackReply(query: string): string {
  const q = query.toLowerCase();
  if (!isOnTopic(q) && q.length > 12) return OFF_TOPIC_REPLY;
  if (/categor|what do you sell|shop|browse/.test(q)) return categoriesReply();
  if (/ship|deliver|uk|duty|vat|postage/.test(q)) return deliveryReply();
  if (/wholesale|10kg|25kg|bulk/.test(q)) {
    return `Wholesale starts at 10kg. [Wholesale](${siteUrl}/wholesale) · [Bulk spices](${siteUrl}/bulk-spices)`;
  }
  if (/payment|pay|stripe|razorpay|card|checkout/.test(q)) return paymentReply();
  if (/hello|hi\b|hey|help|start/.test(q) && q.length < 30) return greetingReply();
  if (/contact|support|email|whatsapp|track|refund/.test(q)) {
    return `Order help: [WhatsApp](${whatsappChatUrl()}) or ${site.supportEmail}. [FAQ](${siteUrl}/faq)`;
  }
  const faqAnswer = findFaqMatch(q);
  if (faqAnswer) return `${faqAnswer}\n\n[Shop](${siteUrl}/products)`;
  return spiceReply();
}
