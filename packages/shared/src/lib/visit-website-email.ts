/**
 * Short marketing email: logo, headline, message, real product photos, one CTA.
 * Table layout + inline CSS so Gmail and Outlook keep the design.
 * Admins edit VisitWebsiteEmailContent — not the HTML.
 */

import { z } from "zod";

export const VISIT_WEBSITE_EMAIL_LAYOUT = "visit-website" as const;
export const VISIT_WEBSITE_TEMPLATE_ID = "visit-website";
export const VISIT_WEBSITE_EMAIL_NAME = "Visit the website (Editable)";
export const VISIT_WEBSITE_EMAIL_SUBJECT = "Explore Indian spices at SpicyCenter";

const SITE = "https://www.spicycenter.com";
const CATALOGUE = `${SITE}/spices`;

/** Public footer details already shown on spicycenter.com. */
const FOOTER_ADDRESS = "House No. 392, Mohalla Sodian Wala, Ferozepur City, Punjab 152002, India";
const FOOTER_EMAIL = "contactus@spicycenter.com";

const httpsUrl = (max = 500) =>
  z
    .string()
    .trim()
    .url()
    .max(max)
    .refine((value) => value.startsWith("https://"), "Use an https URL");

export const visitWebsiteEmailProductSchema = z.object({
  name: z.string().trim().min(1).max(80),
  imageUrl: httpsUrl(),
  href: httpsUrl(),
});

export const visitWebsiteEmailContentSchema = z.object({
  preheader: z.string().trim().max(140),
  logoUrl: httpsUrl(),
  logoHref: httpsUrl(),
  logoAlt: z.string().trim().min(1).max(120),
  headline: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(400),
  products: z.array(visitWebsiteEmailProductSchema).min(1).max(3),
  ctaText: z.string().trim().min(1).max(40),
  ctaUrl: httpsUrl(),
  websiteLabel: z.string().trim().min(1).max(80),
  unsubscribeLabel: z.string().trim().min(1).max(40),
});

export type VisitWebsiteEmailProduct = z.infer<typeof visitWebsiteEmailProductSchema>;
export type VisitWebsiteEmailContent = z.infer<typeof visitWebsiteEmailContentSchema>;

export const DEFAULT_VISIT_WEBSITE_EMAIL_CONTENT: VisitWebsiteEmailContent = {
  preheader: "Whole spices, powders, and masalas — browse the SpicyCenter catalogue.",
  logoUrl: `${SITE}/brand-logo.png`,
  logoHref: SITE,
  logoAlt: "SpicyCenter",
  headline: "Authentic Indian spices",
  message:
    "Browse whole spices, powders, chillies, and masalas. Open the catalogue to see pack sizes and send an enquiry.",
  products: [
    {
      name: "Cumin",
      imageUrl: `${SITE}/images/spices/cumin.jpg`,
      href: `${SITE}/spices/cumin`,
    },
    {
      name: "Turmeric",
      imageUrl: `${SITE}/images/spices/turmeric.jpg`,
      href: `${SITE}/spices/turmeric`,
    },
    {
      name: "Green cardamom",
      imageUrl: `${SITE}/images/spices/green-cardamom.jpg`,
      href: `${SITE}/spices/green-cardamom`,
    },
  ],
  ctaText: "Explore Our Products",
  ctaUrl: CATALOGUE,
  websiteLabel: "www.spicycenter.com",
  unsubscribeLabel: "Unsubscribe",
};

export function isVisitWebsiteEmailContent(value: unknown): value is VisitWebsiteEmailContent {
  return visitWebsiteEmailContentSchema.safeParse(value).success;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textBlock(value: string): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br />");
}

function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const width = Math.min(320, Math.max(220, label.trim().length * 11 + 56));
  return `
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:48px;v-text-anchor:middle;width:${width}px;" arcsize="16%" stroke="f" fillcolor="#c45c26">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:bold;">${safeLabel}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:collapse;margin:0 auto;">
                      <tr>
                        <td align="center" bgcolor="#c45c26" style="background-color:#c45c26;border-radius:8px;">
                          <a href="${safeHref}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                            ${safeLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <!--<![endif]-->`;
}

function productCell(product: VisitWebsiteEmailProduct, width: number): string {
  const href = escapeHtml(product.href);
  const image = escapeHtml(product.imageUrl);
  const name = escapeHtml(product.name);
  return `
                  <td class="stack-col" width="${width}" valign="top" style="width:${width}px;padding:0 4px 8px 4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#fffaf4;border:1px solid #eadfce;border-radius:12px;">
                      <tr>
                        <td align="center" style="padding:12px 10px 14px 10px;">
                          <a href="${href}" target="_blank" style="text-decoration:none;">
                            <img class="product-img" src="${image}" width="150" alt="${name}" style="display:block;width:150px;max-width:100%;height:auto;border:0;margin:0 auto;" />
                          </a>
                          <div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:18px;font-weight:bold;color:#2c1810;padding-top:10px;">
                            <a href="${href}" target="_blank" style="color:#2c1810;text-decoration:none;">${name}</a>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>`;
}

function productsRow(products: VisitWebsiteEmailProduct[]): string {
  const items = products.slice(0, 3);
  if (items.length === 0) return "";
  const width = Math.floor(500 / items.length);
  const cells = items.map((product) => productCell(product, width)).join("");
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  ${cells}
                </tr>
              </table>`;
}

/** Full HTML document for the short “visit the website” campaign. */
export function buildVisitWebsiteEmailHtml(content: VisitWebsiteEmailContent): string {
  const headline = escapeHtml(content.headline);
  const preheader = escapeHtml(content.preheader);
  const message = textBlock(content.message);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${headline} | SpicyCenter</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style type="text/css">
    table { border-collapse: collapse; }
    td, div, p, a, span { font-family: Arial, Helvetica, sans-serif; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .stack-col { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; padding-bottom: 12px !important; }
      .product-img { width: 200px !important; max-width: 72% !important; height: auto !important; }
      .mobile-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .headline { font-size: 26px !important; line-height: 32px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3ebe3;width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#f3ebe3;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="border-collapse:collapse;width:600px;max-width:600px;background-color:#ffffff;">

          <tr>
            <td align="center" bgcolor="#2c1810" style="padding:22px 24px 18px 24px;background-color:#2c1810;">
              <a href="${escapeHtml(content.logoHref)}" target="_blank" style="text-decoration:none;">
                <img src="${escapeHtml(content.logoUrl)}" width="200" alt="${escapeHtml(content.logoAlt)}" style="display:block;width:200px;max-width:78%;height:auto;border:0;margin:0 auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td height="4" bgcolor="#c45c26" style="height:4px;line-height:4px;font-size:0;background-color:#c45c26;">&nbsp;</td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" style="padding:32px 28px 8px 28px;background-color:#ffffff;">
              <div class="headline" style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;font-weight:bold;color:#2c1810;margin:0;">
                ${headline}
              </div>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" align="center" style="padding:8px 36px 22px 36px;background-color:#ffffff;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#5c4a3d;margin:0;">
                ${message}
              </div>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" style="padding:4px 18px 8px 18px;background-color:#ffffff;">
              ${productsRow(content.products)}
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" style="padding:18px 24px 36px 24px;background-color:#ffffff;">
              ${ctaButton(content.ctaUrl, content.ctaText)}
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" bgcolor="#2c1810" style="padding:28px 24px 32px 24px;background-color:#2c1810;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#f6efe6;padding-bottom:8px;">
                <a href="${escapeHtml(content.logoHref)}" target="_blank" style="color:#f0d78c;text-decoration:underline;">${escapeHtml(content.websiteLabel)}</a>
              </div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#e4d5c4;padding-bottom:6px;">
                <a href="mailto:${escapeHtml(FOOTER_EMAIL)}" style="color:#f0d78c;text-decoration:underline;">${escapeHtml(FOOTER_EMAIL)}</a>
              </div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#cbbba8;padding-bottom:14px;">
                ${escapeHtml(FOOTER_ADDRESS)}
              </div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#cbbba8;padding-bottom:10px;">
                © ${new Date().getFullYear()} SpicyCenter
              </div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">
                <a href="{{unsubscribe}}" target="_blank" style="color:#f0d78c;text-decoration:underline;">${escapeHtml(content.unsubscribeLabel)}</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
