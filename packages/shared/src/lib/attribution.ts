import type {
  AttributionChannel,
  AttributionConfidence,
  TrafficTouch,
} from "../schemas/attribution";

export type ResolveTrafficInput = {
  /** Full page URL or path+search (may include utm_* / click ids). */
  pageUrl?: string;
  /** document.referrer */
  referrer?: string;
  /** ISO timestamp for the touch */
  at?: string;
};

const SEARCH_ENGINES: Array<{ match: RegExp; source: string }> = [
  { match: /google\./i, source: "google" },
  { match: /bing\./i, source: "bing" },
  { match: /yahoo\./i, source: "yahoo" },
  { match: /duckduckgo\./i, source: "duckduckgo" },
  { match: /baidu\./i, source: "baidu" },
  { match: /yandex\./i, source: "yandex" },
  { match: /ecosia\./i, source: "ecosia" },
];

const SOCIAL_PLATFORMS: Array<{ match: RegExp; source: string }> = [
  { match: /(^|\.)instagram\.com$/i, source: "instagram" },
  { match: /(^|\.)(facebook\.com|fb\.com|fb\.me|m\.facebook\.com)$/i, source: "facebook" },
  { match: /(^|\.)(youtube\.com|youtu\.be)$/i, source: "youtube" },
  { match: /(^|\.)(tiktok\.com|vm\.tiktok\.com)$/i, source: "tiktok" },
  { match: /(^|\.)pinterest\./i, source: "pinterest" },
  { match: /(^|\.)(twitter\.com|x\.com|t\.co)$/i, source: "x" },
  { match: /(^|\.)linkedin\.com$/i, source: "linkedin" },
  { match: /(^|\.)(whatsapp\.com|wa\.me)$/i, source: "whatsapp" },
  { match: /(^|\.)(threads\.net)$/i, source: "threads" },
  { match: /(^|\.)(reddit\.com)$/i, source: "reddit" },
];

const INTERNAL_HOSTS = [/spicycorner\.com$/i, /localhost$/i, /amplifyapp\.com$/i];

const CLICK_ID_KEYS = ["gclid", "wbraid", "gbraid", "msclkid", "fbclid", "ttclid", "twclid", "li_fat_id", "yclid"] as const;

function safeUrl(raw?: string): URL | null {
  if (!raw?.trim()) return null;
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) return new URL(raw);
    if (raw.startsWith("/")) return new URL(raw, "https://www.spicycenter.com");
    return new URL(`https://${raw}`);
  } catch {
    return null;
  }
}

export function referrerHostname(referrer?: string): string | undefined {
  const u = safeUrl(referrer);
  if (!u) return undefined;
  return u.hostname.replace(/^www\./i, "").toLowerCase();
}

export function isInternalHost(host?: string): boolean {
  if (!host) return false;
  return INTERNAL_HOSTS.some((re) => re.test(host));
}

export function extractCampaignParams(pageUrl?: string): {
  utm: Record<string, string>;
  clickIds: Record<string, string>;
  path: string;
} {
  const utm: Record<string, string> = {};
  const clickIds: Record<string, string> = {};
  let path = pageUrl ?? "";
  const u = safeUrl(pageUrl);
  if (!u) return { utm, clickIds, path };

  path = `${u.pathname}${u.search}`;
  for (const [key, value] of u.searchParams.entries()) {
    const k = key.toLowerCase();
    const v = value.trim().slice(0, 256);
    if (!v) continue;
    if (k.startsWith("utm_")) {
      utm[k.replace(/^utm_/, "")] = v;
    } else if ((CLICK_ID_KEYS as readonly string[]).includes(k)) {
      clickIds[k] = v;
    }
  }
  return { utm, clickIds, path };
}

function matchList(host: string, list: Array<{ match: RegExp; source: string }>): string | undefined {
  for (const row of list) {
    if (row.match.test(host)) return row.source;
  }
  return undefined;
}

function paidMedium(medium: string): boolean {
  return /^(cpc|ppc|paid|paid[_-]?search|paid[_-]?social|display|ads?)$/i.test(medium);
}

function socialMedium(medium: string): boolean {
  return /^(social|social[_-]?paid|social[_-]?organic|ig|fb|meta)$/i.test(medium);
}

function isSocialSource(source: string): boolean {
  return SOCIAL_PLATFORMS.some((s) => s.source === source.toLowerCase());
}

function channelFor(source: string, medium: string, clickIds: Record<string, string>): AttributionChannel {
  if (clickIds.gclid || clickIds.wbraid || clickIds.gbraid) return "paid_search";
  if (clickIds.msclkid) return "paid_search";
  if (clickIds.fbclid || clickIds.ttclid) return "paid_social";
  if (paidMedium(medium) && isSocialSource(source)) return "paid_social";
  if (paidMedium(medium)) return "paid_search";
  if (socialMedium(medium) || isSocialSource(source)) {
    return paidMedium(medium) ? "paid_social" : "organic_social";
  }
  if (SEARCH_ENGINES.some((s) => s.source === source) || medium === "organic") return "organic_search";
  if (medium === "email" || source === "email") return "email";
  if (source === "direct") return "direct";
  if (source === "unknown" || source === "unattributed") return "unknown";
  if (medium === "referral") return "referral";
  return "referral";
}

function touch(
  partial: Omit<TrafficTouch, "confidence"> & { confidence?: AttributionConfidence }
): TrafficTouch {
  return {
    ...partial,
    confidence: partial.confidence ?? "unknown",
  };
}

/**
 * Central source-detection / normalization.
 * Priority: explicit UTM → click ids → known referrer (search/social) → referral → direct/unknown.
 */
export function resolveTrafficSource(input: ResolveTrafficInput): TrafficTouch {
  const { utm, clickIds, path } = extractCampaignParams(input.pageUrl);
  const refHost = referrerHostname(input.referrer);
  const internalRef = isInternalHost(refHost);
  const landingPage = path.split("?")[0] || path || undefined;
  const entryUrl = input.pageUrl?.slice(0, 1024);

  const base = {
    landingPage,
    entryUrl,
    referrer: input.referrer?.slice(0, 512),
    referrerDomain: refHost,
    clickIds: Object.keys(clickIds).length ? clickIds : undefined,
    at: input.at,
    campaign: utm.campaign,
    term: utm.term,
    content: utm.content,
  };

  // 1) Explicit UTM
  if (utm.source || utm.medium) {
    const source = (utm.source || "unknown").toLowerCase();
    const medium = (utm.medium || "campaign").toLowerCase();
    return touch({
      ...base,
      source,
      medium,
      channel: channelFor(source, medium, clickIds),
      confidence: "high",
      confidenceReason: "Explicit UTM parameters on the landing URL",
    });
  }

  // 2) Click IDs (paid)
  if (clickIds.gclid || clickIds.wbraid || clickIds.gbraid) {
    return touch({
      ...base,
      source: "google",
      medium: "cpc",
      channel: "paid_search",
      confidence: "high",
      confidenceReason: "Google Ads click identifier present",
    });
  }
  if (clickIds.msclkid) {
    return touch({
      ...base,
      source: "bing",
      medium: "cpc",
      channel: "paid_search",
      confidence: "high",
      confidenceReason: "Microsoft Ads click identifier present",
    });
  }
  if (clickIds.fbclid) {
    return touch({
      ...base,
      source: "facebook",
      medium: "paid_social",
      channel: "paid_social",
      confidence: "high",
      confidenceReason: "Meta click identifier (fbclid) present",
    });
  }
  if (clickIds.ttclid) {
    return touch({
      ...base,
      source: "tiktok",
      medium: "paid_social",
      channel: "paid_social",
      confidence: "high",
      confidenceReason: "TikTok click identifier present",
    });
  }

  // 3) Known referrer
  if (refHost && !internalRef) {
    const search = matchList(refHost, SEARCH_ENGINES);
    if (search) {
      return touch({
        ...base,
        source: search,
        medium: "organic",
        channel: "organic_search",
        confidence: "high",
        confidenceReason: `Referrer hostname matches search engine (${refHost})`,
      });
    }
    const social = matchList(refHost, SOCIAL_PLATFORMS);
    if (social) {
      return touch({
        ...base,
        source: social,
        medium: "social",
        channel: "organic_social",
        confidence: "high",
        confidenceReason: `Referrer hostname matches social platform (${refHost})`,
      });
    }
    return touch({
      ...base,
      source: refHost,
      medium: "referral",
      channel: "referral",
      confidence: "medium",
      confidenceReason: `External referring domain (${refHost})`,
    });
  }

  // Internal referrer only — navigated within site; not a new acquisition touch
  if (refHost && internalRef) {
    return touch({
      ...base,
      source: "internal",
      medium: "none",
      channel: "unknown",
      confidence: "low",
      confidenceReason: "Internal site navigation (not an acquisition source)",
    });
  }

  // 4) No referrer — could be direct OR privacy-stripped
  if (!input.referrer) {
    // Campaign params without source already handled; bare landing
    return touch({
      ...base,
      source: "direct",
      medium: "none",
      channel: "direct",
      confidence: "low",
      confidenceReason:
        "No referrer or campaign data — labeled Direct with low confidence (may be privacy-restricted)",
    });
  }

  return touch({
    ...base,
    source: "unknown",
    medium: "none",
    channel: "unknown",
    confidence: "unknown",
    confidenceReason: "Missing tracking data — unattributed",
  });
}

/** Human label for admin UI. */
export function formatTrafficTouchLabel(t: TrafficTouch): string {
  const parts = [t.source];
  if (t.medium && t.medium !== "none") parts.push(t.medium);
  if (t.campaign) parts.push(t.campaign);
  return parts.join(" / ");
}

export function isAcquisitionTouch(t: TrafficTouch): boolean {
  return t.source !== "internal" && t.channel !== undefined;
}

/** Merge first-touch (never overwrite) + last-touch (always update on new acquisition). */
export function applyTouchToJourney(
  existing: { first?: TrafficTouch; last?: TrafficTouch; assisted: TrafficTouch[] },
  next: TrafficTouch
): { first: TrafficTouch; last: TrafficTouch; assisted: TrafficTouch[] } {
  if (!isAcquisitionTouch(next) || next.source === "internal") {
    return {
      first: existing.first ?? next,
      last: existing.last ?? next,
      assisted: existing.assisted,
    };
  }

  const first = existing.first ?? next;
  const last = next;
  const assisted = [...existing.assisted];
  if (existing.last && existing.last.source !== next.source) {
    const key = `${existing.last.source}|${existing.last.medium}|${existing.last.campaign ?? ""}`;
    const already = assisted.some(
      (a) => `${a.source}|${a.medium}|${a.campaign ?? ""}` === key
    );
    if (!already && existing.first && existing.last !== existing.first) {
      assisted.push(existing.last);
    }
  }
  return { first, last, assisted: assisted.slice(-18) };
}

export function touchKey(t: TrafficTouch): string {
  return `${t.source}|${t.medium}|${t.campaign ?? ""}`;
}

/** Build assisted list from ordered acquisition touches (excluding first & last). */
export function assistedFromTouches(touches: TrafficTouch[]): TrafficTouch[] {
  if (touches.length <= 2) return [];
  const mid = touches.slice(1, -1);
  const seen = new Set<string>();
  const out: TrafficTouch[] = [];
  for (const t of mid) {
    const k = touchKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.slice(0, 20);
}

export function confidenceRank(c: AttributionConfidence): number {
  switch (c) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

/** Best overall confidence for an order route summary. */
export function overallAttributionConfidence(
  first?: TrafficTouch,
  last?: TrafficTouch
): AttributionConfidence {
  const a = first?.confidence ?? "unknown";
  const b = last?.confidence ?? "unknown";
  return confidenceRank(a) <= confidenceRank(b) ? a : b;
}
