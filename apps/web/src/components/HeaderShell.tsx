"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";

function HeaderFallback() {
  return (
    <header className="border-b border-slate-200 bg-white h-24">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="h-11 w-36 bg-slate-100 rounded animate-pulse" />
      </div>
    </header>
  );
}

export function HeaderShell() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/ses-email")) return null;

  return (
    <Suspense fallback={<HeaderFallback />}>
      <Header />
    </Suspense>
  );
}
