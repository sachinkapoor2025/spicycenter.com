"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import type { SesSettings } from "@spicycorner/shared";

export default function SettingsPage() {
  const api = useApiClient();
  const [settings, setSettings] = useState<SesSettings | null>(null);
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);
  const [smtpPasswordSource, setSmtpPasswordSource] = useState<"settings" | "env" | "none">("none");
  const [passwordDirty, setPasswordDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api<{
      settings: SesSettings;
      smtpPasswordSet?: boolean;
      smtpPasswordSource?: "settings" | "env" | "none";
    }>("/ses-email/settings");
    setSettings(res.settings);
    setSmtpPasswordSet(Boolean(res.smtpPasswordSet));
    setSmtpPasswordSource(res.smtpPasswordSource ?? (res.smtpPasswordSet ? "settings" : "none"));
    setPasswordDirty(false);
  }, [api]);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setError("");
    setMessage("");
    try {
      const payload: Record<string, unknown> = {
        ...settings,
      };
      // Omit password when unchanged so the API keeps Dynamo/env credentials.
      if (passwordDirty) {
        payload.smtpPassword = settings.smtpPassword || "";
      } else {
        delete payload.smtpPassword;
      }
      const res = await api<{
        settings: SesSettings;
        smtpPasswordSet?: boolean;
        smtpPasswordSource?: "settings" | "env" | "none";
      }>("/ses-email/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSettings(res.settings);
      setSmtpPasswordSet(Boolean(res.smtpPasswordSet));
      setSmtpPasswordSource(res.smtpPasswordSource ?? (res.smtpPasswordSet ? "settings" : "none"));
      setPasswordDirty(false);
      setMessage("Settings saved. Marketing emails will use these SMTP credentials.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (!settings) return <p className="text-slate-500">Loading settings…</p>;

  const field = (key: keyof SesSettings, label: string, type: "text" | "number" = "text") => (
    <label className="block text-sm">
      {label}
      <input
        type={type}
        className="mt-1 w-full border rounded-lg px-3 py-2"
        value={String(settings[key] ?? "")}
        onChange={(e) =>
          setSettings({
            ...settings,
            [key]: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </label>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-primary">Settings</h1>
      <p className="text-sm text-slate-500">
        Two separate email systems — do not mix them:
      </p>
      <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
        <li>
          <strong>Website / orders / coupons / enquiries</strong> — sent from{" "}
          <code>enquiry@spicycenter.com</code> via <code>mail.spicycenter.com</code> port 587. Copies go
          to the customer and <code>enquiry@spicycenter.com</code> (server config; not edited here).
        </li>
        <li>
          <strong>Marketing campaigns</strong> — Mailercloud below; From ={" "}
          <code>email@spicycorner.com</code>
        </li>
      </ul>

      <div className="rounded-xl border bg-white p-5 space-y-3">
        <h2 className="font-semibold text-primary">Marketing SMTP</h2>
        <p className="text-xs text-slate-500">
          Marketing only — host <code>smtp-prod.mailrcld.com</code>, port <code>587</code>, STARTTLS
          (secure unchecked). SMTP login can be your Mailercloud user.{" "}
          <strong>Default sender</strong> must be the verified Sender ID{" "}
          <code>email@spicycorner.com</code>.
        </p>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Never set SMTP host to <code>smtp.spicycenter.com</code> here. That mailbox has a low daily
          send limit (~220) used for order notifications — using it for campaigns blocks coupons and
          order emails for the rest of the day.
        </p>

        <label className="block text-sm">
          Transport
          <select
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={settings.marketingTransport ?? "smtp"}
            onChange={(e) =>
              setSettings({
                ...settings,
                marketingTransport: e.target.value as "smtp" | "ses",
              })
            }
          >
            <option value="smtp">SMTP (Mailercloud) — recommended</option>
            <option value="ses">Amazon SES API (suspended / legacy)</option>
          </select>
        </label>

        {field("smtpHost", "SMTP host")}
        <label className="block text-sm">
          SMTP port
          <input
            type="number"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={String(settings.smtpPort ?? 587)}
            onChange={(e) => {
              const smtpPort = Number(e.target.value);
              setSettings({
                ...settings,
                smtpPort,
                // Port 587 = STARTTLS; port 465 = SMTPS. Wrong combo causes TLS "wrong version number".
                smtpSecure: smtpPort === 465,
              });
            }}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(settings.smtpSecure)}
            onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
          />
          Use SMTPS / secure (port 465 only). For Mailercloud port 587 this must stay unchecked
          (STARTTLS).
        </label>
        {Number(settings.smtpPort) === 587 && settings.smtpSecure ? (
          <p className="text-xs text-red-600">
            Port 587 with Secure checked will fail. Uncheck Secure, then Save.
          </p>
        ) : null}

        {field("smtpUser", "SMTP username")}

        <label className="block text-sm">
          SMTP password
          <input
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            placeholder={
              smtpPasswordSet
                ? "Password saved — type a new one to replace"
                : "Paste password from Mailercloud"
            }
            value={passwordDirty ? String(settings.smtpPassword ?? "") : ""}
            onChange={(e) => {
              setPasswordDirty(true);
              setSettings({ ...settings, smtpPassword: e.target.value });
            }}
          />
        </label>
        {smtpPasswordSet && !passwordDirty && (
          <p className="text-xs text-emerald-700">
            {smtpPasswordSource === "env"
              ? "SMTP password is available from server env (MARKETING_SMTP_PASS). Saving settings will store it for campaigns."
              : "A password is stored — that does not prove Mailercloud still accepts it. If Send test returns 535, generate a new Mailercloud SMTP password, paste it here, and Save."}
          </p>
        )}
        {!smtpPasswordSet && (
          <p className="text-xs text-red-600">
            Marketing SMTP password is missing. Paste your Mailercloud password here and Save, or set GitHub
            secret <code>MARKETING_SMTP_PASS</code> and redeploy.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Use the SMTP username shown in Mailercloud (often <code>order@spicycorner.com</code>). Do not use
          the transactional <code>smtp.spicycenter.com</code> mailbox password here.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-3">
        <h2 className="font-semibold text-primary">Sender &amp; limits</h2>
        {field("defaultSenderName", "Default sender name")}
        {field("defaultSenderEmail", "Default sender email")}
        {field("defaultReplyTo", "Default reply-to")}
        {field("dailyLimit", "Daily limit", "number")}
        {field("maxSendRatePerMinute", "Max emails / minute", "number")}
        {field("batchSize", "Batch size", "number")}
        {field("delayBetweenBatchesMs", "Delay between batches (ms)", "number")}
        {field("concurrentWorkers", "Concurrent workers", "number")}
        {field("companyName", "Company name (footer)")}
        {field("companyAddress", "Company address (footer)")}
        {field("contactEmail", "Contact email (footer)")}
        {field("privacyUrl", "Privacy policy URL")}
        {field("adminNotifyEmail", "Admin notify email")}
        <button
          type="button"
          onClick={() => void save()}
          className="rounded-lg bg-nav text-white px-4 py-2 text-sm"
        >
          Save settings
        </button>
        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
