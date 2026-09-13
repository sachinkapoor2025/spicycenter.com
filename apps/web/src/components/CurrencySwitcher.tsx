"use client";

import { usePathname } from "next/navigation";
import { CurrencySelect } from "@/components/CurrencySelect";

export function CurrencySwitcher() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/ses-email")) return null;

  // Hide on checkout so the rail does not cover payment badges. Header currency still works.
  if (pathname.startsWith("/checkout")) return null;

  return (
    <div
      className="fixed right-0 top-[10.75rem] md:top-[11.25rem] z-[55] flex flex-col shadow-lg rounded-l-md overflow-visible pointer-events-auto"
      role="group"
      aria-label="Currency switcher"
    >
      <CurrencySelect variant="rail" />
    </div>
  );
}
