"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddToCartControl } from "@/components/AddToCartControl";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { api } from "@/lib/api";
import { WishlistButton } from "@/components/WishlistButton";
import { AssistantPromo } from "@/components/assistant/AssistantPromo";
import { TrustBadges } from "@/components/TrustBadges";
import { ProductReviewsPreview } from "@/components/ProductReviewsPreview";
import { StickyAddToCartBar } from "@/components/StickyAddToCartBar";
import { useSessionId, useDebouncedLeadCapture } from "@/lib/session";
import { trackProductView } from "@/lib/track";
import { CurrencySelect } from "@/components/CurrencySelect";
import { useCurrency } from "@/lib/currency-context";
import { getDiscountPercent } from "@/lib/pricing";
import { LeadCaptureInput } from "@/components/LeadCaptureInput";
import { HomeProductCard } from "@/components/HomeProductCard";
import { useCart } from "@/lib/cart-context";
import { productPageFaqs } from "@/lib/content/product-faqs";
import { testimonials } from "@/lib/site";
import { looksLikeHtml, stripHtml, shortPlainDescription } from "@/lib/html-text";
import {
  LOW_STOCK_THRESHOLD,
  cjStorefrontProductVideosPath,
  getUnitsSold,
  isFastSelling,
  type Product,
} from "@spicycorner/shared";
import { ProductShippingPanel } from "@/components/ProductShippingPanel";
import { FastSellingBanner } from "@/components/FastSellingBadge";

type Tab = "description" | "reviews" | "faq";

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
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded border-2 border-nav bg-white text-nav hover:bg-orange-50 transition active:scale-95"
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
  const { cart, itemCount } = useCart();
  const { format } = useCurrency();
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

  const selectVariant = (vid: string) => {
    setSelectedVid(vid);
    persistVid(product.slug, vid);
  };

  const galleryImages = galleryForVariant(
        [...(product.images ?? []), ...extraImages.filter((url) => !(product.images ?? []).includes(url))],
        selectedVariant?.image
      );

  const displayPrice = selectedVariant?.price ?? product.price;
  const hamperBase = selectedVariant?.price ?? product.price;
  const price = format(displayPrice, product.currency);
  const comparePrice =
    product.compareAtPrice && product.compareAtPrice > hamperBase
      ? format(product.compareAtPrice, product.currency)
      : null;
  const discount = getDiscountPercent(hamperBase, product.compareAtPrice);
  const summary = shortPlainDescription(product.description);
  const cartQuantity = cart?.items.find((i) => i.productSlug === product.slug)?.quantity ?? 0;
  const inCart = cartQuantity > 0;
  const lowStock = product.inventory > 0 && product.inventory <= LOW_STOCK_THRESHOLD;
  const fastSelling = isFastSelling(product);
  const unitsSold = getUnitsSold(product);

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

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-3 leading-tight">{product.name}</h1>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
            {comparePrice && <span className="text-lg text-slate-400 line-through">{comparePrice}</span>}
            <span className="text-2xl sm:text-3xl font-bold text-primary">{price}</span>
            {discount !== null && (
              <span className="text-sm font-semibold text-green-600">{discount}% OFF</span>
            )}
          </div>
          <CurrencySelect variant="inline" className="mb-4" />

          <p className="text-slate-600 text-sm sm:text-base mb-3 leading-relaxed">{summary}</p>

          {fastSelling && <FastSellingBanner unitsSold={unitsSold} />}

          {lowStock && (
            <p className="text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded-md px-3 py-2 mb-3">
              Only {product.inventory} left in stock — order soon for spice delivery
            </p>
          )}

          <ProductShippingPanel price={hamperBase} currency={product.currency} />

          {variants.length > 1 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-1">Options</p>
              {selectedVariant && (
                <p className="text-xs text-slate-600 mb-2">
                  Selected:{" "}
                  <span className="font-semibold text-primary">{variantLabel(selectedVariant)}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-2" role="listbox" aria-label="Product options">
                {variants.map((v) => {
                  const active = v.vid === selectedVid;
                  const oos = (v.inventory ?? 1) <= 0;
                  const label = variantLabel(v);
                  return (
                    <button
                      key={v.vid}
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={oos}
                      onClick={() => selectVariant(v.vid)}
                      className={`flex items-center gap-2 max-w-full text-sm px-2 py-1.5 rounded-lg border-2 transition ${
                        active
                          ? "border-nav bg-orange-50 text-primary shadow-sm"
                          : "border-slate-200 text-slate-700 hover:border-slate-400 bg-white"
                      } ${oos ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {v.image ? (
                        <img
                          src={v.image}
                          alt=""
                          className="h-9 w-9 rounded object-cover shrink-0 bg-slate-100"
                        />
                      ) : null}
                      <span className="font-medium leading-snug text-left">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <TrustBadges variant="compact" className="mb-5" />
          <div className="mb-5">
            <AssistantPromo variant="product" productName={product.name} />
          </div>

          {inCart ? (
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Link
                href="/cart"
                className="flex items-center gap-2 text-green-700 hover:text-green-800 shrink-0"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-green-600 text-white">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {itemCount} {itemCount === 1 ? "item" : "items"} in cart
                </span>
              </Link>

              <div className="flex-1 min-w-[13rem] max-w-[18rem]">
                <AddToCartControl
                  productSlug={product.slug}
                  disabled={product.inventory <= 0}
                  fullWidth
                  variant="detail"
                  cjVid={selectedVid || undefined}
                />
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                <WishlistButton product={product} variant="toolbar" />
                {productUrl ? <ShareButton title={product.name} url={productUrl} /> : null}
              </div>
            </div>
          ) : (
            <div className="flex items-stretch gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <AddToCartControl
                  productSlug={product.slug}
                  disabled={product.inventory <= 0}
                  fullWidth
                  variant="detail"
                  cjVid={selectedVid || undefined}
                />
              </div>
              <WishlistButton product={product} variant="toolbar" />
              {productUrl ? <ShareButton title={product.name} url={productUrl} /> : <div className="w-12 shrink-0" />}
            </div>
          )}

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
            Reviews ({testimonials.length})
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
              {(looksLikeHtml(product.description) ? stripHtml(product.description) : product.description)
                .split(/(?<=\.)\s+/)
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </article>

            {product.tags && product.tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Related searches</p>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                label="Email (optional — for order updates)"
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
          <ProductReviewsPreview />
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
    <StickyAddToCartBar
      product={product}
      cjVid={selectedVid || undefined}
      extraUsd={0}
    />
    </>
  );
}
