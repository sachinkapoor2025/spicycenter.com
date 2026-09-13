import type { SesTemplate } from "@spicycorner/shared";
import { PREMIUM_MARKETING_EMAIL_LAYOUT } from "@spicycorner/shared";
import {
  STARTER_EMAIL_TEMPLATES,
  resolveStarterHtmlBody,
  type StarterEmailTemplateMeta,
} from "@/lib/starter-email-templates";

type ApiClient = <T>(path: string, init?: RequestInit) => Promise<T>;

async function loadStarterHtml(starter: StarterEmailTemplateMeta): Promise<string> {
  if (starter.buildHtml || starter.contentFields) {
    return resolveStarterHtmlBody(starter);
  }
  if (!starter.htmlPath) {
    throw new Error(`Starter template ${starter.templateId} has no htmlPath, buildHtml, or contentFields`);
  }
  const htmlRes = await fetch(starter.htmlPath);
  if (!htmlRes.ok) {
    throw new Error(`Failed to load starter template HTML (${starter.name})`);
  }
  return resolveStarterHtmlBody(starter, await htmlRes.text());
}

/**
 * Ensures packaged starter templates exist in Admin → Templates.
 * HTML-file / buildHtml starters refresh when packaged content changes.
 * Structured (contentFields) starters install once and preserve Admin edits.
 */
export async function ensureStarterEmailTemplates(api: ApiClient): Promise<{
  templates: SesTemplate[];
  installed: string[];
  updated: string[];
}> {
  const list = await api<{ templates: SesTemplate[] }>("/ses-email/templates");
  const byId = new Map(list.templates.map((t) => [t.templateId, t]));
  const installed: string[] = [];
  const updated: string[] = [];

  for (const starter of STARTER_EMAIL_TEMPLATES) {
    const htmlBody = await loadStarterHtml(starter);
    const existing = byId.get(starter.templateId);
    const isStructured = Boolean(starter.contentFields && starter.layout === PREMIUM_MARKETING_EMAIL_LAYOUT);

    if (!existing) {
      const created = await api<{ template: SesTemplate; existed?: boolean }>("/ses-email/templates", {
        method: "POST",
        body: JSON.stringify({
          templateId: starter.templateId,
          name: starter.name,
          subject: starter.subject,
          htmlBody,
          ...(starter.layout ? { layout: starter.layout } : {}),
          ...(starter.contentFields ? { contentFields: starter.contentFields } : {}),
        }),
      });
      if (!created.existed) installed.push(created.template.templateId);
      byId.set(created.template.templateId, created.template);
      continue;
    }

    // Structured templates: only migrate layout/contentFields if missing; never clobber edits.
    if (isStructured && starter.preserveAdminEdits !== false) {
      if (!existing.contentFields || existing.layout !== PREMIUM_MARKETING_EMAIL_LAYOUT) {
        const res = await api<{ template: SesTemplate }>(`/ses-email/templates/${starter.templateId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: existing.name || starter.name,
            subject: existing.subject || starter.subject,
            layout: starter.layout,
            contentFields: existing.contentFields ?? starter.contentFields,
            htmlBody,
          }),
        });
        updated.push(res.template.templateId);
        byId.set(res.template.templateId, res.template);
      }
      continue;
    }

    // File / buildHtml starters: refresh when packaged HTML or metadata changes.
    if (existing.htmlBody !== htmlBody || existing.subject !== starter.subject || existing.name !== starter.name) {
      const res = await api<{ template: SesTemplate }>(`/ses-email/templates/${starter.templateId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: starter.name,
          subject: starter.subject,
          htmlBody,
        }),
      });
      updated.push(res.template.templateId);
      byId.set(res.template.templateId, res.template);
    }
  }

  const refreshed = await api<{ templates: SesTemplate[] }>("/ses-email/templates");
  return { templates: refreshed.templates, installed, updated };
}
