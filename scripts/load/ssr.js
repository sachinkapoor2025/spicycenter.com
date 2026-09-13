import http from "k6/http";
import { check, sleep } from "k6";

/** Hits Next.js / Amplify SSR paths (lower VU — doubles API fan-out). */
const WEB = __ENV.WEB_BASE || "http://localhost:3000";
const VUS = Number(__ENV.VUS || 300);
const CATEGORY = __ENV.CATEGORY_SLUG || "single-rakhi";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: VUS },
    { duration: "5m", target: VUS },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<4000"],
  },
};

export default function () {
  let res = http.get(`${WEB}/`);
  check(res, { "home ok": (r) => r.status === 200 });

  res = http.get(`${WEB}/products`);
  check(res, { "products ok": (r) => r.status === 200 });

  res = http.get(`${WEB}/categories/${CATEGORY}`);
  check(res, { "category ok": (r) => r.status === 200 || r.status === 404 });

  sleep(2 + Math.random() * 3);
}
