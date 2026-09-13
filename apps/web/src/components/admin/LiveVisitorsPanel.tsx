"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveVisitorsResponse } from "@spicycorner/shared";
import { useApiClient } from "@/lib/auth-context";
import { LiveVisitorsMap } from "@/components/admin/LiveVisitorsMap";

export function LiveVisitorsPanel() {
  const apiClient = useApiClient();
  const [live, setLive] = useState<LiveVisitorsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLive = useCallback(() => {
    apiClient<LiveVisitorsResponse>("/admin/live-visitors")
      .then((data) => {
        setLive(data);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load live visitors");
      })
      .finally(() => setLoading(false));
  }, [apiClient]);

  useEffect(() => {
    loadLive();
    const id = window.setInterval(loadLive, 15_000);
    return () => window.clearInterval(id);
  }, [loadLive]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Live visitors</h2>
          <p className="text-sm text-slate-500">
            People currently browsing the storefront. Map shows countries; hover a pin for page and
            location details. Refreshes every 15 seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadLive();
          }}
          className="text-sm border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && !live ? (
        <p className="text-slate-500">Loading live visitors…</p>
      ) : (
        <LiveVisitorsMap
          visitors={live?.visitors ?? []}
          activeWithinSeconds={live?.activeWithinSeconds ?? 180}
          byCountry={live?.byCountry ?? []}
        />
      )}
    </div>
  );
}
