"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const RfqForm = dynamic(() => import("@/components/RfqForm").then((m) => m.RfqForm), {
  ssr: false,
  loading: () => <div className="min-h-[28rem]" aria-hidden="true" />,
});

/** Load the requirement form after the first screen, so phones paint the hero first. */
export function DeferredHomeRfq({ products }: { products: readonly string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "280px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-h-[28rem]">
      {visible ? <RfqForm products={products} /> : null}
    </div>
  );
}
