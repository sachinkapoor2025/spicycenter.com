#!/usr/bin/env node
/**
 * Shared k6 helpers for SpicyCorner load tests.
 * Usage: import from other scripts via open() or duplicate small helpers
 * (k6 prefers self-contained scripts — see mixed.js for the main suite).
 */

export const THRESHOLDS = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<2000"],
  checks: ["rate>0.99"],
};

export function apiBase() {
  return __ENV.API_BASE || "http://localhost:3001";
}

export function webBase() {
  return __ENV.WEB_BASE || "http://localhost:3000";
}

export function sessionId(vu, iter) {
  return `loadtest-vu${vu}-i${iter}-${Date.now()}`;
}

export function jsonHeaders(session) {
  return {
    "Content-Type": "application/json",
    "X-Session-Id": session,
  };
}
