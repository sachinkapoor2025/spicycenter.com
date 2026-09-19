import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { ProductSpiceStory } from "@/components/ProductSpiceStory";
import { ProductDetailClient } from "./ProductDetailClient";
import { breadcrumbJsonLd, faqJsonLd, productJsonLd, productPageMetadata } from "@/lib/seo";
import { productPageFaqs } from "@/lib/content/product-faqs";
import { resolveImageUrl } from "@/lib/images";
import { loadProduct, loadRelatedProducts, getStaticProductSlugs } from "@/lib/product-loader";
import { api } from "@/lib/api";
import { cjStorefrontProductsPath, getInternalLinkGroups, type Product } from "@spicycorner/shared";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Product images can be changed from admin and should appear on the storefront immediately. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateStaticParams() {
  const slugs = getStaticProductSlugs();
  if (slugs.length > 0) {
    return slugs.map((slug) => ({ slug }));
  }
  try {
    const data = await api<{ products: Product[] }>(cjStorefrontProductsPath(), { revalidate: 3600 });
    return data.products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadProduct(slug);
  if (!p) return { title: "Product" };

  return productPageMetadata({
    title: p.seoTitle ?? `${p.name} — Indian spices UK & EU`,
    seoDescription: p.seoDescription,
    description: p.description,
    path: `/products/${slug}`,
    ogImage: resolveImageUrl(p.images?.[0]),
    keywords: [p.name, p.sku, ...(p.tags ?? []), "Indian spices UK", "SpicyCenter"].filter(Boolean).join(", "),
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const relatedProducts = await loadRelatedProducts(product.categorySlug, product.slug);

  const categoryLabel = product.categorySlug.replace(/-/g, " ");
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Spices", href: "/spices" },
    { label: categoryLabel, href: `/categories/${product.categorySlug}` },
    { label: product.name },
  ];

  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href ?? `/products/${slug}` }))),
          faqJsonLd(productPageFaqs),
        ]}
      />
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Breadcrumbs items={crumbs} />
      </div>
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
      <ProductSpiceStory product={product} />
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <InternalLinksSection
          groups={getInternalLinkGroups({
            type: "product",
            categorySlug: product.categorySlug,
            productSlug: product.slug,
            availableCountryCodes: product.availableCountryCodes,
          })}
          title="Keep exploring"
          intro="Related collections, destination pages, and spice guides — without repeating this product URL."
        />
      </div>
    </>
  );
}
