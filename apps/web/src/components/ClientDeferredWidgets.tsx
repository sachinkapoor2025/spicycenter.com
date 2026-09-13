"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";

const ChatWidget = dynamic(() => import("@/components/ChatWidget").then((m) => m.ChatWidget), {
  ssr: false,
  loading: () => null,
});

/** Client-only widgets loaded after hydration (reduces initial JS). */
export function ClientDeferredWidgets() {
  const pathname = usePathname();
  const [chatReady, setChatReady] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/ses-email")) return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === "function") {
      const id = win.requestIdleCallback(() => setChatReady(true), { timeout: 2500 });
      return () => win.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setChatReady(true), 1200);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/ses-email")) return null;

  return (
    <>
      {chatReady ? <ChatWidget /> : null}
      <ExitIntentPopup />
    </>
  );
}
