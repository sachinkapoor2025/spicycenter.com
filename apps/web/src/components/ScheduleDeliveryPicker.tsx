"use client";

import { useEffect, useState } from "react";
import { SCHEDULE_DELIVERY_MAX_DATE } from "@spicycorner/shared";
import {
  loadPreferredDeliveryDate,
  preferredDeliveryDateBounds,
  savePreferredDeliveryDate,
} from "@/lib/preferred-delivery";

function formatLong(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Customer-selectable delivery date (max 28 Aug 2026). */
export function ScheduleDeliveryPicker({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [{ min, max }] = useState(() => preferredDeliveryDateBounds());
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(loadPreferredDeliveryDate());
  }, []);

  const onChange = (next: string) => {
    setValue(next);
    savePreferredDeliveryDate(next);
  };

  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 ${className}`}>
      <label htmlFor="schedule-delivery-date" className="block text-sm font-semibold text-primary mb-1">
        Schedule delivery
      </label>
      {!compact && (
        <p className="text-xs text-slate-600 mb-2">
          Choose when you want your order delivered. Latest available date:{" "}
          <strong>{formatLong(SCHEDULE_DELIVERY_MAX_DATE)}</strong>.
        </p>
      )}
      <input
        id="schedule-delivery-date"
        type="date"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-nav"
      />
      {value ? (
        <p className="text-xs text-green-700 mt-2 font-medium">
          Preferred delivery: {formatLong(value)}
        </p>
      ) : (
        <p className="text-xs text-slate-500 mt-2">Optional — you can also set this at checkout.</p>
      )}
    </div>
  );
}
