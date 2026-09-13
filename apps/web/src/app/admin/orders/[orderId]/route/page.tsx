"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { OrderRouteResponse } from "@spicycorner/shared";
import { useApiClient } from "@/lib/auth-context";

function confidenceClass(c: string) {
  switch (c) {
    case "high":
      return "bg-emerald-100 text-emerald-800";
    case "medium":
      return "bg-amber-100 text-amber-900";
    case "low":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function TouchCard({
  title,
  touch,
}: {
  title: string;
  touch?: {
    source: string;
    medium: string;
    campaign?: string;
    term?: string;
    content?: string;
    referrerDomain?: string;
    landingPage?: string;
    confidence: string;
    confidenceReason?: string;
    clickIds?: Record<string, string>;
    at?: string;
  };
}) {
  if (!touch) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">Not available</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${confidenceClass(touch.confidence)}`}>
          {touch.confidence}
        </span>
      </div>
      <p className="text-lg font-semibold text-primary capitalize">
        {touch.source}
        {touch.medium && touch.medium !== "none" ? (
          <span className="text-slate-500 font-medium text-sm"> · {touch.medium}</span>
        ) : null}
      </p>
      {touch.campaign && <p className="text-sm text-slate-700">Campaign: {touch.campaign}</p>}
      {touch.term && <p className="text-xs text-slate-500">Term: {touch.term}</p>}
      {touch.content && <p className="text-xs text-slate-500">Content: {touch.content}</p>}
      {touch.referrerDomain && <p className="text-xs text-slate-500">Referrer: {touch.referrerDomain}</p>}
      {touch.landingPage && <p className="text-xs text-slate-500 break-all">Landing: {touch.landingPage}</p>}
      {touch.confidenceReason && (
        <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">{touch.confidenceReason}</p>
      )}
      {touch.clickIds && Object.keys(touch.clickIds).length > 0 && (
        <p className="text-[11px] text-slate-400">
          Click IDs: {Object.keys(touch.clickIds).join(", ")} (values redacted in UI)
        </p>
      )}
      {touch.at && (
        <p className="text-[11px] text-slate-400">{new Date(touch.at).toLocaleString()}</p>
      )}
    </div>
  );
}

export default function AdminOrderRoutePage() {
  const params = useParams();
  const orderId = String(params?.orderId ?? "");
  const api = useApiClient();
  const [data, setData] = useState<OrderRouteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const load = useCallback(() => {
    if (!orderId) return;
    setLoading(true);
    setError("");
    api<OrderRouteResponse>(`/admin/orders/${orderId}/route`)
      .then(setData)
      .catch((err) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Could not load order route");
      })
      .finally(() => setLoading(false));
  }, [api, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-slate-500">Loading order route…</div>;
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link
          href="/admin/analytics?tab=order-routes"
          className="text-sm text-nav hover:underline"
        >
          ← Back to order routes
        </Link>
        <p className="mt-4 text-red-600 text-sm">{error || "Order route not found"}</p>
      </div>
    );
  }

  const { summary, attribution, timeline } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Link
            href="/admin/analytics?tab=order-routes"
            className="text-sm text-nav hover:underline"
          >
            ← Back to order routes
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            Order Route · {data.orderNumber ?? data.orderId.slice(0, 8)}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {data.customerName ?? "Customer"}
            {data.customerEmail ? ` · ${data.customerEmail}` : ""}
            {" · "}
            {new Date(data.orderCreatedAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attribution summary</p>
            <p className="text-xl font-bold text-primary mt-1">
              Order #{data.orderNumber ?? data.orderId.slice(0, 8)}
            </p>
          </div>
          <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${confidenceClass(summary.confidence)}`}>
            Confidence: {summary.confidence}
          </span>
        </div>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-400 text-xs">First Touch</dt>
            <dd className="font-semibold text-slate-800 capitalize">{summary.firstTouchLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs">Last Touch</dt>
            <dd className="font-semibold text-slate-800 capitalize">{summary.lastTouchLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs">Conversion</dt>
            <dd className="font-semibold text-slate-800 capitalize">{summary.conversionLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-400 text-xs">Primary campaign</dt>
            <dd className="font-medium text-slate-700">{summary.primaryCampaign || "—"}</dd>
          </div>
        </dl>
        {summary.confidenceReason && (
          <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-3">{summary.confidenceReason}</p>
        )}
      </section>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <TouchCard title="First Touch" touch={attribution.firstTouch} />
        <TouchCard title="Last Touch" touch={attribution.lastTouch} />
        <TouchCard title="Conversion Touch" touch={attribution.conversionTouch} />
      </div>

      {(attribution.assistedTouches?.length ?? 0) > 0 && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Assisted touchpoints</h2>
          <ol className="space-y-2">
            {attribution.assistedTouches!.map((t, i) => (
              <li key={`${t.source}-${i}`} className="text-sm text-slate-700 flex items-center gap-2">
                <span className="text-slate-400 text-xs w-5">{i + 1}.</span>
                <span className="capitalize font-medium">{t.source}</span>
                <span className="text-slate-400">/</span>
                <span>{t.medium}</span>
                {t.campaign ? <span className="text-slate-500">({t.campaign})</span> : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {[
          ["Landing page", summary.landingPage],
          ["Referrer", summary.referrer],
          ["Device", summary.device],
          ["Browser", summary.browser],
          ["OS", summary.os],
          ["Location", summary.location],
          ["Pages viewed", String(summary.pagesViewed)],
          ["Sessions before purchase", summary.sessionsBeforePurchase != null ? String(summary.sessionsBeforePurchase) : "—"],
          ["Days to conversion", summary.daysToConversion != null ? String(summary.daysToConversion) : "—"],
          ["Session ID", data.sessionId],
          ["Visitor ID", data.visitorId],
          ["First visit", attribution.firstVisitAt ? new Date(attribution.firstVisitAt).toLocaleString() : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="font-medium text-slate-800 break-all">{value || "—"}</p>
          </div>
        ))}
      </section>

      {data.eventsNote && (
        <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {data.eventsNote}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Customer journey timeline
          <span className="ml-2 text-xs font-normal text-slate-400">
            {data.eventsAvailable} session event{data.eventsAvailable === 1 ? "" : "s"}
          </span>
        </h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No journey events available for this order.</p>
        ) : (
          <ol className="relative space-y-0">
            {timeline.map((ev, idx) => {
              const open = !!expanded[idx];
              return (
                <li key={`${ev.timestamp}-${idx}`} className="relative pl-6 pb-6 last:pb-0">
                  {idx < timeline.length - 1 && (
                    <span className="absolute left-[7px] top-3 bottom-0 w-px bg-slate-200" aria-hidden />
                  )}
                  <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-nav bg-white" />
                  <button
                    type="button"
                    onClick={() => setExpanded((s) => ({ ...s, [idx]: !open }))}
                    className="w-full text-left"
                  >
                    <p className="text-xs text-slate-400">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : "—"}
                    </p>
                    <p className="font-semibold text-slate-800">{ev.label}</p>
                    {(ev.source || ev.medium) && (
                      <p className="text-xs text-nav capitalize mt-0.5">
                        {[ev.source, ev.medium, ev.campaign].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {ev.pageUrl && (
                      <p className="text-xs text-slate-500 break-all mt-0.5">{ev.pageUrl}</p>
                    )}
                  </button>
                  {open && (
                    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
                      <p>Type: {ev.eventType}</p>
                      {ev.referrer && <p className="break-all">Referrer: {ev.referrer}</p>}
                      {ev.confidence && (
                        <p>
                          Confidence: {ev.confidence}
                          {ev.confidenceReason ? ` — ${ev.confidenceReason}` : ""}
                        </p>
                      )}
                      {ev.productSlug && <p>Product: {ev.productSlug}</p>}
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <details>
                          <summary className="cursor-pointer text-nav">Technical metadata</summary>
                          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px]">
                            {JSON.stringify(ev.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
