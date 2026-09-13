/** Starter marketing templates installed into Admin → Marketing Emails → Templates. */

import {
  DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT,
  PREMIUM_MARKETING_EMAIL_LAYOUT,
  buildPremiumMarketingEmailHtml,
  buildFreeShippingEmailHtml,
  buildStartingPriceEmailHtml,
  buildShopMoreSaveMoreEmailHtml,
  FREE_SHIPPING_EMAIL_CONFIG,
  STARTING_PRICE_EMAIL_CONFIG,
  SHOP_MORE_SAVE_MORE_EMAIL_CONFIG,
  type MarketingEmailContent,
} from "@spicycorner/shared";

export type StarterEmailTemplateMeta = {
  templateId: string;
  name: string;
  subject: string;
  htmlPath?: string;
  layout?: typeof PREMIUM_MARKETING_EMAIL_LAYOUT;
  contentFields?: MarketingEmailContent;
  buildHtml?: () => string;
  preserveAdminEdits?: boolean;
};

export const SPICE_PREMIUM_TEMPLATE_ID = "premium-spice";
export const FREE_SHIPPING_TEMPLATE_ID = FREE_SHIPPING_EMAIL_CONFIG.templateId;
export const STARTING_PRICE_TEMPLATE_ID = STARTING_PRICE_EMAIL_CONFIG.templateId;
export const SHOP_MORE_SAVE_MORE_TEMPLATE_ID = SHOP_MORE_SAVE_MORE_EMAIL_CONFIG.templateId;

export const STARTER_EMAIL_TEMPLATES: StarterEmailTemplateMeta[] = [
  {
    templateId: SPICE_PREMIUM_TEMPLATE_ID,
    name: "Premium spices (Editable)",
    subject: "Indian spices from SpicyCorner",
    layout: PREMIUM_MARKETING_EMAIL_LAYOUT,
    contentFields: DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT,
    preserveAdminEdits: true,
  },
  {
    templateId: FREE_SHIPPING_TEMPLATE_ID,
    name: FREE_SHIPPING_EMAIL_CONFIG.name,
    subject: FREE_SHIPPING_EMAIL_CONFIG.subject,
    buildHtml: () => buildFreeShippingEmailHtml(),
    htmlPath: "/email-templates/free-shipping-above-7.html",
  },
  {
    templateId: STARTING_PRICE_TEMPLATE_ID,
    name: STARTING_PRICE_EMAIL_CONFIG.name,
    subject: STARTING_PRICE_EMAIL_CONFIG.subject,
    buildHtml: () => buildStartingPriceEmailHtml(),
  },
  {
    templateId: SHOP_MORE_SAVE_MORE_TEMPLATE_ID,
    name: SHOP_MORE_SAVE_MORE_EMAIL_CONFIG.name,
    subject: SHOP_MORE_SAVE_MORE_EMAIL_CONFIG.subject,
    buildHtml: () => buildShopMoreSaveMoreEmailHtml(),
    htmlPath: "/email-templates/shop-more-save-more.html",
  },
];

export function resolveStarterHtmlBody(starter: StarterEmailTemplateMeta, fileHtml?: string): string {
  if (starter.buildHtml) {
    return starter.buildHtml();
  }
  if (starter.contentFields && starter.layout === PREMIUM_MARKETING_EMAIL_LAYOUT) {
    return buildPremiumMarketingEmailHtml(starter.contentFields);
  }
  if (starter.contentFields) {
    return buildPremiumMarketingEmailHtml(starter.contentFields);
  }
  return fileHtml?.trim() || "";
}
