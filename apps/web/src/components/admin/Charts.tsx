"use client";

import { useState } from "react";

interface BarChartProps {
  data: { label: string; value: number; secondary?: number }[];
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
  showSecondary?: boolean;
}

export function BarChart({
  data,
  primaryColor = "#183a68",
  secondaryColor = "#16a34a",
  height = 160,
  showSecondary = false,
}: BarChartProps) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  const max = Math.max(1, ...data.flatMap((d) => [d.value, d.secondary ?? 0]));

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end group min-w-0">
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: "100%" }}>
              <div
                className="flex-1 rounded-t transition-all opacity-90 group-hover:opacity-100"
                style={{
                  backgroundColor: primaryColor,
                  height: `${(d.value / max) * 100}%`,
                  minHeight: d.value > 0 ? 4 : 0,
                }}
                title={`${d.label}: ${d.value.toLocaleString()}${showSecondary && d.secondary != null ? ` / ${d.secondary} purchases` : ""}`}
              />
              {showSecondary && (
                <div
                  className="flex-1 rounded-t transition-all opacity-90 group-hover:opacity-100"
                  style={{
                    backgroundColor: secondaryColor,
                    height: `${((d.secondary ?? 0) / max) * 100}%`,
                    minHeight: (d.secondary ?? 0) > 0 ? 4 : 0,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 text-[10px] text-slate-400">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center truncate" title={d.label}>
            {i === 0 || i === data.length - 1 || data.length <= 7
              ? d.label.slice(5)
              : i % Math.ceil(data.length / 6) === 0
                ? d.label.slice(5)
                : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

interface HorizontalBarProps {
  items: { label: string; value: number; sub?: string }[];
  color?: string;
  maxItems?: number;
}

export function HorizontalBarChart({
  items,
  color = "#183a68",
  maxItems = 10,
}: HorizontalBarProps) {
  const slice = items.slice(0, maxItems);
  if (!slice.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }
  const max = Math.max(1, ...slice.map((i) => i.value));

  return (
    <div className="space-y-3">
      {slice.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1 gap-2">
            <span className="truncate text-slate-700" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-slate-500">
              {item.value.toLocaleString()}
              {item.sub ? ` · ${item.sub}` : ""}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AreaChartProps {
  data: { label: string; value: number; secondary?: number }[];
  color?: string;
  secondaryColor?: string;
  height?: number;
  showSecondary?: boolean;
  valueLabel?: string;
  secondaryLabel?: string;
}

export function AreaChart({
  data,
  color = "#183a68",
  secondaryColor = "#16a34a",
  height = 140,
  showSecondary = false,
  valueLabel = "Value",
  secondaryLabel = "Orders",
}: AreaChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data.length) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.value, showSecondary ? (d.secondary ?? 0) : 0])
  );
  const width = 100;
  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = height - (d.value / max) * (height - 8);
    return { x, y, d };
  });
  const areaPath = `M0,${height} L${points.map((p) => `${p.x},${p.y}`).join(" L")} L${width},${height} Z`;
  const linePath = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;

  const hovered = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <div className="relative">
      {hovered && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap">
          <div className="font-semibold">{hovered.label}</div>
          <div>
            {valueLabel}: {hovered.value.toLocaleString()}
            {showSecondary && hovered.secondary != null && (
              <> · {secondaryLabel}: {hovered.secondary.toLocaleString()}</>
            )}
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <rect
            key={p.d.label}
            x={i === 0 ? 0 : (points[i - 1]!.x + p.x) / 2}
            y={0}
            width={
              i === 0
                ? data.length === 1
                  ? width
                  : (points[1]!.x + p.x) / 2
                : i === data.length - 1
                  ? width - (points[i - 1]!.x + p.x) / 2
                  : (p.x - points[i - 1]!.x) / 2 + (points[i + 1]!.x - p.x) / 2
            }
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
        {points.map((p, i) => (
          <circle
            key={`dot-${p.d.label}`}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 2.5 : 1.5}
            fill={color}
            className="pointer-events-none"
          />
        ))}
        {showSecondary &&
          data.map((d, i) => {
            const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
            const y = height - ((d.secondary ?? 0) / max) * (height - 8);
            return (
              <circle
                key={`sec-${d.label}`}
                cx={x}
                cy={y}
                r={1.5}
                fill={secondaryColor}
                className="pointer-events-none"
              />
            );
          })}
      </svg>
      <div className="flex gap-1 text-[10px] text-slate-400 mt-1">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center truncate" title={d.label}>
            {i === 0 || i === data.length - 1 || data.length <= 7
              ? d.label.slice(-5)
              : i % Math.ceil(data.length / 6) === 0
                ? d.label.slice(-5)
                : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export type DailyVisitorPoint = {
  day: string;
  visitors: number;
  known: number;
  anonymous: number;
  purchased: number;
  checkoutStarted: number;
  withCart: number;
  events: number;
};

/** Daily unique-visitor trend with a rich hover tooltip (all funnel stats). */
export function DailyVisitorsChart({
  data,
  height = 200,
}: {
  data: DailyVisitorPoint[];
  height?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data.length) {
    return <p className="text-sm text-slate-500">No visitor data for this range yet.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.visitors));
  const width = 100;
  const padTop = 8;
  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = height - (d.visitors / max) * (height - padTop);
    return { x, y, d };
  });
  const areaPath = `M0,${height} L${points.map((p) => `${p.x},${p.y}`).join(" L")} L${width},${height} Z`;
  const linePath = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const purchasePoints = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = height - (d.purchased / max) * (height - padTop);
    return { x, y };
  });
  const purchaseLine = `M${purchasePoints.map((p) => `${p.x},${p.y}`).join(" L")}`;

  const hovered = hoverIdx != null ? data[hoverIdx] : null;
  const conversion =
    hovered && hovered.visitors > 0
      ? ((hovered.purchased / hovered.visitors) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="relative">
      {hovered && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl pointer-events-none min-w-[200px]">
          <div className="font-semibold text-sm mb-1.5 border-b border-white/20 pb-1.5">
            {hovered.day}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="col-span-2 flex justify-between gap-4">
              <dt className="text-slate-300">Visitors</dt>
              <dd className="font-semibold tabular-nums">{hovered.visitors.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-300">Known</dt>
              <dd className="tabular-nums">{hovered.known.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-300">Anonymous</dt>
              <dd className="tabular-nums">{hovered.anonymous.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-300">Purchased</dt>
              <dd className="tabular-nums text-emerald-300">{hovered.purchased.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-300">Checkout</dt>
              <dd className="tabular-nums">{hovered.checkoutStarted.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-300">With cart</dt>
              <dd className="tabular-nums">{hovered.withCart.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-300">Events</dt>
              <dd className="tabular-nums">{hovered.events.toLocaleString()}</dd>
            </div>
            <div className="col-span-2 flex justify-between gap-4 pt-1 border-t border-white/15 mt-0.5">
              <dt className="text-slate-300">Conversion</dt>
              <dd className="font-semibold tabular-nums">{conversion}%</dd>
            </div>
          </dl>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="dailyVisitorsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4876e8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4876e8" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {/* subtle grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={width}
            y1={height * f}
            y2={height * f}
            stroke="#e2e8f0"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={areaPath} fill="url(#dailyVisitorsGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke="#4876e8"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={purchaseLine}
          fill="none"
          stroke="#16a34a"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
          opacity={0.9}
        />
        {points.map((p, i) => (
          <rect
            key={p.d.day}
            x={i === 0 ? 0 : (points[i - 1]!.x + p.x) / 2}
            y={0}
            width={
              i === 0
                ? data.length === 1
                  ? width
                  : (points[1]!.x + p.x) / 2
                : i === data.length - 1
                  ? width - (points[i - 1]!.x + p.x) / 2
                  : (p.x - points[i - 1]!.x) / 2 + (points[i + 1]!.x - p.x) / 2
            }
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
        {points.map((p, i) => (
          <circle
            key={`v-${p.d.day}`}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 3 : 1.75}
            fill="#4876e8"
            stroke="#fff"
            strokeWidth={hoverIdx === i ? 0.8 : 0}
            className="pointer-events-none"
          />
        ))}
        {hoverIdx != null && (
          <line
            x1={points[hoverIdx]!.x}
            x2={points[hoverIdx]!.x}
            y1={0}
            y2={height}
            stroke="#94a3b8"
            strokeWidth="0.5"
            strokeDasharray="2 1"
            vectorEffect="non-scaling-stroke"
            className="pointer-events-none"
          />
        )}
      </svg>

      <div className="flex gap-1 text-[10px] text-slate-400 mt-1">
        {data.map((d, i) => (
          <span key={d.day} className="flex-1 text-center truncate" title={d.day}>
            {i === 0 || i === data.length - 1 || data.length <= 10
              ? d.day.slice(5)
              : i % Math.ceil(data.length / 7) === 0
                ? d.day.slice(5)
                : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function polarXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number
): string {
  const sweep = Math.max(0.01, Math.min(359.999, endDeg - startDeg));
  const large = sweep > 180 ? 1 : 0;
  const o0 = polarXY(cx, cy, outerR, startDeg);
  const o1 = polarXY(cx, cy, outerR, startDeg + sweep);
  const i1 = polarXY(cx, cy, innerR, startDeg + sweep);
  const i0 = polarXY(cx, cy, innerR, startDeg);
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i0.x} ${i0.y}`,
    "Z",
  ].join(" ");
}

const EXPECTED_COLOR = "#183a68";
const RECEIVED_COLOR = "#16a34a";

/** Donut: Received (green) vs remaining Expected (navy). */
export function SettlementExpectedDonut({
  title,
  subtitle,
  expected,
  received,
  currency,
  size = 200,
}: {
  title: string;
  subtitle?: string;
  expected: number;
  received: number;
  currency: "USD" | "INR";
  size?: number;
}) {
  const symbol = currency === "INR" ? "₹" : "$";
  const fmt = (n: number) =>
    `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exp = Math.max(0, expected);
  const rec = Math.max(0, received);
  const remaining = Math.max(0, exp - rec);
  const over = rec > exp + 0.001;
  const denom = over ? rec : Math.max(exp, rec, 0.01);
  const receivedPct = Math.min(100, Math.round((rec / denom) * 100));
  const receivedSweep = over ? 360 : exp > 0 ? (rec / exp) * 360 : rec > 0 ? 360 : 0;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.26;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center">
      <div className="w-full mb-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          {/* Expected / remaining track */}
          {exp <= 0 && rec <= 0 ? (
            <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="#e2e8f0" strokeWidth={outerR - innerR} />
          ) : over ? (
            <path d={donutArc(cx, cy, outerR, innerR, 0, 360)} fill={RECEIVED_COLOR} />
          ) : (
            <>
              {remaining > 0 && (
                <path
                  d={donutArc(cx, cy, outerR, innerR, receivedSweep, 360)}
                  fill={EXPECTED_COLOR}
                />
              )}
              {rec > 0 && (
                <path d={donutArc(cx, cy, outerR, innerR, 0, receivedSweep || 0.01)} fill={RECEIVED_COLOR} />
              )}
              {rec <= 0 && exp > 0 && (
                <path d={donutArc(cx, cy, outerR, innerR, 0, 360)} fill={EXPECTED_COLOR} />
              )}
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-bold text-slate-900">{receivedPct}%</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">received</p>
        </div>
      </div>

      <div className="w-full mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: EXPECTED_COLOR }} />
            Expected
          </span>
          <span className="font-semibold text-slate-900">{fmt(exp)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: RECEIVED_COLOR }} />
            Received
          </span>
          <span className="font-semibold text-emerald-700">{fmt(rec)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
          <span className="text-slate-500">{over ? "Over-settled" : "Pending"}</span>
          <span className={`font-medium ${over ? "text-amber-700" : "text-slate-700"}`}>
            {fmt(over ? rec - exp : remaining)}
          </span>
        </div>
      </div>
    </div>
  );
}
