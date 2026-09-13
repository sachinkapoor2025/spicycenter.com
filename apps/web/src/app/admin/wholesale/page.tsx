"use client";

import { useEffect, useState } from "react";

export default function AdminWholesalePage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  useEffect(() => {
    const raw = localStorage.getItem("spicycorner-wholesale-quotes");
    setRows(raw ? JSON.parse(raw) : []);
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Wholesale quotes</h1>
      <p className="text-sm text-slate-600 mt-2">Inquiries currently stored in this browser until the API table is wired.</p>
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="bg-white border rounded-xl p-4 text-sm">
            <p className="font-semibold">{r.id} — {r.company}</p>
            <p>{r.product} · {r.quantity} · {r.country}</p>
            <p>{r.email} · {r.phone}</p>
          </li>
        ))}
        {!rows.length && <p>No local quotes yet.</p>}
      </ul>
    </div>
  );
}
