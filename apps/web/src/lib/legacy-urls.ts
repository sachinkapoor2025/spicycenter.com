/**
 * Permanent redirects from retired CMS URL shapes so inbound links are not lost.
 * See also categoryRedirectRules() for category slug migrations.
 */
export function legacyRedirectRules(): {
  source: string;
  destination: string;
  statusCode: 301;
}[] {
  const home = "/";
  const rules: { source: string; destination: string; statusCode: 301 }[] = [];

  const toHome = (source: string) => rules.push({ source, destination: home, statusCode: 301 });

  // Retired catalog tag paths
  toHome("/product-tag/:path*");
  toHome("/tag/:path*");

  // Old single-segment product URLs → /products/:slug
  rules.push({ source: "/product/:slug", destination: "/products/:slug", statusCode: 301 });

  // Retired CMS / account paths (no longer served)
  toHome("/wp-admin/:path*");
  toHome("/wp-content/:path*");
  toHome("/wp-includes/:path*");
  toHome("/feed");
  toHome("/feed/:path*");
  toHome("/author/:path*");
  toHome("/page/:path*");
  toHome("/comments/:path*");
  toHome("/my-account/:path*");

  // Do not redirect /cart or /checkout — those are live app routes.

  rules.push({ source: "/shop", destination: "/products", statusCode: 301 });
  rules.push({ source: "/shop/:path*", destination: "/products", statusCode: 301 });

  // Hamper URLs previously appended SKU (e.g. …-tfusrh2026-16) — redirect to name-only slug.
  for (const [from, to] of HAMPER_SKU_SLUG_REDIRECTS) {
    rules.push({
      source: `/products/${from}`,
      destination: `/products/${to}`,
      statusCode: 301,
    });
  }

  return rules;
}

/** Old slug (name-sku) → new slug (name only). */
const HAMPER_SKU_SLUG_REDIRECTS: readonly [string, string][] = [
                                  ["kaju-katli-elegance-hamper-tfusrh2026-38", "kaju-katli-elegance-hamper"],
      ];
