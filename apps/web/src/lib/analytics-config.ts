/**
 * Production analytics & site-verification IDs.
 * GA4 and Google Search Console values are hardcoded (not env-overridable)
 * so Amplify secrets cannot replace the live tags.
 * Other IDs still allow env overrides for local testing.
 */
export const analyticsConfig = {
  gtmId: "GTM-KQLBTVVK",
  /** Google Analytics 4 measurement ID — hardcoded; Amplify NEXT_PUBLIC_GA4_ID is ignored. */
  ga4Id: "G-PGFC0DCL1C",
  /** Google Ads conversion tag (gtag.js) — hardcoded, not Amplify env. */
  googleAdsId: "AW-18198485613",
  metaPixelId: "1459099935879507",
  clarityId: "xdpv6v2lq9",
  /** Meta tag content for Google Search Console (`google-site-verification`). */
  googleSiteVerification: "ZeIeT11CZCmWyesWfLtffXYRrw3r4Nzq_4-c4-13T8I",
  /** Bing Webmaster Tools meta tag — set when you have the code from Bing. */
  bingSiteVerification: "",
  bingUetId: "",
} as const;

function envOrDefault(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value || fallback;
}

export function getAnalyticsIds() {
  return {
    gtmId: envOrDefault("NEXT_PUBLIC_GTM_ID", analyticsConfig.gtmId),
    ga4Id: analyticsConfig.ga4Id,
    googleAdsId: envOrDefault("NEXT_PUBLIC_GOOGLE_ADS_ID", analyticsConfig.googleAdsId),
    metaPixelId: envOrDefault("NEXT_PUBLIC_META_PIXEL_ID", analyticsConfig.metaPixelId),
    clarityId: envOrDefault("NEXT_PUBLIC_CLARITY_ID", analyticsConfig.clarityId),
    bingUetId: envOrDefault("NEXT_PUBLIC_BING_UET_ID", analyticsConfig.bingUetId),
  };
}

export function getSiteVerification() {
  return {
    google: analyticsConfig.googleSiteVerification,
    bing: envOrDefault("NEXT_PUBLIC_BING_SITE_VERIFICATION", analyticsConfig.bingSiteVerification),
  };
}
