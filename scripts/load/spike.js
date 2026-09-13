import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API_BASE || "http://localhost:3001";
const CATEGORY = __ENV.CATEGORY_SLUG || "single-rakhi";

export const options = {
  stages: [
    { duration: "1m", target: 200 },
    { duration: "1m", target: 1000 }, // spike
    { duration: "3m", target: 1000 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  const headers = { "X-Session-Id": `lt-spike-${__VU}-${__ITER}` };
  const res = http.get(`${API}/products?category=${CATEGORY}`, { headers });
  check(res, { "200": (r) => r.status === 200 });
  sleep(0.5 + Math.random());
}
