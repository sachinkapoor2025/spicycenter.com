import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { Suspense } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { SearchTracker } from "@/components/SearchTracker";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import type { Product, Category } from "@spicycorner/shared";
import { homeCategoryOrder, orderCategories } from "@/lib/site";
import { getCatalogCategories } from "@/lib/catalog-fallback";
import { HomepageCategorySections } from "@/components/HomepageCategorySections";
import { loadStorefrontListing } from "@/lib/product-loader";
import {
  parseStorefrontListingSort,
  getInternalLinkGroups,
  HOMEPAGE_CATEGORY_PREVIEW_LIMIT,
} from "@spicycorner/shared";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ search?: string; category?: string; sort?: string }>;
}

const CATEGORY_SEO: Record<string, { title: string; description: string }> = {
  "whole-spices": {
    title: "Whole Indian spices",
    description: "Whole seeds, pods and bark — cumin, pepper, cardamom and more.",
  },
  "ground-spices": {
    title: "Ground Indian spices",
    description: "Freshly catalogued powders including turmeric, chilli and coriander.",
  },
  "indian-chillies": {
    title: "Indian chillies",
    description: "Named Indian chilli varieties in whole, flake and powder form.",
  },
  "indian-masalas": {
    title: "Indian masalas",
    description: "Blends such as garam masala, sambar powder and chai masala.",
  },
  "bulk-spices": {
    title: "Bulk Indian spices",
    description: "10kg minimum wholesale packs for kitchens and trade.",
  },
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  if (params.search) {
    return pageMetadata({
      title: `Search: ${params.search} — SpicyCenter`,
      description: `Search results for "${params.search}" — spice products from SpicyCenter.`,
      path: "/products",
      noIndex: true,
    });
  }
  if (params.category && CATEGORY_SEO[params.category]) {
    const seo = CATEGORY_SEO[params.category];
    return pageMetadata({
      title: seo.title,
      description: seo.description,
      path: `/categories/${params.category}`,
      noIndex: true,
    });
  }
  if (params.category) {
    return pageMetadata({
      title: "Shop Indian spices",
      description: "Browse whole spices, powders, chillies, masalas and bulk packs.",
      path: "/products",
      noIndex: true,
    });
  }
  return pageMetadata({
    title: "Shop Indian spices — retail and bulk",
    description:
      "Browse Indian spices in retail packs and 10kg+ bulk. Search jeera, botanical names and 25kg.",
    path: "/products",
  });
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search;
  const category = params.category;
  const sort = parseStorefrontListingSort(params.sort);
  const showGrouped = !search && !category;

  let products: Product[] = [];
  let total = 0;
  let hasMore = false;
  let categories: Category[] = [];

  try {
    const categoriesData = await api<{ categories: Category[] }>("/categories");
    categories = categoriesData.categories;
  } catch {
    categories = [];
  }

  if (categories.length === 0) {
    categories = getCatalogCategories();
  }

  if (!showGrouped) {
    const listing = await loadStorefrontListing({
      ...(category ? { category } : {}),
      ...(search ? { search } : {}),
      sort,
    });
    products = listing.products;
    total = listing.total;
    hasMore = listing.hasMore;
  }

  const h1 = search
    ? `Search: ${search}`
    : category
      ? categories.find((c) => c.slug === category)?.name ?? category.replace(/-/g, " ")
      : "Shop spices — Send to USA";

  const sortedCategories = orderCategories(categories);
  const categoryMap = new Map(categories.map((c) => [c.slug, c]));
  const categoryPreviews = homeCategoryOrder.map((slug) => ({
    slug,
    name: categoryMap.get(slug)?.name ?? slug.replace(/-/g, " "),
  }));
  const firstCategory = showGrouped ? categoryPreviews[0] : undefined;
  const firstCategoryProducts = firstCategory
    ? (
        await loadStorefrontListing({
          category: firstCategory.slug,
          limit: HOMEPAGE_CATEGORY_PREVIEW_LIMIT,
        })
      ).products
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {search ? <SearchTracker query={search} resultCount={total} /> : null}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...(category ? [{ label: h1 }] : [{ label: "Shop" }]),
        ]}
      />
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-primary">{h1}</h1>
      </div>
      {!search && !category && (
        <p className="text-slate-600 mb-8 max-w-2xl">
          Browse Indian spices — whole, ground, chillies, masalas, and bulk packs.
          Open a product page for a shipping quote to your destination.
        </p>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/products"
            className={`px-3 py-1 rounded-full text-sm border ${!category ? "bg-nav text-white border-nav" : "border-slate-300 hover:border-nav"}`}
          >
            All
          </Link>
          {sortedCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className={`px-3 py-1 rounded-full text-sm border ${category === c.slug ? "bg-nav text-white border-nav" : "border-slate-300 hover:border-nav"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 && !showGrouped ? (
        <p className="text-slate-600">No products found. Try another category or search term.</p>
      ) : showGrouped ? (
        <HomepageCategorySections
          categories={categoryPreviews}
          contained
          eagerCount={1}
          initialBySlug={
            firstCategory ? { [firstCategory.slug]: firstCategoryProducts } : undefined
          }
        />
      ) : (
        <Suspense fallback={<p className="text-slate-500">Loading products…</p>}>
          <ProductGrid
            products={products}
            total={total}
            hasMore={hasMore}
            category={category}
            search={search}
            sort={sort}
          />
        </Suspense>
      )}

      <InternalLinksSection
        groups={getInternalLinkGroups({ type: "listing" })}
        title="Explore spice"
        intro="Shop by category, destination, or planning guide."
      />
    </div>
  );
}
