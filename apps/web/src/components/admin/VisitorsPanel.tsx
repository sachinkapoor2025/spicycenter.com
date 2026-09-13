"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatViewerLocation, viewerGeoFromMetadata } from "@spicycorner/shared";
import { useApiClient } from "@/lib/auth-context";
import {
  downloadCsv,
  formatDurationMs,
  paginate,
  referrerLabel,
  sessionDurationMs,
} from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";

interface SessionSummary {
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  lastPath?: string;
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  region?: string;
  regionName?: string;
  timezone?: string;
  locale?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  purchased?: boolean;
  checkoutStarted?: boolean;
  cartAdds?: number;
  hasCart?: boolean;
  cartItems?: number;
  activeDurationMs?: number;
  pages: string[];
  products: string[];
}

interface TimelineEvent {
  type: string;
  path?: string;
  productSlug?: string;
  query?: string;
  resultCount?: number;
  value?: number;
  createdAt?: string;
  at?: string;
  metadata?: Record<string, string>;
}

interface Timeline {
  sessionId: string;
  profile: { name?: string; email?: string; phone?: string } | null;
  leads: { source?: string; name?: string; email?: string; phone?: string; createdAt?: string }[];
  events: TimelineEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "Viewed page",
  product_view: "Viewed product",
  search: "Searched",
  cart_add: "Added to cart",
  cart_remove: "Removed from cart",
  checkout_start: "Started checkout",
  purchase: "Purchased",
  session_ping: "Time on page",
};

const EVENT_COLOR: Record<string, string> = {
  purchase: "bg-green-500",
  checkout_start: "bg-purple-500",
  cart_add: "bg-indigo-500",
  cart_remove: "bg-slate-400",
  search: "bg-amber-500",
  product_view: "bg-blue-500",
  page_view: "bg-slate-300",
};

function describe(e: TimelineEvent): string {
  if (e.type === "search") {
    return `"${e.query}"${e.resultCount === 0 ? " — no results" : ` (${e.resultCount ?? 0} results)`}`;
  }
  if (e.productSlug) return e.productSlug;
  return e.path ?? "";
}

function locationLabel(s: SessionSummary): string {
  return formatViewerLocation(
    {
      country: s.country,
      city: s.city,
      region: s.region,
      regionName: s.regionName,
    },
    { timezone: s.timezone, locale: s.locale }
  );
}

function visitorLabel(s: SessionSummary): string {
  if (s.name) return s.name;
  if (s.email) return s.email;
  if (s.phone) return s.phone;
  return `Visitor ${s.sessionId.slice(0, 8)}…`;
}

function activityBadges(s: SessionSummary): string[] {
  const badges: string[] = [];
  if (s.purchased) badges.push("Purchased");
  else if (s.checkoutStarted) badges.push("Checkout");
  else if (s.hasCart || (s.cartAdds ?? 0) > 0) badges.push("Cart");
  if (s.products.length > 0) badges.push(`${s.products.length} product${s.products.length === 1 ? "" : "s"}`);
  if (s.name || s.email) badges.push("Identified");
  return badges;
}

export function VisitorsPanel() {
  const apiClient = useApiClient();
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState("");
  const [identityTab, setIdentityTab] = useState<"all" | "known" | "anonymous">("all");
  const [identityCounts, setIdentityCounts] = useState({ known: 0, anonymous: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    setPage(1);
    const qs = identityTab === "all" ? "" : `&identity=${identityTab}`;
    apiClient<{
      sessions: SessionSummary[];
      identity?: { known: number; anonymous: number };
    }>(`/admin/sessions?days=${days}${qs}`)
      .then((d) => {
        setSessions(d.sessions);
        if (d.identity) setIdentityCounts(d.identity);
      })
      .catch((err) => {
        setSessions([]);
        setError(err instanceof Error ? err.message : "Could not load sessions");
      })
      .finally(() => setLoading(false));
  }, [apiClient, days, identityTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.sessionId.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const { items: pageItems, totalPages, total } = paginate(filtered, page, pageSize);

  const exportSessions = () => {
    downloadCsv(
      `visitors-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        [
          "Session ID",
          "Name",
          "Email",
          "Phone",
          "Device",
          "Browser",
          "OS",
          "Location",
          "Referrer",
          "First seen",
          "Last activity",
          "Duration",
          "Events",
          "Activity",
          "Purchased",
          "Landing page",
          "Exit page",
        ],
        ...filtered.map((s) => {
          const duration = sessionDurationMs(s);
          return [
            s.sessionId,
            s.name ?? "",
            s.email ?? "",
            s.phone ?? "",
            s.deviceType ?? "",
            s.browser ?? "",
            s.os ?? "",
            locationLabel(s),
            referrerLabel(s.referrer),
            s.firstSeen,
            s.lastSeen,
            formatDurationMs(duration),
            String(s.eventCount),
            activityBadges(s).join(", "),
            s.purchased ? "Yes" : "No",
            s.pages[0] ?? s.lastPath ?? "",
            s.lastPath ?? "",
          ];
        }),
      ]
    );
  };

  const openSession = useCallback(
    (sessionId: string) => {
      setActive(sessionId);
      setTimeline(null);
      setTimelineLoading(true);
      apiClient<Timeline>(`/admin/sessions/${sessionId}`)
        .then(setTimeline)
        .catch(() => setTimeline(null))
        .finally(() => setTimelineLoading(false));
    },
    [apiClient]
  );

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Visitors</h2>
          <p className="text-slate-600 text-sm">
            Session tracking with name/email when shoppers share contact, add to cart, or checkout.
            Click a row for the full journey.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={1}>Today (IST)</option>
          <option value={7}>Last 7 days (IST)</option>
          <option value={14}>Last 14 days (IST)</option>
          <option value={30}>Last 30 days (IST)</option>
          <option value={90}>Last 90 days (IST)</option>
        </select>
      </div>

      <input
        type="search"
        placeholder="Search session, name, email, phone…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="w-full mb-4 border rounded-lg px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "known" as const, label: `Known (${identityCounts.known})` },
            { id: "anonymous" as const, label: `Anonymous (${identityCounts.anonymous})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setIdentityTab(t.id)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              identityTab === t.id
                ? "bg-nav text-white border-nav"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TableControls
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onExport={exportSessions}
      />

      {loading ? (
        <p className="text-slate-500">Loading sessions…</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : pageItems.length === 0 ? (
        <p className="text-slate-600">
          No visitor sessions recorded yet. Once shoppers browse the storefront, sessions will appear here.
        </p>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden border overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="py-3 px-4">Visitor</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Browser / OS</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Referrer</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Last activity</th>
                <th className="py-3 px-4">Events</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4">Converted</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => {
                const duration = sessionDurationMs(s);
                const badges = activityBadges(s);
                return (
                <tr
                  key={s.sessionId}
                  onClick={() => openSession(s.sessionId)}
                  className="border-t hover:bg-blue-50/50 cursor-pointer align-top"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium">{visitorLabel(s)}</div>
                    {(s.name || s.email) && (
                      <div className="text-xs text-slate-500">
                        {s.email ? (
                          <Link
                            href={`/admin/customers/${encodeURIComponent(s.email)}`}
                            className="text-nav hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {s.email}
                          </Link>
                        ) : null}
                        {s.email && s.phone ? " · " : null}
                        {s.phone ?? null}
                      </div>
                    )}
                    <div className="text-xs text-slate-400 font-mono">{s.sessionId.slice(0, 8)}…</div>
                  </td>
                  <td className="py-3 px-4 text-xs capitalize">{s.deviceType ?? "—"}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    <div>{s.browser ?? "—"}</div>
                    <div className="text-slate-400">{s.os ?? ""}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">{locationLabel(s)}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{referrerLabel(s.referrer)}</td>
                  <td className="py-3 px-4 text-xs">{formatDurationMs(duration)}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(s.lastSeen).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">{s.eventCount}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {badges.length === 0 ? (
                        <span className="text-xs text-slate-400">Browse</span>
                      ) : (
                        badges.map((badge) => (
                          <span
                            key={badge}
                            className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                          >
                            {badge}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {s.purchased ? (
                      <span className="text-green-700 font-medium">Yes</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setActive(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Visitor journey</h2>
              <button onClick={() => setActive(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            {timelineLoading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : !timeline ? (
              <p className="text-slate-500 text-sm">Could not load timeline.</p>
            ) : (
              <>
                {timeline.profile && (timeline.profile.name || timeline.profile.email || timeline.profile.phone) && (
                  <div className="mb-4 text-sm bg-slate-50 rounded-lg p-3">
                    {timeline.profile.name && <p className="font-medium">{timeline.profile.name}</p>}
                    {timeline.profile.email && (
                      <p className="text-slate-500">
                        <Link
                          href={`/admin/customers/${encodeURIComponent(timeline.profile.email)}`}
                          className="text-nav hover:underline"
                        >
                          {timeline.profile.email}
                        </Link>
                      </p>
                    )}
                    {timeline.profile.phone && <p className="text-slate-500">{timeline.profile.phone}</p>}
                  </div>
                )}

                {timeline.events[0]?.metadata?.userAgent && (
                  <p className="text-xs text-slate-500 mb-2 break-all">
                    Browser: {timeline.events[0].metadata.userAgent.slice(0, 120)}
                  </p>
                )}

                {timeline.leads.length > 0 && (
                  <div className="mb-4 text-xs bg-amber-50 rounded-lg p-3">
                    <p className="font-medium">Lead captures ({timeline.leads.length})</p>
                    {timeline.leads.map((l, i) => (
                      <p key={i} className="text-slate-600 mt-1">
                        {l.source}: {[l.name, l.email, l.phone].filter(Boolean).join(" · ")}
                      </p>
                    ))}
                  </div>
                )}

                {(timeline.events[0]?.metadata?.country ||
                  timeline.events[0]?.metadata?.city) && (
                  <p className="text-xs text-slate-500 mb-4">
                    Location:{" "}
                    {formatViewerLocation(viewerGeoFromMetadata(timeline.events[0].metadata), {
                      timezone: timeline.events[0].metadata?.timezone,
                      locale: timeline.events[0].metadata?.locale,
                    })}
                    {timeline.events[0].metadata?.timezone
                      ? ` · TZ ${timeline.events[0].metadata.timezone}`
                      : ""}
                  </p>
                )}

                <ol className="relative border-l border-slate-200 ml-2">
                  {timeline.events.map((e, i) => (
                    <li key={i} className="ml-4 pb-4 last:pb-0">
                      <div
                        className={`absolute -left-1.5 w-3 h-3 rounded-full ${
                          EVENT_COLOR[e.type] ?? "bg-slate-300"
                        }`}
                      />
                      <p className="text-sm font-medium">{EVENT_LABELS[e.type] ?? e.type}</p>
                      <p className="text-xs text-slate-500 break-all">
                        {e.type === "product_view" && e.productSlug ? (
                          <Link href={`/products/${e.productSlug}`} className="text-nav hover:underline">
                            {describe(e)}
                          </Link>
                        ) : (
                          describe(e)
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(e.createdAt ?? e.at ?? "").toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>

                {timeline.events.length === 0 && (
                  <p className="text-sm text-slate-500">No events for this session.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
