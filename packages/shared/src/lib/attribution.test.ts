import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyTouchToJourney,
  resolveTrafficSource,
  overallAttributionConfidence,
} from "./attribution";
import { buildOrderRoutePayload, reconstructTouchesFromEvents } from "./order-route";
import type { Order } from "../schemas/order";

describe("resolveTrafficSource", () => {
  it("detects Google Ads via gclid", () => {
    const t = resolveTrafficSource({
      pageUrl: "https://www.spicycenter.com/products/x?gclid=abc123",
      referrer: "",
    });
    assert.equal(t.source, "google");
    assert.equal(t.medium, "cpc");
    assert.equal(t.channel, "paid_search");
    assert.equal(t.confidence, "high");
  });

  it("detects Google organic from referrer", () => {
    const t = resolveTrafficSource({
      pageUrl: "https://www.spicycenter.com/",
      referrer: "https://www.google.com/",
    });
    assert.equal(t.source, "google");
    assert.equal(t.medium, "organic");
    assert.equal(t.confidence, "high");
  });

  it("detects Instagram social", () => {
    const t = resolveTrafficSource({
      pageUrl: "https://www.spicycenter.com/products",
      referrer: "https://l.instagram.com/",
    });
    assert.equal(t.source, "instagram");
    assert.equal(t.medium, "social");
  });

  it("detects Facebook paid via fbclid", () => {
    const t = resolveTrafficSource({
      pageUrl: "/?fbclid=xyz",
      referrer: "https://www.facebook.com/",
    });
    assert.equal(t.source, "facebook");
    assert.equal(t.medium, "paid_social");
    assert.equal(t.confidence, "high");
  });

  it("detects YouTube", () => {
    const t = resolveTrafficSource({
      pageUrl: "/",
      referrer: "https://www.youtube.com/",
    });
    assert.equal(t.source, "youtube");
  });

  it("detects TikTok click id", () => {
    const t = resolveTrafficSource({ pageUrl: "/?ttclid=1", referrer: "" });
    assert.equal(t.source, "tiktok");
    assert.equal(t.confidence, "high");
  });

  it("detects Pinterest", () => {
    const t = resolveTrafficSource({
      pageUrl: "/",
      referrer: "https://www.pinterest.com/pin/1",
    });
    assert.equal(t.source, "pinterest");
  });

  it("detects WhatsApp", () => {
    const t = resolveTrafficSource({
      pageUrl: "/",
      referrer: "https://wa.me/",
    });
    assert.equal(t.source, "whatsapp");
  });

  it("uses UTM over referrer", () => {
    const t = resolveTrafficSource({
      pageUrl: "/?utm_source=newsletter&utm_medium=email&utm_campaign=rakhi2026",
      referrer: "https://www.google.com/",
    });
    assert.equal(t.source, "newsletter");
    assert.equal(t.medium, "email");
    assert.equal(t.campaign, "rakhi2026");
    assert.equal(t.confidence, "high");
  });

  it("labels missing referrer as low-confidence direct", () => {
    const t = resolveTrafficSource({ pageUrl: "/", referrer: "" });
    assert.equal(t.source, "direct");
    assert.equal(t.confidence, "low");
  });

  it("detects referral websites", () => {
    const t = resolveTrafficSource({
      pageUrl: "/",
      referrer: "https://blog.example.com/post",
    });
    assert.equal(t.source, "blog.example.com");
    assert.equal(t.medium, "referral");
    assert.equal(t.confidence, "medium");
  });

  it("does not treat internal referrer as acquisition", () => {
    const t = resolveTrafficSource({
      pageUrl: "/cart",
      referrer: "https://www.spicycenter.com/products",
    });
    assert.equal(t.source, "internal");
  });
});

describe("first-touch preservation", () => {
  it("does not overwrite first touch", () => {
    const first = resolveTrafficSource({
      pageUrl: "/",
      referrer: "https://www.google.com/",
      at: "2026-08-01T10:00:00.000Z",
    });
    const second = resolveTrafficSource({
      pageUrl: "/?utm_source=instagram&utm_medium=social",
      referrer: "https://www.instagram.com/",
      at: "2026-08-03T19:00:00.000Z",
    });
    const journey = applyTouchToJourney({ assisted: [] }, first);
    const next = applyTouchToJourney(
      { first: journey.first, last: journey.last, assisted: journey.assisted },
      second
    );
    assert.equal(next.first.source, "google");
    assert.equal(next.last.source, "instagram");
  });
});

describe("order route rebuild", () => {
  it("rebuilds journey from events for legacy orders", () => {
    const order = {
      orderId: "o1",
      items: [],
      subtotal: 10,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 10,
      currency: "USD",
      status: "paid",
      shippingAddress: {
        name: "A",
        line1: "1",
        city: "X",
        state: "CA",
        postalCode: "90001",
        country: "US",
        phone: "+14085550100",
        email: "a@example.com",
      },
      sessionId: "sess1",
      createdAt: "2026-08-03T19:36:00.000Z",
      updatedAt: "2026-08-03T19:36:00.000Z",
    } as Order;

    const events = [
      {
        type: "page_view",
        path: "/?utm_source=google&utm_medium=organic",
        referrer: "https://www.google.com/",
        createdAt: "2026-08-01T10:32:00.000Z",
      },
      {
        type: "product_view",
        path: "/products/pearl-rakhi",
        productSlug: "pearl-rakhi",
        createdAt: "2026-08-01T10:34:00.000Z",
        referrer: "https://www.spicycenter.com/",
      },
      {
        type: "page_view",
        path: "/products?utm_source=instagram&utm_medium=social",
        referrer: "https://www.instagram.com/",
        createdAt: "2026-08-03T19:21:00.000Z",
      },
      {
        type: "cart_add",
        path: "/products/pearl-rakhi",
        productSlug: "pearl-rakhi",
        createdAt: "2026-08-03T19:30:00.000Z",
      },
      {
        type: "checkout_start",
        path: "/checkout",
        createdAt: "2026-08-03T19:34:00.000Z",
      },
    ];

    const touches = reconstructTouchesFromEvents(events);
    assert.ok(touches.some((t) => t.source === "google" || t.source === "instagram"));

    const route = buildOrderRoutePayload(order, events);
    assert.equal(route.orderId, "o1");
    assert.ok(route.timeline.length >= 5);
    assert.ok(route.summary.firstTouchLabel.toLowerCase().includes("google") || route.attribution.firstTouch);
    assert.ok(["high", "medium", "low", "unknown"].includes(route.summary.confidence));
    assert.equal(overallAttributionConfidence(route.attribution.firstTouch, route.attribution.lastTouch).length > 0, true);
  });
});
