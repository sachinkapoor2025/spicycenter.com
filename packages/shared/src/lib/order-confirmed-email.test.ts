import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ORDER_STATUS } from "../constants";
import {
  buildOrderConfirmedEmailHtml,
  buildOrderConfirmedEmailText,
  buildOrderConfirmedWhatsAppMessage,
  buildOrderDeliveredEmailHtml,
  buildOrderDeliveredEmailText,
  buildOrderDeliveredWhatsAppMessage,
  customerFirstName,
  customerWhatsAppDeepLink,
  formatOrderMoney,
  isDeliveredNotifyStatus,
  isManualWhatsAppStatus,
  isOrderConfirmedStatus,
  orderConfirmedSubject,
  orderStatusWhatsAppDeepLink,
  plainProductDescription,
  shouldSendOrderConfirmedNotification,
  shouldSendOrderDeliveredNotification,
  type OrderConfirmedNotifyOrder,
} from "./order-confirmed-email";

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const sampleOrder: OrderConfirmedNotifyOrder = {
  orderId: "449cd53d-8a7e-4494-9479-b3c342380828",
  orderNumber: "US10360",
  currency: "USD",
  subtotal: 49.98,
  shipping: 5,
  tax: 2.5,
  discount: 4,
  couponCode: "SPICY10",
  total: 53.48,
  items: [
    {
      name: "LED Pumpkin Lantern",
      quantity: 2,
      price: 24.99,
      description: "Battery-powered lantern for porch displays.",
      image: "https://d2lfdzx32wxe94.cloudfront.net/uploads/2026/03/chilli.jpg",
      productSlug: "led-chilli-lantern",
    },
  ],
  shippingAddress: {
    name: "Priya Yadav",
    email: "priya@example.com",
    phone: "+1 408 555 0100",
  },
};

describe("order-confirmed-email", () => {
  it("maps accepted status to Order Confirmed and only fires on an actual change", () => {
    assert.equal(isOrderConfirmedStatus(ORDER_STATUS.ACCEPTED), true);
    assert.equal(isOrderConfirmedStatus(ORDER_STATUS.PAID), false);
    assert.equal(shouldSendOrderConfirmedNotification("paid", "accepted"), true);
    assert.equal(shouldSendOrderConfirmedNotification("accepted", "accepted"), false);
    assert.equal(shouldSendOrderConfirmedNotification("accepted", "processing"), false);
    assert.equal(shouldSendOrderConfirmedNotification("on_hold", "accepted"), true);
  });

  it("formats money and first name from the order", () => {
    assert.equal(formatOrderMoney(53.48, "USD"), "$53.48");
    assert.match(formatOrderMoney(100, "INR"), /100\.00/);
    assert.equal(customerFirstName(sampleOrder), "Priya");
    assert.equal(orderConfirmedSubject(sampleOrder), "Your Order is Confirmed — US10360 | SpicyCenter");
  });

  it("builds HTML from order data with the reference sections and no emoji", () => {
    const html = buildOrderConfirmedEmailHtml(sampleOrder);
    assert.match(html, /THANK YOU FOR YOUR ORDER!/);
    assert.match(html, /Your Order is Confirmed!/);
    assert.match(html, /Hi Priya,/);
    assert.match(html, /US10360/);
    assert.match(html, /Order details/i);
    assert.match(html, /LED Pumpkin Lantern/);
    assert.match(html, /Battery-powered lantern for porch displays/);
    assert.match(html, /Qty: 2/);
    assert.match(html, /\$49\.98/);
    assert.match(html, /Shipping charges/);
    assert.match(html, /\$5\.00/);
    assert.match(html, /Tax/);
    assert.match(html, /\$2\.50/);
    assert.match(html, /SPICY10/);
    assert.match(html, /-\$4\.00/);
    assert.match(html, /Total amount/);
    assert.match(html, /\$53\.48/);
    assert.match(html, /Thank you for shopping with us/);
    assert.match(html, /100% Secure Payment/);
    assert.match(html, /Quality Spice packs/);
    assert.match(html, /USA Shipping/);
    assert.match(html, /Easy Returns/);
    assert.match(html, /enquiry@spicycenter.com/);
    assert.match(html, /facebook\.com\/people\/Spicycenter\/61594383689623/);
    assert.match(html, /instagram\.com\/spi\.cycenter/);
    assert.match(html, /logo\.png/);
    assert.match(html, /chilli\.thumb\.webp|chilli\.jpg/);
    assert.match(html, /449cd53d-8a7e-4494-9479-b3c342380828/);
    assert.doesNotMatch(html, /We Value Your Feedback/);
    assert.doesNotMatch(html, /\/reviews/);
    assert.equal(EMOJI_RE.test(html), false);
    assert.doesNotMatch(html, /Priya Yadav hardcoded|John Doe|\$99\.00/);
  });

  it("omits the discount row when there is no discount", () => {
    const html = buildOrderConfirmedEmailHtml({
      ...sampleOrder,
      discount: 0,
      couponCode: undefined,
      total: 57.48,
    });
    assert.doesNotMatch(html, /Discount/);
    assert.match(html, /\$57\.48/);
  });

  it("uses the same order data in text and WhatsApp copy", () => {
    const text = buildOrderConfirmedEmailText(sampleOrder);
    const wa = buildOrderConfirmedWhatsAppMessage(sampleOrder);
    for (const body of [text, wa]) {
      assert.match(body, /Priya/);
      assert.match(body, /US10360/);
      assert.match(body, /LED Pumpkin Lantern x 2/);
      assert.match(body, /\$53\.48/);
      assert.match(body, /\$49\.98/);
      assert.match(body, /orders\/449cd53d-8a7e-4494-9479-b3c342380828/);
      assert.equal(EMOJI_RE.test(body), false);
    }
    assert.match(text, /THANK YOU FOR YOUR ORDER!|Your order is confirmed!/i);
    assert.match(wa, /Your SpicyCenter order is confirmed/);
  });

  it("strips HTML from product descriptions", () => {
    assert.equal(
      plainProductDescription("<p>Spooky <strong>porch</strong> lantern</p>"),
      "Spooky porch lantern"
    );
    assert.equal(plainProductDescription("   "), undefined);
  });
});

describe("order-delivered-email", () => {
  it("fires only when status actually changes to delivered or complete", () => {
    assert.equal(isDeliveredNotifyStatus("delivered"), true);
    assert.equal(isDeliveredNotifyStatus("complete"), true);
    assert.equal(isDeliveredNotifyStatus("accepted"), false);
    assert.equal(shouldSendOrderDeliveredNotification("shipped", "delivered"), true);
    assert.equal(shouldSendOrderDeliveredNotification("delivered", "delivered"), false);
    assert.equal(shouldSendOrderDeliveredNotification("delivered", "complete"), true);
    assert.equal(isManualWhatsAppStatus("accepted"), true);
    assert.equal(isManualWhatsAppStatus("processing"), false);
  });

  it("builds delivered HTML with review section, same branding, and no emoji", () => {
    const html = buildOrderDeliveredEmailHtml(sampleOrder, "delivered");
    assert.match(html, /THANK YOU FOR YOUR ORDER!/);
    assert.match(html, /Your Order Has Been Delivered!/);
    assert.match(html, /We Value Your Feedback!/);
    assert.match(html, /Write a Review/);
    assert.match(html, /\/reviews/);
    assert.match(html, /LED Pumpkin Lantern/);
    assert.match(html, /\$53\.48/);
    assert.match(html, /100% Secure Payment/);
    assert.match(html, /logo\.png/);
    assert.match(html, /About SpicyCenter/);
    assert.doesNotMatch(html, /Your Order is Confirmed!/);
    assert.equal(EMOJI_RE.test(html), false);
  });

  it("uses complete heading for complete kind", () => {
    const html = buildOrderDeliveredEmailHtml(sampleOrder, "complete");
    assert.match(html, /Your Order is Complete!/);
    assert.match(html, /We Value Your Feedback!/);
  });

  it("keeps confirmed WhatsApp free of the review section and uses a separate delivered template", () => {
    const confirmed = buildOrderConfirmedWhatsAppMessage(sampleOrder);
    const delivered = buildOrderDeliveredWhatsAppMessage(sampleOrder, "delivered");
    const complete = buildOrderDeliveredWhatsAppMessage(sampleOrder, "complete");
    assert.doesNotMatch(confirmed, /We Value Your Feedback/);
    assert.doesNotMatch(confirmed, /\/reviews/);
    assert.match(delivered, /has been delivered/);
    assert.match(delivered, /We Value Your Feedback!/);
    assert.match(delivered, /\/reviews/);
    assert.match(complete, /is complete/);
    assert.match(complete, /We Value Your Feedback!/);
    for (const body of [confirmed, delivered, complete, buildOrderDeliveredEmailText(sampleOrder)]) {
      assert.match(body, /US10360/);
      assert.match(body, /LED Pumpkin Lantern x 2/);
      assert.match(body, /\$53\.48/);
      assert.equal(EMOJI_RE.test(body), false);
    }
  });

  it("builds a customer wa.me deep link and skips when phone is missing", () => {
    const href = orderStatusWhatsAppDeepLink({ ...sampleOrder, status: "accepted" });
    assert.ok(href);
    assert.match(href!, /^https:\/\/wa\.me\/14085550100\?text=/);
    assert.match(decodeURIComponent(href!), /Your SpicyCenter order is confirmed/);
    const deliveredHref = orderStatusWhatsAppDeepLink({ ...sampleOrder, status: "delivered" });
    assert.match(decodeURIComponent(deliveredHref!), /We Value Your Feedback!/);
    assert.equal(customerWhatsAppDeepLink("", "hello"), null);
    assert.equal(orderStatusWhatsAppDeepLink({ ...sampleOrder, status: "processing" }), null);
    assert.equal(
      orderStatusWhatsAppDeepLink({
        ...sampleOrder,
        status: "accepted",
        shippingAddress: { ...sampleOrder.shippingAddress, phone: undefined },
      }),
      null
    );
  });
});
