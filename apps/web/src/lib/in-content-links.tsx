import type { ReactNode } from "react";
import Link from "next/link";
import { PAGE_MAX_INTERNAL_LINKS, type SeoLink } from "@spicycorner/shared";

export type PhraseLink = {
  /** Longer phrases first when matching. */
  phrases: readonly string[];
  href: string;
  /** Unique visible anchor; must not repeat on the same page. */
  anchor: string;
};

/** High-value destinations used for in-copy keyword links. */
export const SITE_PHRASE_LINKS: readonly PhraseLink[] = [
  { phrases: ["Indian spice encyclopaedia", "spice encyclopaedia", "spice guide", "spice guides"], href: "/spice-guide", anchor: "spice guide" },
  { phrases: ["wholesale Indian spices", "10kg+ wholesale", "wholesale"], href: "/wholesale", anchor: "wholesale Indian spices" },
  { phrases: ["Indian spices UK", "United Kingdom"], href: "/uk", anchor: "Indian spices UK" },
  { phrases: ["Indian spices Europe", "Europe"], href: "/eu", anchor: "Indian spices Europe" },
  { phrases: ["Indian spice recipes", "recipes"], href: "/recipes", anchor: "Indian spice recipes" },
  { phrases: ["free sourcing enquiry", "free enquiry"], href: "/enquiry", anchor: "free spice enquiry" },
  { phrases: ["bulk enquiry", "100kg+"], href: "/bulk-enquiry", anchor: "bulk spice enquiry" },
  { phrases: ["whole spices"], href: "/spices/whole-spices", anchor: "whole spices" },
  { phrases: ["ground spices"], href: "/spices/ground-spices", anchor: "ground spices" },
  { phrases: ["Indian masalas", "masalas"], href: "/spices/indian-masalas", anchor: "Indian masalas" },
  { phrases: ["spice market prices", "market prices"], href: "/spice-market-prices", anchor: "Indian spice market prices" },
  { phrases: ["spice finder"], href: "/spice-finder", anchor: "spice finder" },
  { phrases: ["Indian spice supplier", "spice supplier"], href: "/spice-supplier", anchor: "Indian spice supplier" },
  { phrases: ["Indian spice catalogue", "spice catalogue"], href: "/spices", anchor: "Indian spice catalogue" },
  { phrases: ["contact us"], href: "/contact", anchor: "contact us" },
  { phrases: ["food information"], href: "/legal/food-information", anchor: "food information" },
  { phrases: ["spice comparisons", "comparisons"], href: "/spice-guide/comparisons", anchor: "spice comparisons" },
  { phrases: ["Kerala"], href: "/indian-spice-regions/kerala", anchor: "Kerala spices" },
  { phrases: ["Rajasthan"], href: "/indian-spice-regions/rajasthan", anchor: "Rajasthan spices" },
  { phrases: ["Kashmiri chilli"], href: "/spice-guide/kashmiri-chilli", anchor: "Kashmiri chilli" },
  { phrases: ["cumin"], href: "/spice-guide/cumin", anchor: "cumin" },
  { phrases: ["turmeric"], href: "/spice-guide/turmeric", anchor: "turmeric" },
  { phrases: ["garam masala"], href: "/spice-guide/garam-masala", anchor: "garam masala" },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function pickPhraseLinks(
  texts: readonly string[],
  currentPath: string,
  extra: readonly PhraseLink[] = [],
  max = PAGE_MAX_INTERNAL_LINKS
): SeoLink[] {
  const hay = texts.join("\n");
  const seenHref = new Set<string>([currentPath]);
  const seenLabel = new Set<string>();
  const chosen: SeoLink[] = [];
  const pool = [...extra, ...SITE_PHRASE_LINKS].sort(
    (a, b) => Math.max(...b.phrases.map((p) => p.length)) - Math.max(...a.phrases.map((p) => p.length))
  );

  for (const item of pool) {
    if (chosen.length >= max) break;
    if (item.href === currentPath || seenHref.has(item.href)) continue;
    const labelKey = item.anchor.trim().toLowerCase();
    if (!labelKey || seenLabel.has(labelKey)) continue;
    const hit = item.phrases.find((phrase) => new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i").test(hay));
    if (!hit) continue;
    seenHref.add(item.href);
    seenLabel.add(labelKey);
    chosen.push({ href: item.href, label: item.anchor });
  }
  return chosen;
}

/** Wrap the first unused phrase match in `text` with a Next.js Link. */
export function LinkedProse({
  text,
  links,
  used,
  className,
}: {
  text: string;
  links: readonly SeoLink[];
  used: Set<string>;
  className?: string;
}): ReactNode {
  if (!text) return null;
  let remaining = text;
  const parts: ReactNode[] = [];
  let key = 0;

  for (const link of links) {
    if (used.has(link.href) || used.has(link.label.toLowerCase())) continue;
    const phrase = SITE_PHRASE_LINKS.find((p) => p.href === link.href && p.anchor === link.label)?.phrases.find((p) =>
      new RegExp(`\\b${escapeRegExp(p)}\\b`, "i").test(remaining)
    );
    const needle = phrase ?? link.label;
    const match = remaining.match(new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i"));
    if (!match || match.index === undefined) continue;
    const before = remaining.slice(0, match.index);
    const matched = remaining.slice(match.index, match.index + match[0].length);
    remaining = remaining.slice(match.index + match[0].length);
    if (before) parts.push(before);
    parts.push(
      <Link key={`il-${key++}`} href={link.href} className="text-nav font-semibold hover:underline">
        {matched}
      </Link>
    );
    used.add(link.href);
    used.add(link.label.toLowerCase());
  }
  if (remaining) parts.push(remaining);
  return className ? <p className={className}>{parts}</p> : <>{parts}</>;
}
