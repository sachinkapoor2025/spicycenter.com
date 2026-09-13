"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";

type ConnectionStatus = {
  configured: boolean;
  connected: boolean;
  apiKeyHint?: string;
  apiBase?: string;
  pingUrl?: string;
  message?: string;
};

function humanizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as Array<{ message?: string }>;
    if (Array.isArray(parsed) && parsed.some((item) => item?.message)) {
      return parsed.map((item) => item.message).filter(Boolean).join("; ");
    }
  } catch {
    /* not JSON */
  }
  return raw;
}

export default function AdminEproloPage() {
  const api = useApiClient();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [openApiKey, setOpenApiKey] = useState("");
  const [openApiSecret, setOpenApiSecret] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const data = await api<ConnectionStatus>("/admin/eprolo/status");
      setStatus(data);
    } catch (err) {
      setStatus({
        configured: false,
        connected: false,
        message: err instanceof Error ? err.message : "Could not load Eprolo status",
      });
    }
  }, [api]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const save = async () => {
    setBusy("save");
    setMessage("");
    try {
      const data = await api<ConnectionStatus & { saved?: boolean }>("/admin/eprolo/credentials", {
        method: "PUT",
        body: JSON.stringify({ openApiKey, openApiSecret }),
      });
      setStatus(data);
      setOpenApiKey("");
      setOpenApiSecret("");
      setMessage(data.connected ? "Saved and connected." : data.message || "Saved. Connection ping did not succeed yet.");
    } catch (err) {
      setMessage(humanizeError(err));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Eprolo</h1>
      <p className="text-sm text-slate-600 mb-6">
        Dropshipping catalog and fulfillment, same role as CJ Dropshipping. Eprolo provides the Open API — we call
        it; we do not host it. Prefer GitHub Actions secrets for production keys.
      </p>

      <div className="mb-6 rounded-lg border border-slate-200 px-4 py-3 text-sm">
        <p>
          <strong>Status:</strong>{" "}
          {status == null
            ? "Loading…"
            : status.connected
              ? "Connected"
              : status.configured
                ? "Configured, ping failed"
                : "Not configured"}
        </p>
        {status?.apiKeyHint && <p className="text-slate-500 mt-1">Key: {status.apiKeyHint}</p>}
        {status?.apiBase && <p className="text-slate-500 mt-1">API host: {status.apiBase}</p>}
        {status?.pingUrl && <p className="text-slate-500 mt-1 break-all">Ping: {status.pingUrl}</p>}
        {status?.message && <p className="text-slate-700 mt-2">{status.message}</p>}
      </div>

      {message && <p className="mb-4 text-sm text-slate-700">{message}</p>}

      <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-2 mb-4">
        <li>
          In GitHub: Settings → Secrets and variables → Actions, add{" "}
          <code className="text-xs">EPROLO_OPEN_API_KEY</code> and{" "}
          <code className="text-xs">EPROLO_OPEN_API_SECRET</code> (same values as openApiKey / openApiSecret from
          Eprolo).
        </li>
        <li>Push to main so deploy writes them onto Lambda, or paste below for this environment only.</li>
        <li>
          Ask the Eprolo account manager for the Open API PDF (product list and create-order method names). The host
          is <code className="text-xs">https://openapi.eprolo.com</code> — we ping that root with{" "}
          <code className="text-xs">apiKey</code> and MD5(key + timestamp + secret).
        </li>
      </ol>

      <div className="space-y-3">
        <input
          type="password"
          value={openApiKey}
          onChange={(e) => setOpenApiKey(e.target.value)}
          placeholder="openApiKey"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          autoComplete="off"
        />
        <input
          type="password"
          value={openApiSecret}
          onChange={(e) => setOpenApiSecret(e.target.value)}
          placeholder="openApiSecret"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={!openApiKey || !openApiSecret || busy === "save"}
          className="btn-cart px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save credentials"}
        </button>
        <button
          type="button"
          onClick={() => void loadStatus()}
          className="ml-2 text-sm px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          Re-test connection
        </button>
      </div>
    </div>
  );
}
