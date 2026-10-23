/** Starter marketing templates installed into Admin → Marketing Emails → Templates. */

import {
  DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT,
  DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT,
  PREMIUM_MARKETING_EMAIL_LAYOUT,
  VISIT_WEBSITE_EMAIL_LAYOUT,
  VISIT_WEBSITE_EMAIL_NAME,
  VISIT_WEBSITE_EMAIL_SUBJECT,
  VISIT_WEBSITE_TEMPLATE_ID,
  buildPremiumMarketingEmailHtml,
  buildVisitWebsiteEmailHtml,
  buildFreeShippingEmailHtml,
  buildStartingPriceEmailHtml,
  buildShopMoreSaveMoreEmailHtml,
  FREE_SHIPPING_EMAIL_CONFIG,
  STARTING_PRICE_EMAIL_CONFIG,
  SHOP_MORE_SAVE_MORE_EMAIL_CONFIG,
  isVisitWebsiteEmailContent,
  type MarketingEmailContent,
  type VisitWebsiteEmailContent,
} from "@spicycorner/shared";

export type StarterEmailTemplateMeta = {
  templateId: string;
  name: string;
  subject: string;
  htmlPath?: string;
  layout?: typeof PREMIUM_MARKETING_EMAIL_LAYOUT | typeof VISIT_WEBSITE_EMAIL_LAYOUT;
  contentFields?: MarketingEmailContent | VisitWebsiteEmailContent;
  buildHtml?: () => string;
  preserveAdminEdits?: boolean;
};

export const SPICE_PREMIUM_TEMPLATE_ID = "premium-spice";
export { VISIT_WEBSITE_TEMPLATE_ID };
export const FREE_SHIPPING_TEMPLATE_ID = FREE_SHIPPING_EMAIL_CONFIG.templateId;
export const STARTING_PRICE_TEMPLATE_ID = STARTING_PRICE_EMAIL_CONFIG.templateId;
export const SHOP_MORE_SAVE_MORE_TEMPLATE_ID = SHOP_MORE_SAVE_MORE_EMAIL_CONFIG.templateId;

export const STARTER_EMAIL_TEMPLATES: StarterEmailTemplateMeta[] = [
  {
    templateId: VISIT_WEBSITE_TEMPLATE_ID,
    name: VISIT_WEBSITE_EMAIL_NAME,
    subject: VISIT_WEBSITE_EMAIL_SUBJECT,
    layout: VISIT_WEBSITE_EMAIL_LAYOUT,
    contentFields: DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT,
    preserveAdminEdits: true,
  },
  {
    templateId: SPICE_PREMIUM_TEMPLATE_ID,
    name: "Premium spices (Editable)",
    subject: "Indian spices from SpicyCenter",
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
  if (starter.layout === VISIT_WEBSITE_EMAIL_LAYOUT && isVisitWebsiteEmailContent(starter.contentFields)) {
    return buildVisitWebsiteEmailHtml(starter.contentFields);
  }
  if (starter.buildHtml) {
    return starter.buildHtml();
  }
  if (starter.contentFields && "heading" in starter.contentFields) {
    return buildPremiumMarketingEmailHtml(starter.contentFields);
  }
  return fileHtml?.trim() || "";
}
