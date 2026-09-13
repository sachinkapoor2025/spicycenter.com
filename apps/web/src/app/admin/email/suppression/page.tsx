"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";

export default function SuppressionPage() {
  const api = useApiClient();
  const [items, setItems] = useState<{ email: string; reason: string; createdAt: string }[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await api<{ items: typeof items }>("/ses-email/suppression");
    setItems(res.items);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    await api("/ses-email/suppression", {
      method: "POST",
      body: JSON.stringify({ email, reason: "manual" }),
    });
    setEmail("");
    setMessage("Added to suppression list.");
    await load();
  };

  const remove = async (e: string) => {
    await api(`/ses-email/suppression/${encodeURIComponent(e)}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Suppression List</h1>
      <p className="text-sm text-slate-500">
        Hard bounces, spam complaints, unsubscribes, and manual exclusions are never emailed. The hourly
        bounce-sync Lambda and Mailercloud webhook add hard bounces here automatically — imports show
        e.g. “100 imported, 4 bounced skipped”.
      </p>
      <div className="rounded-xl border bg-white p-5 flex flex-wrap gap-2">
        <input
          type="email"
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="button" onClick={() => void add()} className="rounded-lg bg-nav text-white px-4 py-2 text-sm">
          Suppress
        </button>
      </div>
      {message && <p className="text-green-600 text-sm">{message}</p>}
      <ul className="rounded-xl border bg-white divide-y text-sm">
        {items.map((i) => (
          <li key={i.email} className="px-4 py-3 flex justify-between gap-2">
            <div>
              <p className="font-medium">{i.email}</p>
              <p className="text-xs text-slate-500">
                {i.reason} · {new Date(i.createdAt).toLocaleString()}
              </p>
            </div>
            <button type="button" className="text-red-600 text-xs" onClick={() => void remove(i.email)}>
              Remove
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="p-4 text-slate-500">List is empty.</li>}
      </ul>
    </div>
  );
}
