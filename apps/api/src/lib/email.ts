import nodemailer from "nodemailer";
import crypto from "crypto";
import dns from "node:dns/promises";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Order, Product, CartItem } from "@spicycorner/shared";
import type { LeadCaptureInput } from "@spicycorner/shared";
import {
  ORDER_STATUS,
  WELCOME_DISCOUNT_PERCENT,
  LOW_STOCK_ALERT_EMAIL,
  ABANDONED_CART_DISCOUNT_PERCENT,
  ORDER_SMTP_USER,
  DEFAULT_ORDER_NOTIFY_EMAIL,
  staffOrderNotifyEmails,
  isAdminExtremeDiscount,
  buildOrderConfirmedEmailHtml,
  buildOrderConfirmedEmailText,
  buildOrderDeliveredEmailHtml,
  buildOrderDeliveredEmailText,
  isDeliveredNotifyStatus,
  isManualWhatsAppStatus,
  isOrderConfirmedStatus,
  orderConfirmedSubject,
  orderDeliveredSubject,
} from "@spicycorner/shared";
import {
  abandonedCartWhatsAppMessage,
  contactAckWhatsAppMessage,
  notifyCustomerWhatsApp,
  orderPaidWhatsAppMessage,
  orderStatusWhatsAppMessage,
  pendingPaymentWhatsAppMessage,
  reviewRequestWhatsAppMessage,
  welcomeCouponWhatsAppMessage,
} from "./whatsapp";

const DEFAULT_NOTIFY = ORDER_SMTP_USER;
const SITE_NAME = "SpicyCenter";

/** order@ = order notifications; orders@ = reminders / high-volume transactional. */
export type TransactionalMailbox = "order" | "orders";

export type EmailSendResult = {
  ok: boolean;
  error?: string;
  skipped?: boolean;
};

function smtpPassword(): string | undefined {
  return (
    process.env.SMTP_PASS?.trim() ||
    process.env.SMTP_PASSWORD?.trim() ||
    undefined
  );
}

function smtpConfigured(): boolean {
  const user = process.env.SMTP_USER?.trim() || DEFAULT_NOTIFY;
  return Boolean(user && smtpPassword());
}

function smtpUser(_mailbox: TransactionalMailbox = "order"): string {
  return process.env.SMTP_USER?.trim() || DEFAULT_NOTIFY;
}

function fromAddressFor(mailbox: TransactionalMailbox = "order"): string {
  if (mailbox === "orders") {
    return (
      process.env.SMTP_ORDERS_FROM?.trim() ||
      process.env.SMTP_FROM_ORDERS?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      smtpUser("order")
    );
  }
  return process.env.SMTP_FROM?.trim() || smtpUser("order") || notifyAddress();
}

/**
 * Shared-host SMTP presents a Let's Encrypt cert for this hostname only.
 * `mail.spicycenter.com` points at the same IP but is not on the certificate
 * (unlike Halloween Ready, whose cert includes mail.halloweenready.com).
 */
const CANONICAL_SMTP_HOST = "ind01-sh02.sh-thm.com";
const SMTP_FALLBACK_IPV4 = "157.66.191.12";

function isIpv4(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function normalizeSmtpHost(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.$/, "");
  if (
    !h ||
    h === "smtp.spicycenter.com" ||
    h === "mail.spicycenter.com" ||
    h.endsWith(".spicycenter.com.com") ||
    h === SMTP_FALLBACK_IPV4
  ) {
    return CANONICAL_SMTP_HOST;
  }
  return host.trim();
}

function smtpHosts(): string[] {
  const primary = process.env.SMTP_HOST?.trim();
  const extras = (process.env.SMTP_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const all = [...(primary ? [primary] : []), ...extras, CANONICAL_SMTP_HOST, SMTP_FALLBACK_IPV4];
  return [...new Set(all.map(normalizeSmtpHost))];
}

function publicSmtpError(raw: string): string {
  if (/Daily send limit/i.test(raw)) {
    return `${raw} — transactional mailbox (${DEFAULT_NOTIFY}) hit its daily cap (shared hosting). Marketing campaigns must use Mailercloud only; ask the host to raise the limit or wait for daily reset.`;
  }
  if (/getaddrinfo|EBUSY|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|ECONNRESET/i.test(raw)) {
    return "We could not send email just now. Please WhatsApp us or email enquiry@spicycenter.com.";
  }
  return raw;
}

function transportConfigs(
  host: string,
  mailbox: TransactionalMailbox = "order"
): SMTPTransport.Options[] {
  const authUser = smtpUser(mailbox);
  const pass = smtpPassword()!;
  const preferredPort = Number(process.env.SMTP_PORT?.trim() || "587");
  const preferredSecure = process.env.SMTP_SECURE?.trim()
    ? process.env.SMTP_SECURE === "true"
    : preferredPort === 465;

  const configs: SMTPTransport.Options[] = [
    { host, port: preferredPort, secure: preferredSecure, auth: { user: authUser, pass } },
  ];
  if (preferredPort === 465) {
    configs.push({
      host,
      port: 587,
      secure: false,
      auth: { user: authUser, pass },
      requireTLS: true,
    });
  } else if (preferredPort === 587) {
    configs.push({ host, port: 465, secure: true, auth: { user: authUser, pass } });
  }
  return configs;
}

function createTransporter(config: SMTPTransport.Options) {
  const host = String(config.host ?? "");
  return nodemailer.createTransport({
    ...config,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      servername: isIpv4(host) ? CANONICAL_SMTP_HOST : host,
    },
  });
}

/** Public support address shown to customers (single inbox). */
function notifyAddress(): string {
  return DEFAULT_NOTIFY;
}

/** Staff copies of cart / payment / status mail (never includes the customer). */
function adminNotifyAddresses(): string {
  return staffOrderNotifyEmails(process.env.NOTIFY_EMAIL ?? DEFAULT_ORDER_NOTIFY_EMAIL).join(",");
}

export async function sendNewsletterEmails(input: {
  email: string;
  page?: string;
  metadata?: Record<string, string>;
  coupon?: { code: string; expiresAt: string; discountPercent: number };
}): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const coupon = input.coupon ?? {
    code: input.metadata?.couponCode ?? "",
    expiresAt: input.metadata?.couponExpiresAt ?? "",
    discountPercent: Number(input.metadata?.discountPercent ?? WELCOME_DISCOUNT_PERCENT),
  };

  const expiryLabel = coupon.expiresAt
    ? new Date(coupon.expiresAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/New_York",
      })
    : "1 hour";

  const pct = coupon.discountPercent || WELCOME_DISCOUNT_PERCENT;
  const skipCustomer = input.metadata?.alreadyClaimedToday === "true";

  if (skipCustomer) {
    return { ok: true };
  }

  const adminText = [
    "Source: Discount of the Day spin",
    `Email: ${input.email}`,
    input.metadata?.phone ? `Phone: ${input.metadata.phone}` : null,
    coupon.code ? `Coupon: ${coupon.code} (${pct}% off)` : null,
    coupon.expiresAt ? `Expires: ${coupon.expiresAt}` : null,
    input.page ? `Page: ${input.page}` : null,
    input.metadata ? `Details: ${JSON.stringify(input.metadata)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const admin = await sendEmail({
    to: adminNotifyAddresses(),
    subject: `[${SITE_NAME}] Discount of the Day — ${input.email} (${pct}% off)`,
    text: adminText,
    replyTo: input.email,
    mailbox: "orders",
  });
  if (!admin.ok) return admin;

  if (!coupon.code) {
    return { ok: true };
  }

  const customer = await sendEmail({
    to: input.email,
    subject: `Your Discount of the Day: ${pct}% off — ${SITE_NAME}`,
    mailbox: "orders",
    text: `You spun the Discount of the Day wheel at SpicyCenter!

Your exclusive code:

  Coupon code: ${coupon.code}
  Discount: ${pct}% off
  Valid until: ${expiryLabel} (1 hour from spin)

Enter this code at checkout on https://www.spicycenter.com/checkout

One spin per mobile number per day. Shop premium spice products with delivery to all 50 US states:
https://www.spicycenter.com/products

spice season is August 28 — order early for on-time delivery.

— ${SITE_NAME} Team
${notifyAddress()}`,
  });

  const waPhone = input.metadata?.phone?.trim();
  if (waPhone && coupon.code && coupon.expiresAt) {
    await notifyCustomerWhatsApp({
      phone: waPhone,
      context: "welcome-coupon",
      message: welcomeCouponWhatsAppMessage({
        code: coupon.code,
        discountPercent: pct,
        expiresAt: coupon.expiresAt,
      }),
    });
  }

  if (!customer.ok) {
    console.error("Discount of the Day email failed:", customer.error);
    return customer;
  }

  return { ok: true };
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Default order@ for order alerts; mailbox flag is kept for logging only. */
  mailbox?: TransactionalMailbox;
}): Promise<EmailSendResult> {
  const { isLoadTestMode } = await import("./load-test");
  if (isLoadTestMode()) {
    return { ok: true, skipped: true };
  }

  if (!smtpConfigured()) {
    console.warn("Email skipped: SMTP not configured");
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const mailbox = opts.mailbox ?? "order";
  const from = fromAddressFor(mailbox);
  const mail = {
    from: `"${SITE_NAME}" <${from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text.replace(/\n/g, "<br>"),
    replyTo: opts.replyTo,
    headers: {
      "X-Entity-Ref-ID": crypto.randomUUID(),
      "Auto-Submitted": "auto-generated",
    },
  };

  let lastError: unknown;
  for (const host of smtpHosts()) {
    let connectHost = host;
    if (!isIpv4(host)) {
      try {
        const { address } = await dns.lookup(host, { family: 4 });
        connectHost = address;
      } catch (err) {
        lastError = err;
        console.error("SMTP DNS failed", {
          host,
          err: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
    }
    for (const config of transportConfigs(connectHost, mailbox)) {
      try {
        await createTransporter(config).sendMail(mail);
        console.info("sendEmail.ok", { mailbox, from, host, port: config.port, to: opts.to, subject: opts.subject });
        return { ok: true };
      } catch (err) {
        lastError = err;
        console.error("SMTP send failed", {
          host,
          connectHost,
          port: config.port,
          mailbox,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const raw = lastError instanceof Error ? lastError.message : String(lastError ?? "SMTP connection failed");
  const message = publicSmtpError(raw);
  console.error("sendEmail failed:", { mailbox, raw, message });
  return { ok: false, error: message };
}

function formatLeadSource(source?: string): string {
  switch (source) {
    case "contact":
      return "Contact form";
    case "newsletter":
      return "Newsletter / exit offer";
    case "chat":
      return "Chat widget";
    case "review":
      return "Customer review";
    case "checkout":
      return "Checkout";
    case "product":
      return "Product page";
    case "wholesale":
      return "Wholesale quote";
    default:
      return source ?? "Website";
  }
}

export type ContactEmailInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  page?: string;
};

export async function sendContactEmails(input: ContactEmailInput): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const adminText = [
    `Source: Contact form`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    input.page ? `Page: ${input.page}` : null,
    "",
    "Message:",
    input.message,
  ]
    .filter(Boolean)
    .join("\n");

  const admin = await sendEmail({
    to: adminNotifyAddresses(),
    subject: `[${SITE_NAME}] New contact enquiry from ${input.name}`,
    text: adminText,
    replyTo: input.email,
  });

  if (!admin.ok) return admin;

  const customer = await sendEmail({
    to: input.email,
    subject: `We received your message — ${SITE_NAME}`,
    text: `Hi ${input.name},

Thank you for contacting ${SITE_NAME}. We received your message and will reply as soon as possible (usually within 24 hours).

For urgent order help, WhatsApp us or email ${notifyAddress()}.

— ${SITE_NAME} Team
https://www.spicycenter.com`,
  });

  if (input.phone) {
    await notifyCustomerWhatsApp({
      phone: input.phone,
      context: "contact-ack",
      message: contactAckWhatsAppMessage({ name: input.name }),
    });
  }

  if (!customer.ok) {
    console.error("Customer auto-reply failed:", customer.error);
  }

  return { ok: true };
}

export async function sendListSignupEmails(input: {
  email: string;
  page?: string;
  metadata?: Record<string, string>;
}): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const admin = await sendEmail({
    to: adminNotifyAddresses(),
    subject: `[${SITE_NAME}] Newsletter signup — ${input.email}`,
    text: [
      "Source: Newsletter signup",
      `Email: ${input.email}`,
      input.page ? `Page: ${input.page}` : null,
      input.metadata ? `Details: ${JSON.stringify(input.metadata)}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    replyTo: input.email,
  });
  if (!admin.ok) return admin;

  const customer = await sendEmail({
    to: input.email,
    subject: `You're on the list — ${SITE_NAME}`,
    text: `Hi,

Thank you for joining the SpicyCenter list. We'll send spice arrivals, recipes and flavour notes for UK and European kitchens.

— ${SITE_NAME} Team
https://www.spicycenter.com
${notifyAddress()}`,
  });
  if (!customer.ok) {
    console.error("Newsletter signup auto-reply failed:", customer.error);
  }
  return { ok: true };
}

export async function sendWholesaleQuoteEmails(input: {
  name: string;
  email: string;
  phone?: string;
  page?: string;
  metadata?: Record<string, string>;
}): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const metaLines = Object.entries(input.metadata ?? {})
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`);

  const admin = await sendEmail({
    to: adminNotifyAddresses(),
    subject: `[${SITE_NAME}] Wholesale quote from ${input.name || input.email}`,
    text: [
      "Source: Wholesale quote form",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      input.phone ? `Phone: ${input.phone}` : null,
      input.page ? `Page: ${input.page}` : null,
      "",
      ...metaLines,
    ]
      .filter(Boolean)
      .join("\n"),
    replyTo: input.email,
  });
  if (!admin.ok) return admin;

  const customer = await sendEmail({
    to: input.email,
    subject: `We received your wholesale enquiry — ${SITE_NAME}`,
    text: `Hi ${input.name},

Thank you for your wholesale enquiry. We received your details and will reply with a quote. Prices depend on grade, origin, crop, packaging and market.

— ${SITE_NAME} Team
https://www.spicycenter.com
${notifyAddress()}`,
  });
  if (!customer.ok) {
    console.error("Wholesale auto-reply failed:", customer.error);
  }
  return { ok: true };
}

export async function notifyAdminLead(lead: LeadCaptureInput): Promise<EmailSendResult> {
  const message = lead.metadata?.message?.trim();
  const isContact = lead.source === "contact";
  const isReview = lead.source === "review";

  if (isContact && lead.name && lead.email && message) {
    return sendContactEmails({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message,
      page: lead.page,
    });
  }

  if (lead.source === "wholesale" && lead.email) {
    return sendWholesaleQuoteEmails({
      name: lead.name || lead.metadata?.contactName || lead.metadata?.company || "Wholesale enquiry",
      email: lead.email,
      phone: lead.phone,
      page: lead.page,
      metadata: lead.metadata,
    });
  }

  if (lead.source === "newsletter") {
    const coupon =
      lead.metadata?.couponCode && lead.metadata?.couponExpiresAt
        ? {
            code: lead.metadata.couponCode,
            expiresAt: lead.metadata.couponExpiresAt,
            discountPercent: Number(lead.metadata.discountPercent ?? WELCOME_DISCOUNT_PERCENT),
          }
        : undefined;
    if (lead.email && !coupon) {
      return sendListSignupEmails({
        email: lead.email,
        page: lead.page,
        metadata: lead.metadata,
      });
    }
    if (lead.email) {
      return sendNewsletterEmails({
        email: lead.email,
        page: lead.page,
        metadata: {
          ...lead.metadata,
          ...(lead.phone ? { phone: lead.phone } : {}),
        },
        coupon,
      });
    }
    // Phone-only spin — WhatsApp customer + admin email (no customer email).
    const pct = coupon?.discountPercent ?? WELCOME_DISCOUNT_PERCENT;
    const alreadyClaimed = lead.metadata?.alreadyClaimedToday === "true";
    if (!alreadyClaimed && lead.phone && coupon?.code && coupon.expiresAt) {
      await notifyCustomerWhatsApp({
        phone: lead.phone,
        context: "welcome-coupon-phone",
        message: welcomeCouponWhatsAppMessage({
          code: coupon.code,
          discountPercent: pct,
          expiresAt: coupon.expiresAt,
        }),
      });
    }
    if (!smtpConfigured()) return { ok: true, skipped: true };
    return sendEmail({
      to: adminNotifyAddresses(),
      subject: `[${SITE_NAME}] Discount of the Day — phone ${lead.phone ?? "unknown"} (${pct}% off)`,
      text: [
        "Source: Discount of the Day spin (phone only)",
        lead.phone ? `Phone: ${lead.phone}` : null,
        coupon?.code ? `Coupon: ${coupon.code} (${pct}% off)` : null,
        coupon?.expiresAt ? `Expires: ${coupon.expiresAt}` : null,
        lead.page ? `Page: ${lead.page}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured" };
  }

  const isEnquiry = isContact || isReview || Boolean(message);
  if (!isEnquiry) return { ok: true, skipped: true };

  const lines = [
    `Source: ${formatLeadSource(lead.source)}`,
    lead.name ? `Name: ${lead.name}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.page ? `Page: ${lead.page}` : null,
    lead.productSlug ? `Product: ${lead.productSlug}` : null,
    isReview ? "\nReview moderation: Do not publish this review until the owner approves it and the customer gives permission." : null,
    message ? `\nMessage:\n${message}` : null,
    lead.metadata && Object.keys(lead.metadata).length > 0
      ? `\nMetadata: ${JSON.stringify(lead.metadata, null, 2)}`
      : null,
    `\nSession: ${lead.sessionId}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to: adminNotifyAddresses(),
    subject: isReview
      ? `[${SITE_NAME}] Review submitted for approval`
      : `[${SITE_NAME}] New enquiry — ${formatLeadSource(lead.source)}`,
    text: lines,
    replyTo: lead.email,
  });
}

function formatOrderItems(order: Order): string {
  return order.items
    .map((i) => {
      const unit = i.price + (i.addons?.reduce((s, a) => s + a.price * a.quantity, 0) ?? 0);
      const lines = [
        `- ${i.name} × ${i.quantity} — ${order.currency} ${(unit * i.quantity).toFixed(2)}`,
      ];
      for (const a of i.addons ?? []) {
        const qtyLabel = a.quantity > 1 ? `${a.quantity}× ` : "";
        lines.push(
          `    + ${qtyLabel}${a.name} (${order.currency} ${(a.price * a.quantity * i.quantity).toFixed(2)})`
        );
      }
      return lines.join("\n");
    })
    .join("\n");
}

function formatAddress(order: Order): string {
  const a = order.shippingAddress;
  if (!a) return "—";
  return [
    a.name,
    a.line1,
    a.line2,
    `${a.city}, ${a.state} ${a.postalCode}`,
    a.country,
    a.phone ? `Phone: ${a.phone}` : null,
    a.email ? `Email: ${a.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function adminOrderSubject(label: string, order: Order): string {
  return `[${SITE_NAME}] ${label} — ${order.orderId.slice(0, 8)} (${order.currency} ${order.total.toFixed(2)})`;
}

function buildOrderAdminBody(order: Order, headline: string): string {
  return [
    headline,
    "",
    `Order ID: ${order.orderId}`,
    `Total: ${order.currency} ${order.total.toFixed(2)}`,
    `Payment method: ${order.paymentProvider ?? "—"}`,
    `Status: ${order.status}`,
    "",
    "Items:",
    formatOrderItems(order),
    "",
    "Ship to:",
    formatAddress(order),
    "",
    `Placed: ${order.createdAt}`,
  ].join("\n");
}

export async function notifyAdminOrderPlaced(order: Order): Promise<EmailSendResult> {
  const staff = await sendEmail({
    to: adminNotifyAddresses(),
    subject: adminOrderSubject("Order added in cart - payment pending", order),
    text: buildOrderAdminBody(
      order,
      `A customer started checkout on ${SITE_NAME}. Payment is still pending — not a confirmed order yet.`
    ),
    replyTo: order.shippingAddress?.email,
  });
  if (!staff.ok) console.error("Checkout pending staff email failed:", staff.error);

  const customerEmail = order.shippingAddress?.email?.trim();
  let customer: EmailSendResult = { ok: true, skipped: true };
  if (customerEmail?.includes("@")) {
    const name = order.shippingAddress?.name?.split(" ")[0] ?? "there";
    const shortId = order.orderId.slice(0, 8).toUpperCase();
    const total = `${order.currency} ${order.total.toFixed(2)}`;
    customer = await sendEmail({
      to: customerEmail,
      subject: `Complete your SpicyCenter order — #${shortId}`,
      text: `Hi ${name},

We saved your SpicyCenter checkout. Payment is still pending.

Order ID: ${shortId}
Total: ${total}

Complete payment here:
${siteUrl()}/orders/${order.orderId}
${siteUrl()}/checkout

Questions? Reply to this email or WhatsApp us.

— ${SITE_NAME} Team
${siteUrl()}`,
      replyTo: notifyAddress(),
    });
    if (!customer.ok) console.error("Checkout pending customer email failed:", customer.error);
  }

  return { ok: staff.ok || customer.ok };
}

export async function notifyAdminOrderPaid(order: Order): Promise<EmailSendResult> {
  const staff = await sendEmail({
    to: adminNotifyAddresses(),
    subject: adminOrderSubject("New order - paid", order),
    text: buildOrderAdminBody(order, `Payment confirmed — new paid order on ${SITE_NAME}.`),
    replyTo: order.shippingAddress?.email,
  });
  if (!staff.ok) console.error("Paid order staff email failed:", staff.error);

  const customerEmail = order.shippingAddress?.email?.trim();
  const totalLabel = `${order.currency} ${order.total.toFixed(2)}`;
  let customer: EmailSendResult = { ok: true, skipped: true };
  if (customerEmail?.includes("@")) {
    customer = await sendEmail({
      to: customerEmail,
      subject: `Order confirmed — ${SITE_NAME}`,
      text: `Hi${order.shippingAddress?.name ? ` ${order.shippingAddress.name}` : ""},

Thank you for your order! Payment has been received.

Order ID: ${order.orderId}
Total: ${totalLabel}

We deliver to all 50 US states in 5–7 business days after dispatch.

Questions? Reply to this email or WhatsApp us.

— ${SITE_NAME} Team
${siteUrl()}`,
      replyTo: notifyAddress(),
    });
    if (!customer.ok) console.error("Paid order customer email failed:", customer.error);
  }

  await notifyCustomerWhatsApp({
    phone: order.shippingAddress?.phone,
    context: "order-paid",
    message: orderPaidWhatsAppMessage({
      name: order.shippingAddress?.name?.split(" ")[0],
      orderId: order.orderId,
      totalLabel,
    }),
  });

  return { ok: staff.ok || customer.ok };
}

export async function notifyAdminOrderPaymentFailed(order: Order): Promise<EmailSendResult> {
  return sendEmail({
    to: adminNotifyAddresses(),
    subject: adminOrderSubject("New order - payment failed", order),
    text: buildOrderAdminBody(
      order,
      `Checkout on ${SITE_NAME} was cancelled or payment failed. No payment was received.`
    ),
    replyTo: order.shippingAddress?.email,
  });
}

export async function notifyLowStock(product: Product, inventory: number): Promise<EmailSendResult> {
  const soldOut = inventory <= 0;
  const subject = soldOut
    ? `[${SITE_NAME}] SOLD OUT — restock ${product.name}`
    : `[${SITE_NAME}] Low stock (${inventory} left) — ${product.name}`;

  const text = soldOut
    ? `Product sold out on ${SITE_NAME}

Product: ${product.name}
SKU: ${product.sku ?? "—"}
Slug: ${product.slug}
Category: ${product.categorySlug}
Current inventory: 0

Please restock this item in the admin portal (Products → edit stock).

Admin: https://www.spicycenter.com/admin/products`
    : `Low stock alert on ${SITE_NAME}

Product: ${product.name}
SKU: ${product.sku ?? "—"}
Slug: ${product.slug}
Category: ${product.categorySlug}
Current inventory: ${inventory} (threshold: 10 or below)

Please restock this item in the admin portal.

Admin: https://www.spicycenter.com/admin/products`;

  return sendEmail({
    to: LOW_STOCK_ALERT_EMAIL,
    subject,
    text,
  });
}

function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://www.spicycenter.com").replace(/\/$/, "");
}

/** Customer-facing copy for each fulfillment / terminal status step. */
function customerStatusEmailContent(order: Order): { subject: string; body: string; html?: string } | null {
  const name = order.shippingAddress?.name?.split(" ")[0] ?? "there";
  const shortId = order.orderId.slice(0, 8).toUpperCase();
  const total = `${order.currency} ${order.total.toFixed(2)}`;
  const trackingLines = [
    order.carrier ? `Carrier: ${order.carrier}` : null,
    order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : null,
    order.estimatedDeliveryAt
      ? `Estimated delivery: ${new Date(order.estimatedDeliveryAt).toLocaleDateString("en-US", {
          dateStyle: "medium",
          timeZone: "America/New_York",
        })}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const footer = `

View your order: ${siteUrl()}/orders/${order.orderId}

Questions? Reply to this email or WhatsApp us.

— ${SITE_NAME} Team
${siteUrl()}`;

  switch (order.status) {
    case ORDER_STATUS.PAID:
      return {
        subject: `Order confirmed — ${SITE_NAME}`,
        body: `Hi ${name},

Thank you for your order! Payment has been received.

Order ID: ${shortId}
Total: ${total}

We deliver to all 50 US states in 5–7 business days after dispatch.${footer}`,
      };
    case ORDER_STATUS.ACCEPTED: {
      let html: string | undefined;
      try {
        html = buildOrderConfirmedEmailHtml(order);
      } catch (err) {
        console.error("Order confirmed HTML failed; sending text fallback:", err);
      }
      return {
        subject: orderConfirmedSubject(order),
        body: buildOrderConfirmedEmailText(order),
        html,
      };
    }
    case ORDER_STATUS.ON_HOLD:
      return {
        subject: `Order on hold — #${shortId} | ${SITE_NAME}`,
        body: `Hi ${name},

Your order #${shortId} is temporarily on hold while our team reviews it.

Order total: ${total}

No action is needed from you right now. We'll email you as soon as fulfillment resumes or if we need anything.${footer}`,
      };
    case ORDER_STATUS.PROCESSING:
      return {
        subject: `Order packing — #${shortId} | ${SITE_NAME}`,
        body: `Hi ${name},

Your order #${shortId} is now being packed at our warehouse.

Order total: ${total}

You'll receive another update with tracking details once it ships.${footer}`,
      };
    case ORDER_STATUS.SHIPPED:
      return {
        subject: `Order shipped — #${shortId} | ${SITE_NAME}`,
        body: `Hi ${name},

Your spice order #${shortId} is on its way!

${trackingLines || "Tracking details will appear on your order page shortly."}

Order total: ${total}

Typical USA delivery is 5–7 business days after dispatch (faster to many metros).${footer}`,
      };
    case ORDER_STATUS.DELIVERED: {
      let html: string | undefined;
      try {
        html = buildOrderDeliveredEmailHtml(order, "delivered");
      } catch (err) {
        console.error("Order delivered HTML failed; sending text fallback:", err);
      }
      return {
        subject: orderDeliveredSubject(order, "delivered"),
        body: buildOrderDeliveredEmailText(order, "delivered"),
        html,
      };
    }
    case ORDER_STATUS.COMPLETE: {
      let html: string | undefined;
      try {
        html = buildOrderDeliveredEmailHtml(order, "complete");
      } catch (err) {
        console.error("Order complete HTML failed; sending text fallback:", err);
      }
      return {
        subject: orderDeliveredSubject(order, "complete"),
        body: buildOrderDeliveredEmailText(order, "complete"),
        html,
      };
    }
    case ORDER_STATUS.CANCELLED:
      return {
        subject: `Order cancelled — #${shortId} | ${SITE_NAME}`,
        body: `Hi ${name},

Your order #${shortId} has been cancelled.

Order total: ${total}

If you did not request this or have questions about a refund, reply to this email and our team will help.${footer}`,
      };
    case ORDER_STATUS.REFUNDED:
      return {
        subject: `Refund processed — #${shortId} | ${SITE_NAME}`,
        body: `Hi ${name},

A refund has been processed for order #${shortId}.

Order total: ${total}

Depending on your bank or payment method, the credit may take a few business days to appear. Questions? Just reply to this email.${footer}`,
      };
    default:
      return null;
  }
}

/**
 * Daily SMTP reminder while an order is still pending_payment (through 28 Aug 2026).
 * Do NOT use SES — transactional path only.
 */
export async function sendPendingPaymentReminderEmail(order: Order): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured" };
  }

  const customerEmail = order.shippingAddress?.email?.trim();
  if (!customerEmail?.includes("@")) {
    return { ok: false, skipped: true, error: "No customer email" };
  }

  const name = order.shippingAddress?.name?.split(" ")[0] ?? "there";
  const shortId = order.orderId.slice(0, 8).toUpperCase();
  const total = `${order.currency} ${order.total.toFixed(2)}`;
  const count = (order.pendingPaymentReminderCount ?? 0) + 1;
  const orderUrl = `${siteUrl()}/orders/${order.orderId}`;
  const checkoutUrl = `${siteUrl()}/checkout`;
  const unsubUrl = `${siteUrl()}/unsubscribe/payment-reminders?email=${encodeURIComponent(customerEmail)}`;

  const text = `Hi ${name},

This is a friendly reminder — your spice order #${shortId} is still waiting for payment.

Order total: ${total}
Status: Payment pending

Complete payment so we can pack and ship your spice for spice season (August 28):
→ ${orderUrl}
→ ${checkoutUrl}

We'll keep reminding you once a day until payment is completed (last reminder day: August 28, 2026).

Questions? Reply to this email or WhatsApp us.

— ${SITE_NAME} Team
${siteUrl()}
(Reminder #${count})

---
Don't want payment reminders? Unsubscribe here (you will still get order updates if you pay):
${unsubUrl}`;

  const emailResult = await sendEmail({
    to: customerEmail,
    mailbox: "orders",
    subject: `Payment reminder — order #${shortId} | ${SITE_NAME}`,
    text,
    replyTo: notifyAddress(),
  });

  await notifyCustomerWhatsApp({
    phone: order.shippingAddress?.phone,
    context: "pending-payment",
    message: pendingPaymentWhatsAppMessage({
      name,
      orderId: order.orderId,
      totalLabel: total,
    }),
  });

  return emailResult;
}

function statusLabelForAdmin(status: string): string {
  return status.replace(/_/g, " ");
}

/** Internal inbox copy when fulfillment status changes (order@spicycorner + NOTIFY_EMAIL list). */
async function notifyAdminOrderStatusChange(order: Order): Promise<EmailSendResult> {
  const shortId = order.orderId.slice(0, 8).toUpperCase();
  const statusLabel = statusLabelForAdmin(order.status);
  const trackingLines = [
    order.carrier ? `Carrier: ${order.carrier}` : null,
    order.trackingNumber ? `Tracking: ${order.trackingNumber}` : null,
    order.estimatedDeliveryAt
      ? `Estimated delivery: ${new Date(order.estimatedDeliveryAt).toLocaleDateString("en-US", {
          dateStyle: "medium",
          timeZone: "America/New_York",
        })}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const text = [
    `Order status updated to: ${statusLabel}`,
    "",
    `Order ID: ${order.orderId} (#${shortId})`,
    `Total: ${order.currency} ${order.total.toFixed(2)}`,
    `Payment: ${order.paymentProvider ?? "—"}`,
    "",
    "Customer:",
    `  ${order.shippingAddress?.name ?? "—"}`,
    `  ${order.shippingAddress?.email ?? "—"}`,
    `  ${order.shippingAddress?.phone ?? "—"}`,
    "",
    "Items:",
    formatOrderItems(order),
    "",
    "Ship to:",
    formatAddress(order),
    trackingLines ? `\n${trackingLines}` : "",
    "",
    `Admin: ${siteUrl()}/admin/orders/${order.orderId}`,
    `Updated: ${order.updatedAt ?? nowIsoFallback()}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return sendEmail({
    to: adminNotifyAddresses(),
    subject: adminOrderSubject(`Status → ${statusLabel}`, order),
    text,
    replyTo: order.shippingAddress?.email,
  });
}

function nowIsoFallback(): string {
  return new Date().toISOString();
}

/**
 * Transactional emails on order-status change (admin portal or vendor tracking).
 * Sends to the customer AND order@spicycorner / NOTIFY_EMAIL so the team sees updates
 * without opening the admin portal.
 * Uses SMTP via sendEmail() (same path as paid confirmation / review request).
 * Do NOT use SES here — SES is reserved for marketing campaigns (/ses-email/*).
 * Skips pending_payment and unknown statuses. Missing email or WhatsApp skips that
 * channel only — the order-status update still succeeds.
 */
export async function notifyCustomerOrderStatusChange(
  order: Order,
  opts?: { previousNotificationStatus?: string }
): Promise<EmailSendResult> {
  try {
    const content = customerStatusEmailContent(order);
    if (!content) {
      return { ok: true, skipped: true };
    }

    if (opts?.previousNotificationStatus && opts.previousNotificationStatus === order.status) {
      return { ok: true, skipped: true, error: "Already notified for this status" };
    }

    const confirmed = isOrderConfirmedStatus(order.status);
    const delivered = isDeliveredNotifyStatus(order.status);
    const skipAutoWhatsApp = isManualWhatsAppStatus(order.status);

    if (smtpConfigured()) {
      const adminResult = await notifyAdminOrderStatusChange(order);
      if (!adminResult.ok && !adminResult.skipped) {
        console.error("Admin order status email failed:", adminResult.error);
      }
    }

    const customerEmail = order.shippingAddress?.email?.trim();
    let emailResult: EmailSendResult = { ok: true, skipped: true, error: "No customer email" };

    if (!smtpConfigured()) {
      emailResult = { ok: false, skipped: true, error: "SMTP not configured" };
    } else if (customerEmail?.includes("@")) {
      let html = content.html;
      if ((confirmed || delivered) && !html) {
        try {
          html = confirmed
            ? buildOrderConfirmedEmailHtml(order)
            : buildOrderDeliveredEmailHtml(
                order,
                order.status === ORDER_STATUS.COMPLETE ? "complete" : "delivered"
              );
        } catch (err) {
          console.error("Order status HTML failed; sending text fallback:", err);
        }
      }
      emailResult = await sendEmail({
        to: customerEmail,
        subject: content.subject,
        text: content.body,
        html,
        replyTo: notifyAddress(),
      });
    }

    // Confirmed / delivered / complete WhatsApp is owner-initiated via Admin "Send WhatsApp".
    if (!skipAutoWhatsApp) {
      let waMessage: string | null = null;
      try {
        waMessage = orderStatusWhatsAppMessage({
          name: order.shippingAddress?.name?.split(" ")[0],
          orderId: order.orderId,
          status: order.status,
          totalLabel: `${order.currency} ${order.total.toFixed(2)}`,
          carrier: order.carrier,
          trackingNumber: order.trackingNumber,
        });
      } catch (err) {
        console.error("Order status WhatsApp copy failed:", err);
      }

      await notifyCustomerWhatsApp({
        phone: order.shippingAddress?.phone,
        context: `order-status-${order.status}`,
        message: waMessage,
      });
    }

    return emailResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Order status notify failed:", message);
    return { ok: false, error: message };
  }
}

export async function sendReviewRequestEmail(order: Order): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured" };
  }

  const customerEmail = order.shippingAddress?.email?.trim();
  if (!customerEmail?.includes("@")) {
    return { ok: false, skipped: true, error: "No customer email" };
  }

  const name = order.shippingAddress?.name?.split(" ")[0] ?? "there";
  const shortId = order.orderId.slice(0, 8).toUpperCase();
  const reviewUrl = `${siteUrl()}/reviews`;

  const text = `Hi ${name},

We hope your spice order #${shortId} arrived safely and made spice special!

We're SpicyCenter — dedicated to spice and spice traditions — and your feedback helps other shoppers trust us for SpicyCenter delivery.

Would you take 30 seconds to share your experience?
${reviewUrl}

You can mention delivery speed, packaging, or how the recipient liked the spice. We read every review.

Thank you for choosing ${SITE_NAME}.

— Team ${SITE_NAME}
${siteUrl()}
WhatsApp / support: ${notifyAddress()}`;

  const emailResult = await sendEmail({
    to: customerEmail,
    mailbox: "orders",
    subject: `How was your spice delivery? — ${SITE_NAME}`,
    text,
    replyTo: notifyAddress(),
  });

  await notifyCustomerWhatsApp({
    phone: order.shippingAddress?.phone,
    context: "review-request",
    message: reviewRequestWhatsAppMessage({
      name,
      orderId: order.orderId,
    }),
  });

  return emailResult;
}

function formatCartLines(items: CartItem[], currency: string): string {
  if (!items.length) return "  (items in your cart)";
  return items
    .map((i) => `  • ${i.quantity}× ${i.name} — ${i.currency ?? currency} ${(i.price * i.quantity).toFixed(2)}`)
    .join("\n");
}

export async function sendAbandonedCartEmail(input: {
  email: string;
  name: string;
  phone?: string;
  items: CartItem[];
  value: number;
  currency: string;
  couponCode: string;
  expiresAt: string;
  reminder: 1 | 2;
}): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const expiryLabel = input.expiresAt
    ? new Date(input.expiresAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/New_York",
      })
    : "4 hours";

  const cartLines = formatCartLines(input.items, input.currency);
  const totalLabel = `${input.currency} ${input.value.toFixed(2)}`;
  const reminderLine =
    input.reminder === 1
      ? "You left some beautiful spice products in your cart."
      : "Still thinking it over? Your cart is waiting — plus an extra nudge from us.";

  const text = `Hi ${input.name},

${reminderLine}

Your cart (${totalLabel}):
${cartLines}

Complete checkout with ${ABANDONED_CART_DISCOUNT_PERCENT}% off — use code ${input.couponCode} at checkout.
Valid until: ${expiryLabel}

→ https://www.spicycenter.com/cart
→ https://www.spicycenter.com/checkout

spice season is August 28 — order early for on-time USA delivery.

— ${SITE_NAME} Team
${notifyAddress()}`;

  const emailResult = await sendEmail({
    to: input.email,
    mailbox: "orders",
    subject:
      input.reminder === 1
        ? `You left items in your cart — ${ABANDONED_CART_DISCOUNT_PERCENT}% off inside`
        : `Last chance: ${ABANDONED_CART_DISCOUNT_PERCENT}% off your cart (${input.couponCode})`,
    text,
  });

  await notifyCustomerWhatsApp({
    phone: input.phone,
    context: `abandoned-cart-${input.reminder}`,
    message: abandonedCartWhatsAppMessage({
      name: input.name,
      couponCode: input.couponCode,
      discountPercent: ABANDONED_CART_DISCOUNT_PERCENT,
      expiresAt: input.expiresAt || undefined,
      reminder: input.reminder,
    }),
  });

  return emailResult;
}

/** Customer + staff alerts when an admin issues an abandoned-cart or confirmed-sale coupon. */
export async function sendAdminAbandonedCouponEmails(input: {
  customerEmail?: string;
  phone?: string;
  code: string;
  discountPercent: number;
  expiresAt: string;
  hours?: number;
  confirmedSale?: boolean;
  createdByAdminEmail: string;
  whatsappDeepLink?: string;
}): Promise<{ customer: EmailSendResult; notify: EmailSendResult }> {
  const expiryLabel = new Date(input.expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  });
  const hours = input.hours ?? 1;
  const hoursLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  const extreme = isAdminExtremeDiscount(input.discountPercent);
  const saleTag = extreme
    ? "Special offer · "
    : input.confirmedSale
      ? "Confirmed sale · "
      : "";
  const checkoutUrl = `${siteUrl()}/checkout`;
  const bindLines = [
    input.customerEmail ? `Email at checkout: ${input.customerEmail}` : null,
    input.phone ? `Phone at checkout: ${input.phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const customerText = `Hi,

${
  input.confirmedSale || extreme
    ? "Thank you for confirming your SpicyCenter order. Here is your reserved discount:"
    : "Thank you for considering SpicyCenter. We've reserved a personal discount for you:"
}

Coupon code: ${input.code}
Discount: ${input.discountPercent}% off${extreme ? " (Special offer)" : input.confirmedSale ? " (Confirmed sale)" : ""}
Valid for: ${hoursLabel} (until ${expiryLabel} ET)
${bindLines}

Use this code at checkout with the matching email or phone above:
${checkoutUrl}

Questions? Reply to this email or WhatsApp us.

— ${SITE_NAME} Team
${siteUrl()}`;

  // Same inbox list as order/contact alerts — not marketing SMTP.
  // Always include the admin who generated the coupon (especially for extreme discounts).
  const notifyTo = [
    ...adminNotifyAddresses()
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    DEFAULT_NOTIFY.toLowerCase(),
    input.createdByAdminEmail.trim().toLowerCase(),
  ]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(",");

  const waLine = input.whatsappDeepLink
    ? `\nOpen WhatsApp to customer:\n${input.whatsappDeepLink}\n`
    : "";

  const kindLabel = extreme
    ? "EXTREME DISCOUNT"
    : input.confirmedSale
      ? "CONFIRMED SALE"
      : "abandoned-cart";

  const notifyText = `Admin ${kindLabel} coupon generated

Customer email: ${input.customerEmail ?? "(none)"}
Phone: ${input.phone ?? "(none)"}
Coupon: ${input.code}
Discount: ${input.discountPercent}%${extreme ? " (Extreme / special offer)" : input.confirmedSale ? " (Confirmed sale)" : ""}
Expires: ${expiryLabel} ET (${hoursLabel})
Generated by: ${input.createdByAdminEmail}
${waLine}
${input.customerEmail ? "Customer was emailed this coupon." : "No customer email — coupon not emailed to shopper."}

— ${SITE_NAME} Admin`;

  const customer = input.customerEmail
    ? await sendEmail({
        to: input.customerEmail,
        subject: `${saleTag}Your ${input.discountPercent}% SpicyCenter coupon (${input.code}) — valid ${hoursLabel}`,
        text: customerText,
        replyTo: notifyAddress(),
      })
    : { ok: false, error: "No customer email provided" };

  const notifySubjectTarget = input.customerEmail ?? input.phone ?? "customer";
  const notifySubject = extreme
    ? `Extreme discount offered — ${input.discountPercent}% ${input.code} by ${input.createdByAdminEmail} → ${notifySubjectTarget}`
    : `[Coupon]${input.confirmedSale ? " Confirmed sale" : ""} ${input.discountPercent}% ${input.code} → ${notifySubjectTarget}`;
  const notify = await sendEmail({
    to: notifyTo,
    subject: notifySubject,
    text: notifyText,
  });

  return { customer, notify };
}
