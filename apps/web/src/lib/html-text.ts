/** True when a product description looks like HTML (not plain prose). */
export function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

/** Strip tags for summaries, meta, and plain-text UI. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, " ")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** First readable sentence/snippet from HTML or plain description. */
export function shortPlainDescription(description: string, maxLen = 220): string {
  const plain = looksLikeHtml(description) ? stripHtml(description) : description.trim();
  const first = plain.split(/(?<=\.)\s+/)[0]?.trim() ?? plain;
  if (first.length <= maxLen) return first;
  return `${first.slice(0, maxLen - 1).trim()}…`;
}
