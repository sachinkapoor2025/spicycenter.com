"use client";

import { useEffect } from "react";
import { trackSearch } from "@/lib/track";

/** Records a search event (with result count + zero-result flag) when results render. */
export function SearchTracker({ query, resultCount }: { query: string; resultCount: number }) {
  useEffect(() => {
    if (query.trim()) trackSearch(query, resultCount);
  }, [query, resultCount]);

  return null;
}
