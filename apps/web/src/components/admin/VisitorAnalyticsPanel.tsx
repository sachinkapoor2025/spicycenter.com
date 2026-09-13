"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatViewerLocation, ADMIN_ANALYTICS_TIMEZONE, businessDayKey } from "@spicycorner/shared";
import { useApiClient } from "@/lib/auth-context";
import {
  downloadCsv,
  formatDurationMs,
  paginate,
  referrerLabel,
  sessionDurationMs,
} from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";
import { CountryPie3D, type CountrySlice } from "@/components/admin/CountryPie3D";
import { ChartLegend, DailyVisitorsChart, type DailyVisitorPoint } from "@/components/admin/Charts";

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

interface VisitorAnalyticsResponse {
  days: number;
  from: string;
  to: string;
  timeZone?: string;
  stats: {
    totalVisitors: number;
    known: number;
    anonymous: number;
    purchased: number;
    checkoutStarted: number;
    withCart: number;
    countries: number;
  };
  /** Unique sessions per IST day (last activity). Additive field — older APIs may omit. */
  byDay?: DailyVisitorPoint[];
  byCountry: CountrySlice[];
  sessions: SessionSummary[];
}

type Preset = "today" | "3d" | "week" | "month" | "custom";

const PRESETS: { id: Preset; label: string; days?: number }[] = [
  { id: "today", label: "Today", days: 1 },
  { id: "3d", label: "3 days", days: 3 },
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "custom", label: "Custom" },
];

function todayIso(): string {
  return businessDayKey(new Date(), ADMIN_ANALYTICS_TIMEZONE);
}

function daysAgoIso(n: number): string {
  const today = todayIso();
  const cursor = new Date(`${today}T12:00:00+05:30`);
  cursor.setTime(cursor.getTime() - (n - 1) * 86_400_000);
  return businessDayKey(cursor, ADMIN_ANALYTICS_TIMEZONE);
}

function visitorLabel(s: SessionSummary): string {
  if (s.name) return s.name;
  if (s.email) return s.email;
  if (s.phone) return s.phone;
  return `Visitor ${s.sessionId.slice(0, 8)}…`;
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

export function VisitorAnalyticsPanel() {
  const apiClient = useApiClient();
  const [preset, setPreset] = useState<Preset>("week");
  const [customFrom, setCustomFrom] = useState(daysAgoIso(7));
  const [customTo, setCustomTo] = useState(todayIso());
  const [appliedCustom, setAppliedCustom] = useState({ from: daysAgoIso(7), to: todayIso() });
  const [data, setData] = useState<VisitorAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const query = useMemo(() => {
    if (preset === "custom") {
      return `from=${encodeURIComponent(appliedCustom.from)}&to=${encodeURIComponent(appliedCustom.to)}`;
    }
    const days = PRESETS.find((p) => p.id === preset)?.days ?? 7;
    return `days=${days}`;
  }, [preset, appliedCustom]);

  useEffect(() => {
    setLoading(true);
    setError("");
    setPage(1);
    apiClient<VisitorAnalyticsResponse>(`/admin/analytics/visitors?${query}`)
      .then(setData)
      .catch((err) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Could not load visitor analytics");
      })
      .finally(() => setLoading(false));
  }, [apiClient, query]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !data) return data?.sessions ?? [];
    return data.sessions.filter((s) => {
      const hay = [
        s.name,
        s.email,
        s.phone,
        s.country,
        s.city,
        s.regionName,
        s.browser,
        s.os,
        s.deviceType,
        s.lastPath,
        s.sessionId,
        referrerLabel(s.referrer),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  const { items: pageItems, totalPages, total } = paginate(filtered, page, pageSize);

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`visitor-analytics-${data.from}_${data.to}.csv`, [
      ["Metric", "Value"],
      ["From", data.from],
      ["To", data.to],
      ["Total visitors", String(data.stats.totalVisitors)],
      ["Known", String(data.stats.known)],
      ["Anonymous", String(data.stats.anonymous)],
      ["Purchased", String(data.stats.purchased)],
      ["Checkout started", String(data.stats.checkoutStarted)],
      ["With cart", String(data.stats.withCart)],
      ["Countries", String(data.stats.countries)],
      [],
      ["Country", "Visitors", "Share %", "Purchased", "Checkout", "Cart", "Identified", "Events"],
      ...data.byCountry.map((c) => [
        c.country,
        String(c.visitors),
        (c.share * 100).toFixed(2),
        String(c.purchased),
        String(c.checkoutStarted),
        String(c.withCart),
        String(c.identified),
        String(c.events),
      ]),
      [],
      [
        "Session",
        "Identity",
        "Country",
        "City",
        "Device",
        "Browser",
        "OS",
        "Referrer",
        "Events",
        "Duration",
        "Last seen",
        "Purchased",
      ],
      ...data.sessions.map((s) => [
        s.sessionId,
        visitorLabel(s),
        s.country ?? "",
        s.city ?? "",
        s.deviceType ?? "",
        s.browser ?? "",
        s.os ?? "",
        referrerLabel(s.referrer),
        String(s.eventCount),
        formatDurationMs(sessionDurationMs(s)),
        s.lastSeen,
        s.purchased ? "yes" : "no",
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Visitor analytics</h2>
          <p className="text-sm text-slate-500">
          Unique sessions in the selected window (IST / Asia/Kolkata), with country mix and full
          visitor list. Same day rules as Admin → Visitors.
        </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                preset === p.id
                  ? "bg-nav text-white border-nav"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
          {data && (
            <button
              type="button"
              onClick={exportCsv}
              className="text-sm border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3 bg-slate-50 border rounded-xl p-4">
          <label className="text-sm">
            <span className="block text-slate-500 mb-1">From</span>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-500 mb-1">To</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayIso()}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5"
            />
          </label>
          <button
            type="button"
            onClick={() => setAppliedCustom({ from: customFrom, to: customTo })}
            className="text-sm bg-nav text-white px-3 py-1.5 rounded-lg"
          >
            Apply
          </button>
          <p className="text-xs text-slate-500 self-center">Max 90 days</p>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading visitors…</p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total visitors", value: data.stats.totalVisitors },
              { label: "Countries", value: data.stats.countries },
              { label: "Identified", value: data.stats.known },
              { label: "Purchased", value: data.stats.purchased },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border rounded-xl p-4">
                <p className="text-xs uppercase text-slate-400">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">
                  {kpi.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Range {data.from} → {data.to} ({data.timeZone ?? ADMIN_ANALYTICS_TIMEZONE}) ·{" "}
            {data.stats.anonymous.toLocaleString()} anonymous ·{" "}
            {data.stats.checkoutStarted.toLocaleString()} checkout ·{" "}
            {data.stats.withCart.toLocaleString()} with cart
          </p>

          {(data.byDay?.length ?? 0) > 0 && (
            <section className="bg-white border rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold">Daily visitors</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unique sessions by last activity day (IST). Sum of daily points matches Total
                    visitors. Hover a point for full stats.
                  </p>
                </div>
                <ChartLegend
                  items={[
                    { color: "#4876e8", label: "Visitors" },
                    { color: "#16a34a", label: "Purchased" },
                  ]}
                />
              </div>
              <DailyVisitorsChart data={data.byDay!} height={220} />
            </section>
          )}

          <section className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-1">Visitors by country</h3>
            <p className="text-xs text-slate-500 mb-4">
              Prefer CDN country; if missing, inferred from timezone/locale (same cues as the
              Location column). Remaining Unknown = no country and no usable timezone hint.
            </p>
            <CountryPie3D data={data.byCountry} />
          </section>

          <section className="bg-white border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold">Visitor list</h3>
                <p className="text-xs text-slate-500">
                  {filtered.length.toLocaleString()} of {data.stats.totalVisitors.toLocaleString()}{" "}
                  visitors
                </p>
              </div>
              <Link href="/admin/visitors" className="text-sm text-nav hover:underline">
                Open full visitors page →
              </Link>
            </div>

            <div className="mb-3">
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, country, device…"
                className="w-full sm:max-w-sm border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
              />
            </div>

            <TableControls
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              onExport={exportCsv}
            />

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b">
                    <th className="py-2 pr-3">Visitor</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Device</th>
                    <th className="py-2 pr-3">Referrer</th>
                    <th className="py-2 pr-3">Events</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No visitors in this range.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((s) => (
                      <tr key={s.sessionId} className="border-b border-slate-100 align-top">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-slate-800">{visitorLabel(s)}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[180px]">
                            {s.lastPath ?? "—"}
                          </div>
                          {(s.purchased || s.checkoutStarted || s.hasCart) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.purchased && (
                                <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                  Purchased
                                </span>
                              )}
                              {s.checkoutStarted && !s.purchased && (
                                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                  Checkout
                                </span>
                              )}
                              {(s.hasCart || (s.cartAdds ?? 0) > 0) && !s.purchased && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                                  Cart
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600">{locationLabel(s)}</td>
                        <td className="py-2.5 pr-3 text-slate-600">
                          {[s.deviceType, s.browser, s.os].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600">{referrerLabel(s.referrer)}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{s.eventCount}</td>
                        <td className="py-2.5 pr-3 tabular-nums">
                          {formatDurationMs(sessionDurationMs(s))}
                        </td>
                        <td className="py-2.5 text-slate-500 whitespace-nowrap">
                          {new Date(s.lastSeen).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
