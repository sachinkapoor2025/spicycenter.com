import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT,
  PREMIUM_MARKETING_EMAIL_LAYOUT,
} from "./marketing-email-html";
import { createSesTemplateSchema, resolveSesTemplateHtml } from "../schemas/ses-email";
import {
  DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT,
  VISIT_WEBSITE_EMAIL_LAYOUT,
  buildVisitWebsiteEmailHtml,
  visitWebsiteEmailContentSchema,
} from "./visit-website-email";

describe("visit website marketing email", () => {
  const html = buildVisitWebsiteEmailHtml(DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT);

  it("uses a short layout with the live catalogue button", () => {
    assert.match(html, /Explore Our Products/);
    assert.match(html, /href="https:\/\/www\.spicycenter\.com\/spices"/);
    assert.match(html, /Authentic Indian spices/);
    assert.match(html, /role="presentation"/);
    assert.match(html, /<table/);
    assert.match(html, /@media only screen and \(max-width: 620px\)/);
    assert.match(html, /<!--\[if mso\]>/);
    assert.doesNotMatch(html, /display:\s*flex|display:\s*grid/);
    assert.doesNotMatch(html, /discount|%\s*off|free shipping|limited time/i);
    assert.doesNotMatch(html, /Featured Categories|Our Promise/);
  });

  it("loads the live logo and catalogue photos", () => {
    assert.match(html, /src="https:\/\/www\.spicycenter\.com\/brand-logo\.png"/);
    assert.match(html, /src="https:\/\/www\.spicycenter\.com\/images\/spices\/cumin\.jpg"/);
    assert.match(html, /src="https:\/\/www\.spicycenter\.com\/images\/spices\/turmeric\.jpg"/);
    assert.match(html, /src="https:\/\/www\.spicycenter\.com\/images\/spices\/green-cardamom\.jpg"/);
    assert.match(html, /href="https:\/\/www\.spicycenter\.com\/spices\/cumin"/);
    assert.match(html, /href="https:\/\/www\.spicycenter\.com\/spices\/turmeric"/);
    assert.match(html, /href="https:\/\/www\.spicycenter\.com\/spices\/green-cardamom"/);
    assert.match(html, /alt="Cumin"/);
  });

  it("keeps an unsubscribe placeholder and escapes admin text", () => {
    assert.match(html, /href="\{\{unsubscribe\}\}"/);
    const custom = buildVisitWebsiteEmailHtml({
      ...DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT,
      headline: `<img src=x onerror=alert(1)>`,
      message: `A & B "quoted"`,
      ctaText: "Visit Our Website",
      ctaUrl: "https://www.spicycenter.com/",
    });
    assert.match(custom, /Visit Our Website/);
    assert.match(custom, /href="https:\/\/www\.spicycenter\.com\/"/);
    assert.match(custom, /A &amp; B &quot;quoted&quot;/);
    assert.match(custom, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(custom, /<img src=x/);
  });

  it("accepts editable fields and rejects a premium layout with these fields", () => {
    assert.equal(visitWebsiteEmailContentSchema.safeParse(DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT).success, true);
    const created = createSesTemplateSchema.safeParse({
      templateId: "visit-website",
      name: "Visit the website (Editable)",
      subject: "Explore Indian spices at SpicyCenter",
      layout: VISIT_WEBSITE_EMAIL_LAYOUT,
      contentFields: DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT,
    });
    assert.equal(created.success, true);

    const mismatched = createSesTemplateSchema.safeParse({
      name: "Wrong layout",
      subject: "Subject",
      layout: VISIT_WEBSITE_EMAIL_LAYOUT,
      contentFields: DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT,
    });
    assert.equal(mismatched.success, false);

    const premium = createSesTemplateSchema.safeParse({
      name: "Premium spices (Editable)",
      subject: "Indian spices from SpicyCenter",
      layout: PREMIUM_MARKETING_EMAIL_LAYOUT,
      contentFields: DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT,
    });
    assert.equal(premium.success, true);
  });

  it("rebuilds HTML from the visit layout instead of the long premium template", () => {
    const resolved = resolveSesTemplateHtml({
      layout: VISIT_WEBSITE_EMAIL_LAYOUT,
      contentFields: DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT,
      htmlBody: "<p>stale</p>",
    });
    assert.match(resolved, /Explore Our Products/);
    assert.match(resolved, /https:\/\/www\.spicycenter\.com\/spices/);
    assert.doesNotMatch(resolved, /<p>stale<\/p>|Featured Categories/);
  });
});
