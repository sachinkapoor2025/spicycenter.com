const DEFAULT_MAX = 155;

/** Strip HTML tags and collapse whitespace for meta tag text. */
function clean(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trim text to a SERP-safe length without cutting mid-word.
 * Prefers ending at a sentence boundary when one fits within the limit.
 */
export function metaDescription(text: string, maxLength = DEFAULT_MAX): string {
  const cleaned = clean(text);
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;

  const slice = cleaned.slice(0, maxLength + 1);
  const sentenceEnd = slice.search(/[.!?](?:\s|$)/);
  if (sentenceEnd >= 50) {
    return cleaned.slice(0, sentenceEnd + 1).trim();
  }

  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace >= 50) {
    return `${truncated.slice(0, lastSpace).trim()}…`;
  }

  return `${truncated.trim()}…`;
}

/** Detect catalog/import descriptions cut at a fixed char limit mid-word. */
export function isTruncatedMeta(text: string | undefined, maxLength = 160): boolean {
  if (!text?.trim()) return true;
  const t = text.trim();
  if (t.length < maxLength - 10) return false;
  if (/[.!?…]$/.test(t)) return false;
  return /[a-zA-Z]$/.test(t);
}

/** Prefer complete seoDescription; fall back to smart-trimmed product description. */
export function productMetaDescription(seoDescription?: string, description?: string): string {
  if (seoDescription && !isTruncatedMeta(seoDescription)) {
    return metaDescription(seoDescription);
  }
  return metaDescription(description ?? seoDescription ?? "");
}
