"use client";

import { useEffect, useState } from "react";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { api } from "@/lib/api";
import { WishlistButton } from "@/components/WishlistButton";
import { ApprovedReviewList } from "@/components/ApprovedReviewList";
import { EnquireNowLink } from "@/components/EnquireNowLink";
import { useSessionId, useDebouncedLeadCapture } from "@/lib/session";
import { trackProductView } from "@/lib/track";
import { LeadCaptureInput } from "@/components/LeadCaptureInput";
import { HomeProductCard } from "@/components/HomeProductCard";
import { productPageFaqs } from "@/lib/content/product-faqs";
import { looksLikeHtml, stripHtml, shortPlainDescription } from "@/lib/html-text";
import { cjStorefrontProductVideosPath, type Product } from "@spicycorner/shared";
import {
  BRAND_NAME,
  PRODUCT_ORIGIN,
  catalogueDescription,
  enquiryProductName,
  featuredBilingualName,
  productTypeLabel,
} from "@/lib/catalogue";

type Tab = "description" | "reviews" | "faq";

const PRODUCT_INFO_BADGES = [
  {
    title: "Worldwide delivery",
    copy: "Arranged through enquiry",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9S14.5 18.2 12 21C9.5 18.2 8.2 15.2 8.2 12S9.5 5.8 12 3z" />
      </svg>
    ),
  },
  {
    title: "Quick enquiry",
    copy: "Get in touch for your needs",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M6 4h12a2 2 0 012 2v12l-4-3H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    title: "Wholesale & bulk supply",
    copy: "For businesses and distributors",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.3 7L12 12l8.7-5M12 22V12" />
      </svg>
    ),
  },
] as const;

const PRODUCT_TRUST_STRIP = ["Wide range of spices", "Origin: India"] as const;

function variantLabel(variant: { key?: string; name?: string; sku?: string; vid: string }): string {
  return (variant.key || variant.name || variant.sku || variant.vid).trim();
}

function readStoredVid(slug: string, variants: Array<{ vid: string }>): string {
  if (typeof window === "undefined") return "";
  const fromUrl = new URLSearchParams(window.location.search).get("vid");
  if (fromUrl && variants.some((v) => v.vid === fromUrl)) return fromUrl;
  try {
    const fromStore = sessionStorage.getItem(`hr-cj-vid:${slug}`);
    if (fromStore && variants.some((v) => v.vid === fromStore)) return fromStore;
  } catch {
    /* private mode */
  }
  return "";
}

function persistVid(slug: string, vid: string) {
  if (typeof window === "undefined" || !vid) return;
  try {
    sessionStorage.setItem(`hr-cj-vid:${slug}`, vid);
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("vid") === vid) return;
  url.searchParams.set("vid", vid);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function galleryForVariant(images: string[], variantImage?: string): string[] {
  const featured = variantImage?.trim();
  if (!featured) return images;
  return [featured, ...images.filter((url) => url !== featured)];
}

function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled or clipboard blocked */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label="Share product"
      title={copied ? "Link copied!" : "Share"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#e6d5bc] bg-paper text-primary hover:border-nav hover:text-nav transition active:scale-95"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
    </button>
  );
}

export function ProductDetailClient({
  product,
  relatedProducts = [],
}: {
  product: Product;
  relatedProducts?: Product[];
}) {
  const sessionId = useSessionId();
  const captureLead = useDebouncedLeadCapture(sessionId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tab, setTab] = useState<Tab>("description");
  const [productUrl, setProductUrl] = useState("");
  const variants = product.cjVariants ?? [];
  const [selectedVid, setSelectedVid] = useState(product.cjVid || variants[0]?.vid || "");
  const selectedVariant = variants.find((v) => v.vid === selectedVid);
  const [videos, setVideos] = useState(product.videos ?? []);
  const [extraImages, setExtraImages] = useState<string[]>([]);

  useEffect(() => {
    trackProductView(product.slug);
    setProductUrl(window.location.href);
    const stored = readStoredVid(product.slug, variants);
    const nextVid = stored || product.cjVid || variants[0]?.vid || "";
    setSelectedVid(nextVid);
    if (nextVid) persistVid(product.slug, nextVid);
  }, [product.slug]);

  useEffect(() => {
    setVideos(product.videos ?? []);
    setExtraImages([]);
  }, [product.slug, product.videos]);

  useEffect(() => {
    if ((product.videos?.length ?? 0) > 0 || !product.cjPid) return;
    let cancelled = false;
    api<{ videos: NonNullable<Product["videos"]>; images?: string[] }>(
      cjStorefrontProductVideosPath(product.slug),
      { revalidate: false }
    )
      .then((data) => {
        if (cancelled) return;
        if (data.videos?.length) setVideos(data.videos);
        if (data.images?.length) setExtraImages(data.images);
      })
      .catch(() => {
        /* gallery still shows photos */
      });
    return () => {
      cancelled = true;
    };
  }, [product.slug, product.cjPid, product.videos]);

  const galleryImages = galleryForVariant(
        [...(product.images ?? []), ...extraImages.filter((url) => !(product.images ?? []).includes(url))],
        selectedVariant?.image
      );

  const summary = shortPlainDescription(catalogueDescription(product.description));
  const displayName = enquiryProductName(product.name);
  const bilingual = featuredBilingualName(displayName, product.slug);

  return (
    <>
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-12">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-10 items-start">
        <div>
          <ProductImageGallery
            key={`${product.slug}-${selectedVid}`}
            images={galleryImages}
            videos={videos}
            alt={selectedVariant ? `${product.name} — ${variantLabel(selectedVariant)}` : product.name}
          />
        </div>

        <div className="min-w-0">
          <h1 className="spice-heading text-3xl sm:text-4xl leading-tight">{displayName}</h1>
          {bilingual ? (
            <p className="mt-2 text-base sm:text-lg text-muted" lang="ar" dir="rtl">
              {bilingual.english} — {bilingual.arabic}
            </p>
          ) : null}

          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm border-y border-[#e6d5bc] py-4">
            <dt className="text-muted">Brand Name</dt>
            <dd className="font-medium text-primary">{BRAND_NAME}</dd>
            <dt className="text-muted">Product Type</dt>
            <dd className="font-medium text-primary">{productTypeLabel(product.categorySlug)}</dd>
            <dt className="text-muted">Origin</dt>
            <dd className="font-medium text-primary">{PRODUCT_ORIGIN}</dd>
          </dl>

          <p className="mt-4 text-sm sm:text-base text-[#4a3a30] leading-relaxed">{summary}</p>

          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2" aria-label="Product information">
            {PRODUCT_INFO_BADGES.map((badge) => (
              <li
                key={badge.title}
                className="rounded-lg border border-[#e6d5bc] bg-[#fffaf3] px-3 py-3 min-w-0"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fff6ee] text-nav">
                  {badge.icon}
                </span>
                <p className="mt-2 text-sm font-semibold text-primary leading-snug">{badge.title}</p>
                <p className="mt-0.5 text-xs text-muted leading-snug">{badge.copy}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="min-w-0 flex-1">
              <EnquireNowLink productName={displayName} className="btn-primary w-full justify-center min-h-12" />
            </div>
            <div className="flex shrink-0 items-stretch gap-2">
              <WishlistButton product={product} variant="toolbar" />
              {productUrl ? <ShareButton title={product.name} url={productUrl} /> : <div className="w-11 shrink-0" />}
            </div>
          </div>

          <ul
            className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#e6d5bc] pt-4 text-xs sm:text-sm text-muted"
            aria-label="Catalogue notes"
          >
            {PRODUCT_TRUST_STRIP.map((item, index) => (
              <li key={item} className="flex items-center gap-4">
                {index > 0 ? (
                  <span className="hidden text-[#dcc9a8] sm:inline" aria-hidden>
                    •
                  </span>
                ) : null}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="mt-10 pt-8 border-t border-slate-200">
        <div className="flex gap-6 border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setTab("description")}
            className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === "description"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-primary"
            }`}
          >
            Description
          </button>
          <button
            type="button"
            onClick={() => setTab("reviews")}
            className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === "reviews"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-primary"
            }`}
          >
            Reviews
          </button>
          <button
            type="button"
            onClick={() => setTab("faq")}
            className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === "faq"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-primary"
            }`}
          >
            FAQ
          </button>
        </div>

        {tab === "description" ? (
          <div className="space-y-8">
            <article className="text-slate-700 leading-relaxed space-y-4 max-w-4xl">
              {(looksLikeHtml(product.description) ? stripHtml(catalogueDescription(product.description)) : catalogueDescription(product.description))
                .split(/(?<=\.)\s+/)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </article>

            <div className="max-w-md space-y-3">
              <LeadCaptureInput
                label="Your name (helps us assist you)"
                placeholder="Start typing your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onDebouncedChange={(value) =>
                  captureLead({
                    name: value,
                    email: email || undefined,
                    phone: phone || undefined,
                    page: `/products/${product.slug}`,
                    productSlug: product.slug,
                    source: "product",
                  })
                }
              />
              <LeadCaptureInput
                label="Email (optional — for enquiry updates)"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onDebouncedChange={(value) =>
                  captureLead({
                    name: name || undefined,
                    email: value,
                    phone: phone || undefined,
                    page: `/products/${product.slug}`,
                    productSlug: product.slug,
                    source: "product",
                  })
                }
              />
              <LeadCaptureInput
                label="Phone (optional — WhatsApp support)"
                placeholder="+1 555 000 0000"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onDebouncedChange={(value) =>
                  captureLead({
                    name: name || undefined,
                    email: email || undefined,
                    phone: value,
                    page: `/products/${product.slug}`,
                    productSlug: product.slug,
                    source: "product",
                  })
                }
              />
            </div>

            {relatedProducts.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-primary mb-4">You might also like</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
                  {relatedProducts.map((p) => (
                    <HomeProductCard key={p.slug} product={p} />
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-2xl">
              <h3 className="text-sm font-bold text-primary mb-3">Common questions</h3>
              <dl className="space-y-4">
                {productPageFaqs.map((f) => (
                  <div key={f.q}>
                    <dt className="font-semibold text-slate-800 text-sm">{f.q}</dt>
                    <dd className="text-sm text-slate-600 mt-1 leading-relaxed">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : tab === "reviews" ? (
          <div className="space-y-4">
            <ApprovedReviewList productSlug={product.slug} productName={product.name} />
          </div>
        ) : (
          <dl className="space-y-5 max-w-2xl">
            {productPageFaqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-slate-900">{f.q}</dt>
                <dd className="text-slate-600 mt-2 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-[#e6d5bc] bg-paper p-3 md:hidden">
      <EnquireNowLink productName={displayName} className="btn-primary w-full justify-center" />
    </div>
    </>
  );
}
