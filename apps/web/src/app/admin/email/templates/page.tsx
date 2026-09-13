"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import { PremiumMarketingEmailEditor } from "@/components/admin/PremiumMarketingEmailEditor";
import { ensureStarterEmailTemplates } from "@/lib/ensure-starter-email-templates";
import {
  FREE_SHIPPING_TEMPLATE_ID,
  SPICE_PREMIUM_TEMPLATE_ID,
  STARTING_PRICE_TEMPLATE_ID,
} from "@/lib/starter-email-templates";
import {
  DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT,
  PREMIUM_MARKETING_EMAIL_LAYOUT,
  buildPremiumMarketingEmailHtml,
  type MarketingEmailContentInput,
  type SesTemplate,
} from "@spicycorner/shared";

const EMPTY_HTML = "<p>Hello {{name}}</p>";

export default function TemplatesPage() {
  const api = useApiClient();
  const [templates, setTemplates] = useState<SesTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState(EMPTY_HTML);
  const [layout, setLayout] = useState<typeof PREMIUM_MARKETING_EMAIL_LAYOUT | undefined>();
  const [contentFields, setContentFields] = useState<MarketingEmailContentInput | null>(null);
  const [showHtml, setShowHtml] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [booting, setBooting] = useState(true);

  const isEditing = Boolean(selectedId);
  const isStructured = layout === PREMIUM_MARKETING_EMAIL_LAYOUT && Boolean(contentFields);

  const previewHtml = useMemo(() => {
    if (isStructured && contentFields) {
      return buildPremiumMarketingEmailHtml(contentFields);
    }
    return htmlBody;
  }, [isStructured, contentFields, htmlBody]);

  const load = useCallback(async () => {
    const { templates: list, installed, updated } = await ensureStarterEmailTemplates(api);
    setTemplates(list);
    if (
      installed.includes(FREE_SHIPPING_TEMPLATE_ID) ||
      installed.includes(STARTING_PRICE_TEMPLATE_ID)
    ) {
      setMessage("Campaign templates installed: Free Shipping Above $7 and spice Starting Deals.");
    } else if (
      updated.includes(FREE_SHIPPING_TEMPLATE_ID) ||
      updated.includes(STARTING_PRICE_TEMPLATE_ID)
    ) {
      setMessage("Campaign templates updated from latest marketing email configs.");
    } else if (installed.includes(SPICE_PREMIUM_TEMPLATE_ID)) {
      setMessage("Premium spice template installed — edit images, categories, and CTAs below.");
    } else if (updated.includes(SPICE_PREMIUM_TEMPLATE_ID)) {
      setMessage("Premium spice template upgraded with visual editor fields.");
    return list;
  }, [api]);

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load templates"))
      .finally(() => setBooting(false));
  }, [load]);

  const resetForm = () => {
    setSelectedId(null);
    setName("");
    setSubject("");
    setHtmlBody(EMPTY_HTML);
    setLayout(undefined);
    setContentFields(null);
    setShowHtml(false);
    setMessage("");
    setError("");
  };

  const startPremiumTemplate = () => {
    setSelectedId(null);
    setName("Premium spices (Editable)");
    setSubject("Indian spices from SpicyCorner");
    setLayout(PREMIUM_MARKETING_EMAIL_LAYOUT);
    setContentFields(structuredClone(DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT));
    setHtmlBody(buildPremiumMarketingEmailHtml(DEFAULT_PREMIUM_MARKETING_EMAIL_CONTENT));
    setShowHtml(false);
    setMessage("Fill in the fields below, then save. HTML is generated automatically.");
    setError("");
  };

  const openTemplate = async (templateId: string) => {
    setLoadingId(templateId);
    setMessage("");
    setError("");
    try {
      const res = await api<{ template: SesTemplate }>(`/ses-email/templates/${templateId}`);
      const t = res.template;
      setSelectedId(t.templateId);
      setName(t.name);
      setSubject(t.subject);
      setHtmlBody(t.htmlBody);
      setLayout(t.layout === PREMIUM_MARKETING_EMAIL_LAYOUT ? PREMIUM_MARKETING_EMAIL_LAYOUT : undefined);
      setContentFields(t.contentFields ? structuredClone(t.contentFields) : null);
      setShowHtml(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setLoadingId(null);
    }
  };

  const save = async () => {
    if (!name.trim() || !subject.trim()) {
      setError("Name and subject are required.");
      return;
    }
    if (!isStructured && !htmlBody.trim()) {
      setError("HTML body is required.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = isStructured
        ? {
            name: name.trim(),
            subject: subject.trim(),
            layout: PREMIUM_MARKETING_EMAIL_LAYOUT,
            contentFields,
            htmlBody: buildPremiumMarketingEmailHtml(contentFields!),
          }
        : { name: name.trim(), subject: subject.trim(), htmlBody };

      if (selectedId) {
        const res = await api<{ template: SesTemplate }>(`/ses-email/templates/${selectedId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSelectedId(res.template.templateId);
        setName(res.template.name);
        setSubject(res.template.subject);
        setHtmlBody(res.template.htmlBody);
        setLayout(
          res.template.layout === PREMIUM_MARKETING_EMAIL_LAYOUT
            ? PREMIUM_MARKETING_EMAIL_LAYOUT
            : undefined
        );
        setContentFields(res.template.contentFields ? structuredClone(res.template.contentFields) : null);
        setMessage("Template updated.");
      } else {
        const res = await api<{ template: SesTemplate }>("/ses-email/templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSelectedId(res.template.templateId);
        setName(res.template.name);
        setSubject(res.template.subject);
        setHtmlBody(res.template.htmlBody);
        setLayout(
          res.template.layout === PREMIUM_MARKETING_EMAIL_LAYOUT
            ? PREMIUM_MARKETING_EMAIL_LAYOUT
            : undefined
        );
        setContentFields(res.template.contentFields ? structuredClone(res.template.contentFields) : null);
        setMessage("Template created.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    if (!window.confirm(`Delete template “${name || "untitled"}”? This cannot be undone.`)) return;
    setDeleting(true);
    setMessage("");
    setError("");
    try {
      await api(`/ses-email/templates/${selectedId}`, { method: "DELETE" });
      resetForm();
      setMessage("Template deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Templates</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startPremiumTemplate}
            className="rounded-lg bg-nav text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            New premium template
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              New HTML template
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-3">
        <p className="text-xs text-slate-500">
          {isEditing
            ? isStructured
              ? "Editing premium template (visual fields)"
              : "Editing saved HTML template"
            : isStructured
              ? "Create a premium editable template"
              : "Create a new HTML template"}
        </p>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        {isStructured && contentFields ? (
          <>
            <PremiumMarketingEmailEditor value={contentFields} onChange={setContentFields} />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowHtml((v) => !v)}
                className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                {showHtml ? "Hide generated HTML" : "Show generated HTML"}
              </button>
              <span className="text-xs text-slate-400">Read-only preview of compiled email source</span>
            </div>
            {showHtml && (
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono min-h-[140px] bg-slate-50"
                value={previewHtml}
                readOnly
              />
            )}
            <div className="rounded-xl border overflow-hidden bg-slate-100">
              <p className="px-3 py-2 text-xs font-medium text-slate-600 border-b bg-white">Live preview</p>
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                className="w-full bg-white"
                style={{ height: 720, border: 0 }}
                sandbox=""
              />
            </div>
          </>
        ) : (
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-xs font-mono min-h-[140px]"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || deleting || booting}
            className="rounded-lg bg-nav text-white px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : isEditing ? "Update template" : "Save template"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={saving || deleting}
              className="rounded-lg border border-red-200 text-red-700 px-4 py-2 text-sm hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-slate-700">Saved templates</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Open <strong>Premium spices (Editable)</strong> to change logo, banner, categories, promises,
            and footer without editing HTML. Use Compose → Load template for campaigns.
          </p>
        </div>
        {booting ? (
          <p className="p-4 text-sm text-slate-500">Loading templates…</p>
        ) : templates.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No templates yet. Create one above.</p>
        ) : (
          <ul className="divide-y">
            {templates.map((t) => {
              const active = selectedId === t.templateId;
              const busy = loadingId === t.templateId;
              const structured = t.layout === PREMIUM_MARKETING_EMAIL_LAYOUT;
              return (
                <li key={t.templateId}>
                  <button
                    type="button"
                    onClick={() => void openTemplate(t.templateId)}
                    disabled={busy}
                    className={`w-full text-left p-4 text-sm transition-colors hover:bg-slate-50 disabled:opacity-60 ${
                      active ? "bg-slate-50 ring-inset ring-1 ring-nav/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{t.name}</p>
                      {structured && (
                        <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                          Visual editor
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500">{t.subject}</p>
                    {busy && <p className="text-xs text-slate-400 mt-1">Opening…</p>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
