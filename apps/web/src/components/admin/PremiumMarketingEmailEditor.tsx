"use client";

import type { ReactNode } from "react";
import type { MarketingEmailContentInput } from "@spicycorner/shared";

type Props = {
  value: MarketingEmailContentInput;
  onChange: (next: MarketingEmailContentInput) => void;
};

function Field({
  label,
  value,
  onChange,
  multiline,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
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

export function PremiumMarketingEmailEditor({ value, onChange }: Props) {
  const set = <K extends keyof MarketingEmailContentInput>(key: K, v: MarketingEmailContentInput[K]) => {
    onChange({ ...value, [key]: v });
  };

  const updateCategory = (index: number, patch: Partial<MarketingEmailContentInput["categories"][number]>) => {
    const categories = value.categories.map((c, i) => (i === index ? { ...c, ...patch } : c));
    set("categories", categories);
  };

  const updatePromise = (index: number, patch: Partial<MarketingEmailContentInput["promises"][number]>) => {
    const promises = value.promises.map((p, i) => (i === index ? { ...p, ...patch } : p));
    set("promises", promises);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Edit every image, link, button, and offer text below. HTML is generated automatically — no code changes needed.
      </p>

      <Section title="Logo & Hero Banner">
        <Field label="Logo URL" value={value.logoUrl} onChange={(v) => set("logoUrl", v)} />
        <Field label="Logo link" value={value.logoHref} onChange={(v) => set("logoHref", v)} />
        <Field label="Logo alt text" value={value.logoAlt} onChange={(v) => set("logoAlt", v)} />
        <Field label="Preheader (inbox preview)" value={value.preheader} onChange={(v) => set("preheader", v)} />
        <Field label="Hero image URL" value={value.heroImageUrl} onChange={(v) => set("heroImageUrl", v)} />
        <Field label="Hero image link" value={value.heroImageHref} onChange={(v) => set("heroImageHref", v)} />
        <Field label="Hero image alt" value={value.heroImageAlt} onChange={(v) => set("heroImageAlt", v)} />
        <Field label="Hero badge title" value={value.heroOverlayTitle} onChange={(v) => set("heroOverlayTitle", v)} />
        <div className="sm:col-span-2">
          <Field
            label="Hero subtitle"
            value={value.heroOverlaySubtitle}
            onChange={(v) => set("heroOverlaySubtitle", v)}
          />
        </div>
        <Field label="Hero Shop Now label" value={value.heroButtonText} onChange={(v) => set("heroButtonText", v)} />
        <Field label="Hero Shop Now URL" value={value.heroButtonHref} onChange={(v) => set("heroButtonHref", v)} />
      </Section>

      <Section title="Intro heading">
        <div className="sm:col-span-2">
          <Field label="Heading" value={value.heading} onChange={(v) => set("heading", v)} />
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Description"
            value={value.description}
            onChange={(v) => set("description", v)}
            multiline
          />
        </div>
      </Section>

      <Section title="Featured Categories">
        <Field
          label="Section heading"
          value={value.categoriesHeading}
          onChange={(v) => set("categoriesHeading", v)}
        />
        <Field
          label="Section subheading"
          value={value.categoriesSubheading}
          onChange={(v) => set("categoriesSubheading", v)}
        />
        {value.categories.map((cat, i) => (
          <div key={i} className="sm:col-span-2 rounded-lg border bg-white p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500">Category {i + 1}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Name" value={cat.name} onChange={(v) => updateCategory(i, { name: v })} />
              <Field
                label="Button text"
                value={cat.buttonText}
                onChange={(v) => updateCategory(i, { buttonText: v })}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Short description"
                  value={cat.description}
                  onChange={(v) => updateCategory(i, { description: v })}
                />
              </div>
              <Field label="Image URL" value={cat.imageUrl} onChange={(v) => updateCategory(i, { imageUrl: v })} />
              <Field label="Shop URL" value={cat.href} onChange={(v) => updateCategory(i, { href: v })} />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Our Promise">
        <Field label="Section heading" value={value.promiseHeading} onChange={(v) => set("promiseHeading", v)} />
        <Field
          label="Section subheading"
          value={value.promiseSubheading}
          onChange={(v) => set("promiseSubheading", v)}
        />
        {value.promises.map((p, i) => (
          <div key={i} className="sm:col-span-2 rounded-lg border bg-white p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500">Promise {i + 1}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Icon (emoji)" value={p.icon} onChange={(v) => updatePromise(i, { icon: v })} />
              <Field label="Title" value={p.title} onChange={(v) => updatePromise(i, { title: v })} />
              <Field
                label="Description"
                value={p.description}
                onChange={(v) => updatePromise(i, { description: v })}
              />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Mid CTA band">
        <Field label="Heading" value={value.midCtaHeading} onChange={(v) => set("midCtaHeading", v)} />
        <Field
          label="Button text"
          value={value.midCtaButtonText}
          onChange={(v) => set("midCtaButtonText", v)}
        />
        <div className="sm:col-span-2">
          <Field
            label="Description"
            value={value.midCtaDescription}
            onChange={(v) => set("midCtaDescription", v)}
            multiline
          />
        </div>
        <Field label="Button URL" value={value.midCtaButtonHref} onChange={(v) => set("midCtaButtonHref", v)} />
      </Section>

      <Section title="Footer & social">
        <Field label="Tagline" value={value.footerTagline} onChange={(v) => set("footerTagline", v)} />
        <Field label="Copyright" value={value.copyrightText} onChange={(v) => set("copyrightText", v)} />
        <Field label="Website URL" value={value.websiteUrl} onChange={(v) => set("websiteUrl", v)} />
        <Field label="Website label" value={value.websiteLabel} onChange={(v) => set("websiteLabel", v)} />
        <Field label="Order email" value={value.orderEmail} onChange={(v) => set("orderEmail", v)} type="email" />
        <Field
          label="Unsubscribe label"
          value={value.unsubscribeLabel}
          onChange={(v) => set("unsubscribeLabel", v)}
        />
        <Field label="Facebook URL" value={value.facebookUrl} onChange={(v) => set("facebookUrl", v)} />
        <Field
          label="Facebook icon URL"
          value={value.facebookIconUrl}
          onChange={(v) => set("facebookIconUrl", v)}
        />
        <Field label="Instagram URL" value={value.instagramUrl} onChange={(v) => set("instagramUrl", v)} />
        <Field
          label="Instagram icon URL"
          value={value.instagramIconUrl}
          onChange={(v) => set("instagramIconUrl", v)}
        />
      </Section>
    </div>
  );
}
