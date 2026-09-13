import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export function legalMeta(path: string, title: string, description: string): Metadata {
  return pageMetadata({ title, description, path });
}

export function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="max-w-3xl mx-auto px-4 py-10 prose">
      <h1 className="spice-heading text-4xl not-prose">{title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-charcoal">{children}</div>
    </article>
  );
}
