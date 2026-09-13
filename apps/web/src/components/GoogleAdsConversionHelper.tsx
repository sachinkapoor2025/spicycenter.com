import Script from "next/script";

/**
 * Google Ads conversion helper — loads gtagSendEvent for delayed navigation after conversion events.
 * Used on /orders/* confirmation pages. Requires GA4 gtag.js (GoogleAnalytics component).
 */
export function GoogleAdsConversionHelper() {
  return (
    <Script id="google-ads-conversion-helper" strategy="afterInteractive">{`
      function gtagSendEvent(url) {
        var callback = function () {
          if (typeof url === 'string') {
            window.location = url;
          }
        };
        gtag('event', 'conversion_event_purchase_2', {
          'event_callback': callback,
          'event_timeout': 2000,
        });
        return false;
      }
      window.gtagSendEvent = gtagSendEvent;
    `}</Script>
  );
}
