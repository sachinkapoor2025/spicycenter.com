const ENQUIRY_QUERY_KEYS = ["product", "country", "quantity"] as const;

type SearchValue = string | string[] | undefined;

/** Compatible query keys from the old /wholesale hub that /enquiry still understands. */
export function enquiryPathFromWholesaleSearch(
  search: Partial<Record<(typeof ENQUIRY_QUERY_KEYS)[number], SearchValue>> | Record<string, SearchValue>
): string {
  const qs = new URLSearchParams();
  for (const key of ENQUIRY_QUERY_KEYS) {
    const raw = search[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value?.trim()) qs.set(key, value.trim());
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return `/enquiry${suffix}`;
}
