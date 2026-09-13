"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import type { ReminderEmail } from "@spicycorner/shared";

export default function CheckoutNudgesPage() {
  const api = useApiClient();
  const [items, setItems] = useState<ReminderEmail[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ items: ReminderEmail[]; count: number }>("/ses-email/reminders");
      setItems(res.items);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const allSelected = useMemo(
    () => items.length > 0 && items.every((i) => selected.has(i.email)),
    [items, selected]
  );

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.email)));
  };

  const toggleOne = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const fetchEmails = async () => {
    setFetching(true);
    setMessage("");
    setError("");
    try {
      const res = await api<{
        scanned: number;
        inserted: number;
        skippedExisting: number;
        skippedPaid: number;
      }>("/ses-email/reminders/collect", { method: "POST" });
      setMessage(
        `Fetched site emails: ${res.inserted} new · ${res.skippedExisting} already stored · ${res.skippedPaid} buyers skipped (${res.scanned} unique found)`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  };

  const deleteSelected = async () => {
    const emails = Array.from(selected);
    if (!emails.length) return;
    if (!confirm(`Remove ${emails.length} email(s) from this list?`)) return;
    setMessage("");
    setError("");
    try {
      const res = await api<{ deleted: number }>("/ses-email/reminders/delete", {
        method: "POST",
        body: JSON.stringify({ emails }),
      });
      setMessage(`Removed ${res.deleted} email(s).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const sendNudge = async () => {
    const emails = Array.from(selected);
    if (!emails.length) return;
    if (!confirm(`Send checkout nudge to ${emails.length} selected email(s)?`)) return;
    setSending(true);
    setMessage("");
    setError("");
    try {
      const res = await api<{ sent: number; skipped: number; errors: string[] }>(
        "/ses-email/reminders/send",
        {
          method: "POST",
          body: JSON.stringify({ emails }),
        }
      );
      const errNote = res.errors?.length ? ` · ${res.errors.length} error(s)` : "";
      setMessage(`Sent ${res.sent} nudge(s) · skipped ${res.skipped}${errNote}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Checkout nudges</h2>
        <p className="text-sm text-slate-500 mt-1">
          Pull emails from leads, visitors, abandoned carts, and pending checkouts — excluding anyone
          who already paid. Select recipients and send a checkout reminder when you&apos;re ready.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void fetchEmails()}
          disabled={fetching}
          className="rounded-lg bg-nav text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {fetching ? "Fetching emails…" : "Fetch emails"}
        </button>
        <button
          type="button"
          onClick={() => void sendNudge()}
          disabled={sending || selected.size === 0}
          className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {sending ? "Sending…" : `Send checkout nudge (${selected.size})`}
        </button>
        <button
          type="button"
          onClick={() => void deleteSelected()}
          disabled={selected.size === 0}
          className="rounded-lg border border-red-200 text-red-700 px-4 py-2 text-sm disabled:opacity-50"
        >
          Remove selected
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2 text-sm">
          <label className="flex items-center gap-2 font-medium text-slate-700">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!items.length} />
            Select all ({items.length})
          </label>
          <span className="text-slate-500">{selected.size} selected</span>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            No emails yet. Click <strong>Fetch emails</strong> to pull contacts from the site.
          </p>
        ) : (
          <ul className="divide-y max-h-[28rem] overflow-y-auto text-sm">
            {items.map((item) => (
              <li key={item.email} className="px-4 py-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(item.email)}
                  onChange={() => toggleOne(item.email)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{item.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.name ? `${item.name} · ` : ""}
                    {item.sources?.length ? item.sources.join(", ") : "unknown source"}
                    {item.lastReminderSentAt
                      ? ` · last nudge ${new Date(item.lastReminderSentAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline shrink-0"
                  onClick={() => {
                    setSelected(new Set([item.email]));
                    void (async () => {
                      await api("/ses-email/reminders/delete", {
                        method: "POST",
                        body: JSON.stringify({ emails: [item.email] }),
                      });
                      await load();
                    })();
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
