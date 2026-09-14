"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function SearchBarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setQ(searchParams.get("search") ?? "");
  }, [searchParams]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("search", q);
    else params.delete("search");
    router.push(`/spices?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="relative w-full">
      <input
        type="search"
        placeholder="Search for spices, masalas, herbs..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full border border-[#e6d5bc] rounded-md bg-paper pl-4 pr-12 py-2.5 text-base md:text-sm text-primary placeholder:text-earth/70 focus:outline-none focus:border-nav focus:ring-1 focus:ring-nav"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-md bg-nav text-white hover:bg-[#a74c1e] md:p-2"
        aria-label="Search"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
      </button>
    </form>
  );
}

export function SearchBar() {
  return (
    <Suspense fallback={null}>
      <SearchBarInner />
    </Suspense>
  );
}
