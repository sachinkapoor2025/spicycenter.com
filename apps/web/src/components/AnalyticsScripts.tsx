import Script from "next/script";
import { getAnalyticsIds } from "@/lib/analytics-config";

/**
 * Google tag (gtag.js) — GA4 + Google Ads in one loader (no duplicate Google tags).
 * Use afterInteractive (NOT beforeInteractive): beforeInteractive blocked LCP by ~4s+
 * of load-delay on mobile (gtag competed with the hero image request).
 */
export function GoogleAnalytics() {
  const { ga4Id, googleAdsId } = getAnalyticsIds();
  // Prefer GA4 ID for the script URL (matches the Google Analytics install snippet).
  const loaderId = ga4Id || googleAdsId;
  if (!loaderId) return null;

  const configLines = [
    ga4Id ? `gtag('config', '${ga4Id}');` : "",
    googleAdsId ? `gtag('config', '${googleAdsId}');` : "",
  ]
    .filter(Boolean)
    .join("\n        ");

  return (
    <>
      <Script
        id="gtag-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-config" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        ${configLines}
      `}</Script>
    </>
  );
}

/** GTM, Microsoft Clarity, Bing UET, Meta Pixel — all after first paint. */
export function AnalyticsScripts() {
  const { gtmId, clarityId, bingUetId } = getAnalyticsIds();
  const bingUetReady = bingUetId && !bingUetId.includes("SAMPLE") && !bingUetId.includes("XXXX");

  return (
    <>
      <Script id="meta-pixel" strategy="lazyOnload">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '28254161914269673');
        fbq('track', 'PageView');
      `}</Script>
      {gtmId && (
        <Script id="gtm" strategy="lazyOnload">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `}</Script>
      )}
      {bingUetReady && (
        <Script id="bing-uet" strategy="lazyOnload">{`
          (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${bingUetId}"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");
        `}</Script>
      )}
      {clarityId && (
        <Script id="ms-clarity" strategy="lazyOnload">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarityId}");
        `}</Script>
      )}
    </>
  );
}
