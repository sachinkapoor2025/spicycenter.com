"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatViewerLocation, type LiveVisitor } from "@spicycorner/shared";
import { referrerLabel } from "@/lib/admin-utils";
import { siteUrl } from "@/lib/env";

function visitorLabel(v: LiveVisitor): string {
  if (v.name) return v.name;
  if (v.email) return v.email;
  if (v.phone) return v.phone;
  return `Visitor ${v.sessionId.slice(0, 8)}…`;
}

function locationOf(v: LiveVisitor): string {
  return formatViewerLocation(
    {
      country: v.country,
      city: v.city,
      region: v.region,
      regionName: v.regionName,
    },
    { timezone: v.timezone, locale: v.locale }
  );
}

function agoLabel(seconds: number): string {
  if (seconds < 15) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  return `${m}m ago`;
}

/** Open the storefront page the visitor is on (keeps query/UTM params). */
function visitorPageHref(path: string): string {
  const raw = (path || "/").trim() || "/";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = siteUrl.replace(/\/$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

function hash01(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

type Props = {
  visitors: LiveVisitor[];
  activeWithinSeconds: number;
  byCountry?: Array<{ country: string; count: number }>;
};

export function LiveVisitorsMap({ visitors, activeWithinSeconds, byCountry = [] }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hover = useMemo(
    () => visitors.find((v) => v.sessionId === hoverId) ?? null,
    [visitors, hoverId]
  );

  const activeCountries = useMemo(() => {
    const set = new Set<string>();
    for (const v of visitors) {
      if (v.country) set.add(v.country.toLowerCase());
    }
    return set;
  }, [visitors]);

  // Load world SVG once
  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    const loadSvg = async (): Promise<string> => {
      const urls = ["/maps/world.svg", "/api/maps/world"];
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          if (!res.ok) continue;
          const text = await res.text();
          if (text.includes("<svg")) return text;
        } catch {
          /* try the next source */
        }
      }
      throw new Error("Map failed to load");
    };

    loadSvg()
      .then((svgText) => {
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svgText;
        const svg = hostRef.current.querySelector("svg");
        if (!svg) throw new Error("Invalid map SVG");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("class", "w-full h-auto max-h-[420px]");
        svg.style.display = "block";

        // Base styling for all countries
        svg.querySelectorAll("path, polygon, polyline").forEach((el) => {
          const node = el as SVGElement;
          if (!node.getAttribute("fill") || node.getAttribute("fill") === "none") {
            node.setAttribute("fill", "#dbeafe");
          }
          node.setAttribute("stroke", "#94a3b8");
          node.setAttribute("stroke-width", "0.4");
          node.style.transition = "fill 0.2s ease";
        });

        setMapReady(true);
        setMapError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setMapError(err instanceof Error ? err.message : "Could not load world map");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Highlight countries + place visitor pins when data/map changes
  useEffect(() => {
    if (!mapReady || !hostRef.current) return;
    const svg = hostRef.current.querySelector("svg");
    if (!svg) return;

    const paintCountry = (id: string, active: boolean) => {
      const el = svg.querySelector(`#${CSS.escape(id)}`);
      if (!el) return;
      const targets =
        el.tagName.toLowerCase() === "g"
          ? Array.from(el.querySelectorAll("path, polygon"))
          : [el];
      for (const node of targets) {
        const n = node as SVGElement;
        if (active) {
          n.setAttribute("fill", "#6ee7b7");
          n.setAttribute("stroke", "#047857");
          n.setAttribute("stroke-width", "0.8");
        } else {
          n.setAttribute("fill", "#dbeafe");
          n.setAttribute("stroke", "#94a3b8");
          n.setAttribute("stroke-width", "0.4");
        }
      }
    };

    // Reset known country shapes, then highlight active ones
    svg.querySelectorAll("[id]").forEach((el) => {
      const id = (el.getAttribute("id") ?? "").toLowerCase();
      if (/^[a-z]{2}$/.test(id) || id.startsWith("_")) paintCountry(id, false);
    });
    activeCountries.forEach((id) => paintCountry(id, true));

    // Remove previous pins
    svg.querySelectorAll("[data-live-pin]").forEach((n) => n.remove());

    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
    overlay.setAttribute("data-live-pin", "layer");

    for (const v of visitors) {
      const cc = (v.country ?? "").toLowerCase();
      const countryEl = cc
        ? (svg.querySelector(`#${CSS.escape(cc)}`) as SVGGraphicsElement | null)
        : null;

      let cx: number;
      let cy: number;
      if (countryEl && typeof countryEl.getBBox === "function") {
        try {
          const box = countryEl.getBBox();
          const jx = (hash01(v.sessionId) - 0.5) * Math.min(box.width, 18);
          const jy = (hash01(v.sessionId + "#") - 0.5) * Math.min(box.height, 18);
          cx = box.x + box.width / 2 + jx;
          cy = box.y + box.height / 2 + jy;
        } catch {
          continue;
        }
      } else {
        // Unknown country — skip pin (still listed in text below)
        continue;
      }

      const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulse.setAttribute("cx", String(cx));
      pulse.setAttribute("cy", String(cy));
      pulse.setAttribute("r", "10");
      pulse.setAttribute("fill", "rgba(16,185,129,0.25)");
      pulse.setAttribute("data-live-pin", "1");
      pulse.style.pointerEvents = "none";

      const pin = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pin.setAttribute("cx", String(cx));
      pin.setAttribute("cy", String(cy));
      pin.setAttribute("r", "5");
      pin.setAttribute("fill", "#059669");
      pin.setAttribute("stroke", "#ffffff");
      pin.setAttribute("stroke-width", "1.5");
      pin.setAttribute("data-live-pin", "1");
      pin.setAttribute("data-session", v.sessionId);
      pin.style.cursor = "pointer";
      pin.addEventListener("mouseenter", () => setHoverId(v.sessionId));
      pin.addEventListener("mouseleave", () => setHoverId(null));

      overlay.appendChild(pulse);
      overlay.appendChild(pin);
    }

    svg.appendChild(overlay);
  }, [mapReady, visitors, activeCountries]);

  // Emphasize hovered pin
  useEffect(() => {
    if (!mapReady || !hostRef.current) return;
    const svg = hostRef.current.querySelector("svg");
    if (!svg) return;
    svg.querySelectorAll("circle[data-session]").forEach((el) => {
      const sid = el.getAttribute("data-session");
      const active = sid === hoverId;
      el.setAttribute("r", active ? "7" : "5");
      el.setAttribute("fill", active ? "#047857" : "#059669");
    });
  }, [hoverId, mapReady, visitors]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            Live on website
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active in the last {Math.round(activeWithinSeconds / 60)} minutes · green countries have
            visitors · hover a pin for details
          </p>
        </div>
        <p className="text-2xl font-bold text-primary tabular-nums">{visitors.length}</p>
      </div>

      {byCountry.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap gap-2">
          {byCountry.map((c) => (
            <span
              key={c.country}
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-900 border border-emerald-100 px-2.5 py-1"
            >
              <span className="uppercase">{c.country}</span>
              <span className="text-emerald-700">{c.count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="relative bg-sky-50">
        {mapError ? (
          <p className="p-8 text-sm text-red-600 text-center">{mapError}</p>
        ) : (
          <div ref={hostRef} className="w-full px-2 py-3 min-h-[220px]" />
        )}

        {hover && (
          <div className="absolute left-3 right-3 bottom-3 sm:left-auto sm:right-4 sm:bottom-4 sm:w-80 rounded-lg border border-slate-200 bg-white/95 shadow-lg p-3 text-sm pointer-events-none z-10">
            <p className="font-semibold text-primary">{visitorLabel(hover)}</p>
            <p className="text-slate-600 mt-0.5">{locationOf(hover)}</p>
            <p className="mt-2">
              <span className="text-slate-500">Viewing: </span>
              <span className="font-medium break-all">{hover.path}</span>
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-slate-600">
              <dt>Device</dt>
              <dd>
                {[hover.deviceType, hover.browser, hover.os].filter(Boolean).join(" · ") || "—"}
              </dd>
              <dt>Referrer</dt>
              <dd className="truncate">{referrerLabel(hover.referrer)}</dd>
              <dt>Active</dt>
              <dd>{agoLabel(hover.secondsAgo)}</dd>
              {hover.email && (
                <>
                  <dt>Email</dt>
                  <dd className="truncate">{hover.email}</dd>
                </>
              )}
              {hover.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>{hover.phone}</dd>
                </>
              )}
              {hover.timezone && (
                <>
                  <dt>Timezone</dt>
                  <dd>{hover.timezone}</dd>
                </>
              )}
            </dl>
          </div>
        )}

        {mapReady && !visitors.length && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 pointer-events-none">
            No active visitors right now
          </p>
        )}
      </div>

      <p className="px-4 py-1.5 text-[10px] text-slate-400 border-t border-slate-50">
        World map: Simple World Map (CC BY-SA 3.0) — countries like US, India, and others shown as
        shapes; pins mark active sessions.
      </p>

      <div className="px-4 py-3 border-t border-slate-100">
        <h4 className="text-sm font-semibold text-slate-800 mb-2">Live visitor details</h4>
        {!visitors.length ? (
          <p className="text-sm text-slate-500">Waiting for storefront activity…</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {visitors.map((v) => (
              <li
                key={v.sessionId}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  hoverId === v.sessionId
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-slate-100 bg-slate-50/50"
                }`}
                onMouseEnter={() => setHoverId(v.sessionId)}
                onMouseLeave={() => setHoverId(null)}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-primary">
                    {visitorLabel(v)}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {v.sessionId.slice(0, 8)}…
                    </span>
                  </p>
                  <span className="text-xs text-emerald-700 font-medium">
                    {agoLabel(v.secondsAgo)}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{locationOf(v)}</p>
                <p className="mt-1">
                  <span className="text-slate-500">Page: </span>
                  <a
                    href={visitorPageHref(v.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium break-all text-nav hover:underline"
                    title="Open this page in a new tab"
                  >
                    {v.path || "/"}
                  </a>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {[v.deviceType, v.browser, v.os].filter(Boolean).join(" · ") || "Device unknown"}
                  {" · "}
                  Ref: {referrerLabel(v.referrer)}
                  {v.email ? ` · ${v.email}` : ""}
                  {v.phone ? ` · ${v.phone}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
