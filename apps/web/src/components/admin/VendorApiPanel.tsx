"use client";

import { useCallback, useState } from "react";
import { useApiClient } from "@/lib/auth-context";

const PUBLIC_VENDOR_BASE = "https://orange-county.spicycenter.com";

const TRACKING_STATUSES = [
  "processing",
  "packed",
  "shipped",
  "in_transit",
  "dispatched",
  "out_for_delivery",
  "delivered",
  "complete",
] as const;

type ProxyResponse = {
  action: string;
  publicBaseUrl?: string;
  vendorPath?: string;
  statusCode: number;
  body: unknown;
  expectedStatus?: number;
  passed?: boolean;
};

type ResultState = {
  label: string;
  ok: boolean;
  data: ProxyResponse | null;
  error: string;
  at: string;
};

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function VendorApiPanel() {
  const api = useApiClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  const [days, setDays] = useState("15");
  const [limit, setLimit] = useState("50");
  const [cursor, setCursor] = useState("");
  const [status, setStatus] = useState("");
  const [updatedSince, setUpdatedSince] = useState("");

  const [orderId, setOrderId] = useState("");

  const [shipOrderNumber, setShipOrderNumber] = useState("");
  const [courierName, setCourierName] = useState("USPS");
  const [awb, setAwb] = useState("");

  const [trackOrderNumber, setTrackOrderNumber] = useState("");
  const [trackStatus, setTrackStatus] = useState<string>("in_transit");
  const [trackNote, setTrackNote] = useState("");

  const run = useCallback(
    async (label: string, path: string, options: RequestInit = {}) => {
      setBusy(label);
      setResult(null);
      try {
        const data = await api<ProxyResponse>(path, options);
        setResult({
          label,
          ok: true,
          data,
          error: "",
          at: new Date().toISOString(),
        });
        if (data.action === "list-orders" && data.body && typeof data.body === "object") {
          const body = data.body as { nextCursor?: string | null; hasMore?: boolean };
          if (body.nextCursor) setCursor(body.nextCursor);
        }
        if (data.action === "get-order" && data.body && typeof data.body === "object") {
          const order = (data.body as { order?: { orderNumber?: string } }).order;
          if (order?.orderNumber) {
            setShipOrderNumber((prev) => prev || order.orderNumber!);
            setTrackOrderNumber((prev) => prev || order.orderNumber!);
          }
        }
      } catch (err) {
        setResult({
          label,
          ok: false,
          data: null,
          error: err instanceof Error ? err.message : "Request failed",
          at: new Date().toISOString(),
        });
      } finally {
        setBusy(null);
      }
    },
    [api]
  );

  const runList = (useCursor: boolean) => {
    const params = new URLSearchParams();
    if (days.trim()) params.set("days", days.trim());
    if (limit.trim()) params.set("limit", limit.trim());
    if (useCursor && cursor.trim()) params.set("cursor", cursor.trim());
    if (status.trim()) params.set("status", status.trim());
    if (updatedSince.trim()) params.set("updatedSince", updatedSince.trim());
    const qs = params.toString();
    void run(
      useCursor ? "List orders (next page)" : "List / search orders",
      `/admin/vendor-api/orders${qs ? `?${qs}` : ""}`
    );
  };

  const runGet = () => {
    const id = orderId.trim();
    if (!id) {
      setResult({
        label: "Get order",
        ok: false,
        data: null,
        error: "Enter an order number (OC#####) or UUID",
        at: new Date().toISOString(),
      });
      return;
    }
    void run("Get order", `/admin/vendor-api/orders/${encodeURIComponent(id)}`);
  };

  const runShipment = () => {
    const orderNumber = shipOrderNumber.trim();
    const courier = courierName.trim();
    const tracking = awb.trim();
    if (!orderNumber || !courier || !tracking) {
      setResult({
        label: "Post shipment",
        ok: false,
        data: null,
        error: "orderNumber, courierName, and awb are required",
        at: new Date().toISOString(),
      });
      return;
    }
    const confirmed = window.confirm(
      `Post AWB to order ${orderNumber}?\n\nCourier: ${courier}\nAWB: ${tracking}\n\nThis updates a real order.`
    );
    if (!confirmed) return;
    void run("Post shipment", "/admin/vendor-api/shipment", {
      method: "POST",
      body: JSON.stringify({ orderNumber, courierName: courier, awb: tracking }),
    });
  };

  const runTracking = () => {
    const orderNumber = trackOrderNumber.trim();
    if (!orderNumber || !trackStatus.trim()) {
      setResult({
        label: "Post tracking",
        ok: false,
        data: null,
        error: "orderNumber and currentShipmentStatus are required",
        at: new Date().toISOString(),
      });
      return;
    }
    const confirmed = window.confirm(
      `Update tracking for ${orderNumber} to "${trackStatus}"?\n\nThis updates a real order.`
    );
    if (!confirmed) return;
    void run("Post tracking", "/admin/vendor-api/tracking", {
      method: "POST",
      body: JSON.stringify({
        orderNumber,
        currentShipmentStatus: trackStatus.trim(),
        ...(trackNote.trim() ? { note: trackNote.trim() } : {}),
      }),
    });
  };

  const vendorStatus = result?.data?.statusCode;
  const statusTone =
    vendorStatus == null
      ? "text-slate-300"
      : vendorStatus >= 200 && vendorStatus < 300
        ? "text-emerald-300"
        : vendorStatus >= 400 && vendorStatus < 500
          ? "text-amber-300"
          : "text-red-300";

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Vendor API</h2>
        <p className="mt-1 text-sm text-slate-600">
          Exercise Orange County Vendor API steps from Admin. Each action is a separate button.
          Calls go through Cognito-protected admin proxies — the vendor API key stays on the server.
        </p>
        <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          Public vendor base URL (for partners):{" "}
          <code className="font-mono text-nav">{PUBLIC_VENDOR_BASE}</code>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">A — Health</h2>
          <p className="mt-1 text-xs text-slate-500">GET /health</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("Health", "/admin/vendor-api/health")}
            className="mt-3 w-full rounded-lg bg-nav px-3 py-2.5 text-sm font-semibold text-white hover:bg-nav/90 disabled:opacity-50"
          >
            {busy === "Health" ? "Running…" : "Run Health"}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">B — Auth check</h2>
          <p className="mt-1 text-xs text-slate-500">Expect HTTP 401 without API key</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("Auth check", "/admin/vendor-api/auth-check")}
            className="mt-3 w-full rounded-lg bg-nav px-3 py-2.5 text-sm font-semibold text-white hover:bg-nav/90 disabled:opacity-50"
          >
            {busy === "Auth check" ? "Running…" : "Run Auth check"}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">C — List / search orders</h2>
          <p className="mt-1 text-xs text-slate-500">
            GET /vendors/orange-county/orders — default last 15 days, <strong>paid only</strong>
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs text-slate-600">
              days
              <input
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              limit
              <input
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              status (optional)
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="paid"
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600 sm:col-span-2 lg:col-span-2">
              updatedSince (optional ISO)
              <input
                value={updatedSince}
                onChange={(e) => setUpdatedSince(e.target.value)}
                placeholder="2026-08-01T00:00:00.000Z"
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600 sm:col-span-2 lg:col-span-5">
              cursor (filled from last list response)
              <input
                value={cursor}
                onChange={(e) => setCursor(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-xs"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => runList(false)}
              className="rounded-lg bg-nav px-3 py-2.5 text-sm font-semibold text-white hover:bg-nav/90 disabled:opacity-50"
            >
              {busy === "List / search orders" ? "Running…" : "Run List / search"}
            </button>
            <button
              type="button"
              disabled={busy !== null || !cursor.trim()}
              onClick={() => runList(true)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "List orders (next page)" ? "Running…" : "Load next page"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">D — Get one order</h2>
          <p className="mt-1 text-xs text-slate-500">
            GET /vendors/orange-county/orders/{"{orderNumber|uuid}"}
          </p>
          <label className="mt-3 block text-xs text-slate-600">
            orderNumber or UUID
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="OC10011"
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy !== null}
            onClick={runGet}
            className="mt-3 rounded-lg bg-nav px-3 py-2.5 text-sm font-semibold text-white hover:bg-nav/90 disabled:opacity-50"
          >
            {busy === "Get order" ? "Running…" : "Run Get order"}
          </button>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">E — Post shipment (AWB)</h2>
          <p className="mt-1 text-xs text-amber-800">
            Live mutation — confirms before updating a real order.
          </p>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-slate-600">
              orderNumber
              <input
                value={shipOrderNumber}
                onChange={(e) => setShipOrderNumber(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="block text-xs text-slate-600">
              courierName
              <input
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-600">
              awb
              <input
                value={awb}
                onChange={(e) => setAwb(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={runShipment}
            className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {busy === "Post shipment" ? "Running…" : "Run Post shipment"}
          </button>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">F — Post tracking status</h2>
          <p className="mt-1 text-xs text-amber-800">
            Live mutation — confirms before updating a real order.
          </p>
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-slate-600">
              orderNumber
              <input
                value={trackOrderNumber}
                onChange={(e) => setTrackOrderNumber(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="block text-xs text-slate-600">
              currentShipmentStatus
              <select
                value={trackStatus}
                onChange={(e) => setTrackStatus(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                {TRACKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-600">
              note (optional)
              <input
                value={trackNote}
                onChange={(e) => setTrackNote(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={runTracking}
            className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {busy === "Post tracking" ? "Running…" : "Run Post tracking"}
          </button>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Response</h2>
          {result && (
            <span className="text-xs text-slate-400">
              {result.label} · {result.at}
            </span>
          )}
        </div>
        {!result && (
          <p className="mt-3 text-sm text-slate-400">Run any step above to see status + JSON here.</p>
        )}
        {result?.error && (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {result.error}
          </p>
        )}
        {result?.data && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-3 text-xs">
              <span>
                Vendor HTTP:{" "}
                <strong className={statusTone}>{result.data.statusCode}</strong>
              </span>
              {result.data.vendorPath && (
                <span className="font-mono text-slate-300 break-all">{result.data.vendorPath}</span>
              )}
              {typeof result.data.passed === "boolean" && (
                <span className={result.data.passed ? "text-emerald-300" : "text-red-300"}>
                  auth-check {result.data.passed ? "PASSED" : "FAILED"}
                </span>
              )}
            </div>
            <pre className="max-h-[480px] overflow-auto rounded-lg bg-black/40 p-3 text-xs leading-relaxed text-emerald-100">
              {pretty(result.data)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
