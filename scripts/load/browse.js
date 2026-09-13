import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API_BASE || "http://localhost:3001";
const CATEGORY = __ENV.CATEGORY_SLUG || "single-rakhi";
const VUS = Number(__ENV.VUS || 1000);

export const options = {
  stages: [
    { duration: "2m", target: Math.min(200, VUS) },
    { duration: "3m", target: Math.min(500, VUS) },
    { duration: "3m", target: VUS },
    { duration: "5m", target: VUS },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const headers = { "X-Session-Id": `lt-browse-${__VU}-${__ITER}` };

  let res = http.get(`${API}/products?category=${CATEGORY}`, { headers });
  check(res, { "list 200": (r) => r.status === 200 });

  let slug = __ENV.PRODUCT_SLUG;
  try {
    const products = res.json("products") || [];
    if (products.length) {
      slug = products[Math.floor(Math.random() * Math.min(20, products.length))].slug;
    }
  } catch (_) {}

  if (slug) {
    res = http.get(`${API}/products/${slug}`, { headers });
    check(res, { "pdp 200": (r) => r.status === 200 });
  }

  // uncategorized list (cached on server after hotspot fix)
  if (Math.random() < 0.3) {
    res = http.get(`${API}/products`, { headers });
    check(res, { "all products 200": (r) => r.status === 200 });
  }

  sleep(2 + Math.random() * 3);
}
