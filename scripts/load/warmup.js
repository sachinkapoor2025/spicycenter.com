import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const failRate = new Rate("http_req_failed_custom");
const API = __ENV.API_BASE || "http://localhost:3001";
const CATEGORY = __ENV.CATEGORY_SLUG || "single-rakhi";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 200 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<2500"],
  },
};

function session() {
  return `lt-warm-${__VU}-${__ITER}-${Date.now()}`;
}

export default function () {
  const headers = { "X-Session-Id": session() };

  let res = http.get(`${API}/health`);
  failRate.add(res.status >= 500);
  check(res, { "health 200": (r) => r.status === 200 });

  res = http.get(`${API}/categories`, { headers });
  failRate.add(res.status >= 500);
  check(res, { "categories 200": (r) => r.status === 200 });

  res = http.get(`${API}/products?category=${CATEGORY}`, { headers });
  failRate.add(res.status >= 500);
  check(res, { "products cat 200": (r) => r.status === 200 });

  let slug = __ENV.PRODUCT_SLUG;
  try {
    const products = res.json("products") || [];
    if (products.length) slug = products[Math.floor(Math.random() * Math.min(10, products.length))].slug;
  } catch (_) {}

  if (slug) {
    res = http.get(`${API}/products/${slug}`, { headers });
    failRate.add(res.status >= 500);
    check(res, { "pdp 200": (r) => r.status === 200 });
  }

  sleep(1 + Math.random() * 2);
}
