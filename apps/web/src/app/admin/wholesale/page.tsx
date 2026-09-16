"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient, useAuth } from "@/lib/auth-context";

type Enquiry = {
  enquiryId: string;
  status: string;
  spiceName: string;
  qtyKg: number;
  destination: string;
  createdAt: string;
  contact?: { fullName?: string; email?: string };
  paymentStatus?: string;
};

const STATUSES = ["all", "new", "quoted", "converted", "lost", "paid_addons"] as const;

export default function AdminWholesalePage() {
  const api = useApiClient();
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("all");
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    api<{ enquiries: Enquiry[] }>(`/admin/bulk-enquiries?status=${status}`)
      .then((d) => setRows(d.enquiries ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [api, isAdmin, status]);

  async function setEnquiryStatus(id: string, next: string) {
    await api(`/admin/bulk-enquiries/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    setRows((list) => list.map((r) => (r.enquiryId === id ? { ...r, status: next } : r)));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Wholesale / bulk enquiries</h1>
      <p className="text-sm text-slate-600 mt-2">
        Filter by status.{" "}
        <Link href="/admin/bulk-pricing" className="text-nav">
          Edit bulk pricing
        </Link>
      </p>
      <select className="mt-4 border rounded px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.enquiryId} className="bg-white border rounded-xl p-4 text-sm">
            <p className="font-semibold">
              {r.enquiryId} — {r.spiceName} {r.qtyKg}kg → {r.destination}
            </p>
            <p>
              {r.contact?.fullName} · {r.contact?.email} · {r.paymentStatus ?? "no add-on payment"}
            </p>
            <p className="text-slate-500">{r.createdAt}</p>
            <select
              className="mt-2 border rounded px-2 py-1"
              value={r.status}
              onChange={(e) => void setEnquiryStatus(r.enquiryId, e.target.value)}
            >
              {STATUSES.filter((s) => s !== "all").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </li>
        ))}
        {!rows.length && <p>No enquiries yet.</p>}
      </ul>
    </div>
  );
}
