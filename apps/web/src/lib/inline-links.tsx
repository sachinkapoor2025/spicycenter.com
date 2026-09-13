import Link from "next/link";
import type { ReactNode } from "react";

export const standardInlineLinkClass = "text-nav hover:underline";

type InlineSpec = { phrase: string; href: string };

/**
 * Apply multiple phrase→URL replacements. Longest phrase first, each href once.
 * Previously only the first match survived because the node became a React tree.
 */
export function applyInlineLinks(text: string, links: readonly InlineSpec[]): ReactNode {
  if (!text || links.length === 0) return text;

  type Part = { type: "text"; value: string } | { type: "link"; phrase: string; href: string };
  let parts: Part[] = [{ type: "text", value: text }];
  const usedHref = new Set<string>();

  const ordered = [...links].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const { phrase, href } of ordered) {
    if (!phrase || usedHref.has(href)) continue;
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
      usedHref.add(href);
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
