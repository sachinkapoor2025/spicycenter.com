"use client";

import type { ReactNode } from "react";
import type { VisitWebsiteEmailContent } from "@spicycorner/shared";

type Props = {
  value: VisitWebsiteEmailContent;
  onChange: (next: VisitWebsiteEmailContent) => void;
};

function Field({
  label,
  value,
  onChange,
  multiline,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
}) {
  const cls = "w-full border rounded-lg px-3 py-2 text-sm";
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {multiline ? (
        <textarea className={`${cls} min-h-[72px]`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint ? <span className="block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-slate-50/60 p-4 space-y-3">
      <legend className="px-1 text-sm font-semibold text-primary">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function VisitWebsiteEmailEditor({ value, onChange }: Props) {
  const set = <K extends keyof VisitWebsiteEmailContent>(key: K, next: VisitWebsiteEmailContent[K]) => {
    onChange({ ...value, [key]: next });
  };

  const updateProduct = (index: number, patch: Partial<VisitWebsiteEmailContent["products"][number]>) => {
    const products = value.products.map((product, i) => (i === index ? { ...product, ...patch } : product));
    set("products", products);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Short email for website visits. Change the headline, message, product photos, button label, and
        destination. HTML is generated for Gmail and Outlook. Do not add offers that are not set on the website.
      </p>

      <Section title="Message">
        <div className="sm:col-span-2">
          <Field
            label="Inbox preview"
            value={value.preheader}
            onChange={(v) => set("preheader", v)}
            hint="The short line inboxes show next to the subject."
          />
        </div>
        <div className="sm:col-span-2">
          <Field label="Headline" value={value.headline} onChange={(v) => set("headline", v)} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Message" value={value.message} onChange={(v) => set("message", v)} multiline />
        </div>
      </Section>

      <Section title="Button">
        <Field label="Button text" value={value.ctaText} onChange={(v) => set("ctaText", v)} />
        <Field
          label="Destination URL"
          value={value.ctaUrl}
          onChange={(v) => set("ctaUrl", v)}
          hint="Where the button sends customers. Default is the live catalogue."
        />
      </Section>

      <Section title="Product photos">
        {value.products.map((product, index) => (
          <div key={index} className="sm:col-span-2 rounded-lg border bg-white p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500">Product {index + 1}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Name" value={product.name} onChange={(v) => updateProduct(index, { name: v })} />
              <Field label="Product page URL" value={product.href} onChange={(v) => updateProduct(index, { href: v })} />
              <div className="sm:col-span-2">
                <Field
                  label="Image URL"
                  value={product.imageUrl}
                  onChange={(v) => updateProduct(index, { imageUrl: v })}
                  hint="Use a full https address. Defaults are photos already on spicycenter.com."
                />
              </div>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Logo">
        <Field label="Logo image URL" value={value.logoUrl} onChange={(v) => set("logoUrl", v)} />
        <Field label="Logo link" value={value.logoHref} onChange={(v) => set("logoHref", v)} />
        <Field label="Logo alt text" value={value.logoAlt} onChange={(v) => set("logoAlt", v)} />
        <Field label="Footer website label" value={value.websiteLabel} onChange={(v) => set("websiteLabel", v)} />
      </Section>
    </div>
  );
}
