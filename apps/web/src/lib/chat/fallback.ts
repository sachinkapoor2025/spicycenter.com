import { site, navItems, faqs, whatsappChatUrl } from "@/lib/site";
import { siteUrl } from "@/lib/env";

const OFF_TOPIC_REPLY = `I'm here to help with the SpicyCenter spice catalogue and enquiries. Is there a spice I can help you find?

Browse: [Catalogue](${siteUrl}/spices) · [Enquire](${siteUrl}/enquiry) · [WhatsApp](${whatsappChatUrl()})`;

const SITE_KEYWORDS =
  /\b(spice|spices|cumin|turmeric|chilli|chili|masala|wholesale|bulk|uk|eu|shipping|deliver|order|payment|stripe|razorpay|product|cart|price|track|support|spicycorner|jeera|haldi|elaichi)\b/i;

function categoriesReply(): string {
  const links = navItems.map((n) => `- [${n.label}](${siteUrl}${n.href})`).join("\n");
  return `Browse the Indian spice catalogue and send an enquiry:\n\n${links}\n\nPack sizes run from 100 gm to 1 metric ton. Worldwide delivery is confirmed on enquiry.`;
}

function deliveryReply(): string {
  return `SpicyCenter supplies worldwide. Delivery timing is confirmed when you enquire — product pages do not show a delivery date.\n\n[Enquire Now](${siteUrl}/enquiry)`;
}

function spiceReply(): string {
  return `SpicyCenter is an Indian spice catalogue — whole spices, powders, chillies and masalas. Origin: India.\n\nStart here: [Catalogue](${siteUrl}/spices) · [Enquire Now](${siteUrl}/enquiry)`;
}

function paymentReply(): string {
  return `This website does not take payment. Send an [enquiry](${siteUrl}/enquiry) and we will reply with availability.\n\nQuestions? [WhatsApp](${whatsappChatUrl()}) or ${site.supportEmail}.`;
}

function greetingReply(): string {
  return `Welcome to SpicyCenter. Browse the catalogue, pick a pack size, and send an enquiry.\n\n- [Whole spices](${siteUrl}/spices/whole-spices)\n- [Chillies](${siteUrl}/spices/indian-chillies)\n- [Enquire Now](${siteUrl}/enquiry)`;
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
  if (/wholesale|10kg|25kg|bulk|enquire|pack/.test(q)) {
    return `Pack sizes are 100 gm, 200 gm, 500 gm, 1 kg, 5 kg, 10 kg, 15 kg, 20 kg, 25 kg and 1 metric ton. [Enquire Now](${siteUrl}/enquiry)`;
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
