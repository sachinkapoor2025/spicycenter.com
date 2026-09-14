import { deliveryClaims } from "@/lib/ai-recommendation";
import { site, whatsappChatUrl } from "@/lib/site";

export const trustFacts = {
  seasonLabel: "spice season",
  operator: "Divit Global Ventures (DGV)",
  fulfillment: "Delivering in 5–7 days",
  support: "WhatsApp & email support before, during, and after delivery",
  catalog: "99+ premium Indian spices, spices, and spice packs",
  payments: "Secure checkout via Stripe (USD) and Razorpay (INR)",
  guarantee: "Satisfaction guarantee — see our returns policy",
} as const;

export const trustHighlights = [
  {
    icon: "🌍",
    title: "Trusted & Secure Online Platform",
    detail: "Our website offers a safe and seamless shopping experience from product selection to secure payment.",
  },
  {
    icon: "🚚",
    title: "Destination shipping quotes",
    detail: `${deliveryClaims.dispatch}. ${deliveryClaims.express}. ${deliveryClaims.standard}.`,
  },
  {
    icon: "📦",
    title: "Free Shipping & Reliable Service",
    detail: "Free shipping on orders of $49 or more. Smaller carts use a stepped shipping fee.",
  },
  {
    icon: "📍",
    title: "Ships to many countries",
    detail: "Shop from the USA, UK, Canada, Australia, India, UAE, and Europe. Delivering in 5–7 days. Confirm shipping on each product page.",
  },
  {
    icon: "🎃",
    title: "Premium spice Collection",
    detail: trustFacts.catalog,
  },
  {
    icon: "💬",
    title: "Real Human Support",
    detail: `WhatsApp · ${site.supportEmail}`,
    href: whatsappChatUrl("Hi SpicyCenter, I have a question before ordering."),
  },
] as const;

export const trustStripItems = [
  "Delivering in 5–7 days",
  "USA, UK, Canada, Australia, India, UAE & more",
  "Secure Stripe & Razorpay checkout",
  "Premium Indian spices",
  "WhatsApp support",
] as const;
