import Link from "next/link";
import type { ReactNode } from "react";
import { PAGE_MAX_INTERNAL_LINKS } from "@spicycorner/shared";

export const standardInlineLinkClass = "text-nav hover:underline";

type InlineSpec = { phrase: string; href: string };

export type InlineLinkBudget = {
  href: Set<string>;
  label: Set<string>;
};

export function createInlineLinkBudget(): InlineLinkBudget {
  return { href: new Set(), label: new Set() };
}

/**
 * Apply phrase→URL replacements. Unique href + unique anchor, capped at 3 per shared budget (page).
 */
export function applyInlineLinks(
  text: string,
  links: readonly InlineSpec[],
  budget: InlineLinkBudget = createInlineLinkBudget()
): ReactNode {
  if (!text || links.length === 0) return text;

  type Part = { type: "text"; value: string } | { type: "link"; phrase: string; href: string };
  let parts: Part[] = [{ type: "text", value: text }];

  const ordered = [...links].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const { phrase, href } of ordered) {
    if (!phrase || budget.href.has(href)) continue;
    if (budget.href.size >= PAGE_MAX_INTERNAL_LINKS) break;
    const labelKey = phrase.trim().toLowerCase();
    if (!labelKey || budget.label.has(labelKey)) continue;
    let linked = false;
    const next: Part[] = [];
    for (const part of parts) {
      if (part.type === "link" || linked) {
        next.push(part);
        continue;
      }
      const index = part.value.indexOf(phrase);
      if (index === -1) {
        next.push(part);
        continue;
      }
      if (index > 0) next.push({ type: "text", value: part.value.slice(0, index) });
      next.push({ type: "link", phrase, href });
      const rest = part.value.slice(index + phrase.length);
      if (rest) next.push({ type: "text", value: rest });
      linked = true;
      budget.href.add(href);
      budget.label.add(labelKey);
    }
    parts = next;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === "link" ? (
          <Link key={i} href={part.href} className={standardInlineLinkClass}>
            {part.phrase}
          </Link>
        ) : (
          part.value
        )
      )}
    </>
  );
}

export function linkPhraseInText(text: string, phrase: string, href: string): ReactNode {
  return applyInlineLinks(text, [{ phrase, href }]);
}
