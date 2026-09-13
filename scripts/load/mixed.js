import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API_BASE || "http://localhost:3001";
const CATEGORY = __ENV.CATEGORY_SLUG || "single-rakhi";
const VUS = Number(__ENV.VUS || 1000);

export const options = {
  stages: [
    { duration: "2m", target: 200 },
    { duration: "3m", target: 500 },
    { duration: "3m", target: VUS },
    { duration: "10m", target: VUS },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
    "http_req_duration{name:checkout}": ["p(95)<3000"],
  },
};

function pickSlug(listRes) {
  if (__ENV.PRODUCT_SLUG) return __ENV.PRODUCT_SLUG;
  try {
    const products = listRes.json("products") || [];
    if (!products.length) return null;
    return products[Math.floor(Math.random() * Math.min(20, products.length))].slug;
  } catch (_) {
    return null;
  }
}

function browse(headers) {
  const res = http.get(`${API}/products?category=${CATEGORY}`, { headers, tags: { name: "browse" } });
  check(res, { "browse 200": (r) => r.status === 200 });
  const slug = pickSlug(res);
  if (slug) {
    const pdp = http.get(`${API}/products/${slug}`, { headers, tags: { name: "pdp" } });
    check(pdp, { "pdp 200": (r) => r.status === 200 });
  }
  // lightweight analytics
  http.post(
    `${API}/events`,
    JSON.stringify({
      events: [
        {
          type: "page_view",
          sessionId: headers["X-Session-Id"],
          path: "/products",
          at: new Date().toISOString(),
        },
      ],
    }),
    { headers: { ...headers, "Content-Type": "application/json" }, tags: { name: "events" } }
  );
  return slug;
}

function cartFlow(headers, slug) {
  if (!slug) return;
  let res = http.post(
    `${API}/cart/items`,
    JSON.stringify({ productSlug: slug, quantity: 1 }),
    { headers: { ...headers, "Content-Type": "application/json" }, tags: { name: "cart_add" } }
  );
  check(res, { "cart add ok": (r) => r.status === 200 || r.status === 201 });

  res = http.get(`${API}/cart`, { headers, tags: { name: "cart_get" } });
  check(res, { "cart get 200": (r) => r.status === 200 });
}

function checkoutStart(headers) {
  const rates = http.get(
    `${API}/shipping/rates?line1=1+Market+St&city=San+Francisco&state=CA&postalCode=94105&country=US`,
    { headers, tags: { name: "shipping_rates" } }
  );
  check(rates, { "rates not 5xx": (r) => r.status < 500 });

  const body = {
    shippingAddress: {
      name: "Load Test",
      line1: "1 Market St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      country: "US",
      phone: "+14085550100",
      email: `loadtest+${__VU}@example.com`,
      senderName: "Load Test Sister",
      senderMessage: "Happy Raksha Bandhan from load test automation.",
    },
    paymentMethod: "stripe",
    checkoutCurrency: "USD",
  };

  const res = http.post(`${API}/checkout`, JSON.stringify(body), {
    headers: { ...headers, "Content-Type": "application/json" },
    tags: { name: "checkout" },
  });
  // empty cart → 400 is OK; under load some VUs may not have items
  check(res, {
    "checkout not 5xx": (r) => r.status < 500,
  });
}

export default function () {
  const headers = { "X-Session-Id": `lt-mix-${__VU}-${__ITER}-${Date.now()}` };
  const roll = Math.random();

  if (roll < 0.7) {
    browse(headers);
    sleep(3 + Math.random() * 5);
    return;
  }

  if (roll < 0.9) {
    const slug = browse(headers);
    cartFlow(headers, slug);
    sleep(3 + Math.random() * 5);
    return;
  }

  // 10% checkout-start path
  const slug = browse(headers);
  cartFlow(headers, slug);
  checkoutStart(headers);
  sleep(2 + Math.random() * 4);
}
