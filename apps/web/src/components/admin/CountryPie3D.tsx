"use client";

import { useMemo, useState } from "react";

export interface CountrySlice {
  country: string;
  visitors: number;
  purchased: number;
  checkoutStarted: number;
  withCart: number;
  identified: number;
  events: number;
  share: number;
  devices?: Record<string, number>;
}

const COLORS = [
  "#183a68",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#7c3aed",
  "#0369a1",
  "#15803d",
  "#c2410c",
  "#a21caf",
  "#475569",
];

function countryLabel(code: string): string {
  if (!code || code === "UNKNOWN") return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function topDevice(devices?: Record<string, number>): string {
  if (!devices) return "—";
  const entries = Object.entries(devices).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "—";
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number
): string {
  const sweep = Math.max(0.01, endDeg - startDeg);
  const large = sweep > 180 ? 1 : 0;
  const o0 = polar(cx, cy, outerR, startDeg);
  const o1 = polar(cx, cy, outerR, startDeg + sweep);
  const i1 = polar(cx, cy, innerR, startDeg + sweep);
  const i0 = polar(cx, cy, innerR, startDeg);
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i0.x} ${i0.y}`,
    "Z",
  ].join(" ");
}

interface Props {
  data: CountrySlice[];
  size?: number;
}

export function CountryPie3D({ data, size = 220 }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const slices = useMemo(() => {
    if (!data.length) return [];
    const total = data.reduce((sum, d) => sum + d.visitors, 0) || 1;
    let cursor = 0;
    return data.map((d, i) => {
      const start = cursor;
      const sweep = (d.visitors / total) * 360;
      cursor += sweep;
      return {
        ...d,
        color: COLORS[i % COLORS.length]!,
        start,
        end: cursor,
        label: countryLabel(d.country),
      };
    });
  }, [data]);

  if (!slices.length) {
    return <p className="text-sm text-slate-500">No visitor country data yet.</p>;
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.58;
  const active = hover != null ? slices[hover] : null;
  const totalVisitors = data.reduce((sum, d) => sum + d.visitors, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6 md:gap-8 items-start">
      <div className="relative mx-auto w-full max-w-[220px] shrink-0">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          height="auto"
          className="block overflow-visible"
          role="img"
          aria-label="Visitors by country"
          onMouseLeave={() => setHover(null)}
        >
          {slices.map((s, i) => {
            const path =
              s.end - s.start >= 359.9
                ? [
                    `M ${cx} ${cy - outerR}`,
                    `A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR}`,
                    `L ${cx - 0.01} ${cy - innerR}`,
                    `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
                    "Z",
                  ].join(" ")
                : donutPath(cx, cy, outerR, innerR, s.start, s.end);
            return (
              <path
                key={s.country}
                d={path}
                fill={s.color}
                opacity={hover == null || hover === i ? 1 : 0.35}
                stroke="#fff"
                strokeWidth={1.5}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHover(i)}
              >
                <title>
                  {s.label}: {s.visitors.toLocaleString()} visitors (
                  {(s.share * 100).toFixed(1)}%)
                </title>
              </path>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center px-2">
            {active ? (
              <>
                <p className="text-xs text-slate-500 truncate max-w-[96px]">{active.label}</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 leading-tight">
                  {active.visitors.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500">{(active.share * 100).toFixed(1)}%</p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-bold tabular-nums text-slate-900 leading-tight">
                  {totalVisitors.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500">visitors</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 w-full">
        {active && (
          <div className="mb-3 rounded-lg bg-slate-900 text-white text-xs px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
            <p className="col-span-2 font-semibold text-sm mb-0.5">{active.label}</p>
            <p>Visitors: {active.visitors.toLocaleString()}</p>
            <p>Share: {(active.share * 100).toFixed(1)}%</p>
            <p>Purchased: {active.purchased}</p>
            <p>Checkout: {active.checkoutStarted}</p>
            <p>With cart: {active.withCart}</p>
            <p>Identified: {active.identified}</p>
            <p>Events: {active.events.toLocaleString()}</p>
            <p>Top device: {topDevice(active.devices)}</p>
          </div>
        )}

        <ul className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {slices.map((s, i) => (
            <li key={s.country}>
              <button
                type="button"
                className={`w-full flex items-center gap-3 text-left rounded-lg px-2 py-1.5 text-sm transition-colors ${
                  hover === i ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 truncate text-slate-700">{s.label}</span>
                <span className="tabular-nums text-slate-500 shrink-0">
                  {s.visitors.toLocaleString()} · {(s.share * 100).toFixed(0)}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
