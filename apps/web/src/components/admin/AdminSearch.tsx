"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";

type SearchResult = {
  type: string;
  id: string;
  label: string;
  email?: string;
  href: string;
  profileHref?: string;
};

export function AdminSearch() {
  const apiClient = useApiClient();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      apiClient<{ results: SearchResult[] }>(`/admin/search?q=${encodeURIComponent(trimmed)}`)
        .then((d) => {
          setResults(d.results ?? []);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [apiClient, q]);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    router.push(r.profileHref || r.href);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search name, email, phone…"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        aria-label="Admin search"
      />
      {open && (loading || results.length > 0 || q.trim().length >= 2) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">No matches</p>
          )}
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              onClick={() => go(r)}
              className="flex w-full flex-col items-start gap-0.5 border-t border-slate-100 px-3 py-2 text-left hover:bg-slate-50 first:border-t-0"
            >
              <span className="text-sm font-medium text-slate-800">{r.label}</span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                {r.type}
                {r.email ? ` · ${r.email}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
