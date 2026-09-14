import { isStorefrontVisibleProduct, type Category, type Product } from "@spicycorner/shared";
import { loadSpiceCatalogFile } from "@/lib/spice-data";
import { spiceStockImagesForProduct } from "@/lib/spice-stock-images";

let cachedCategories: Category[] | null = null;
let cachedProducts: Product[] | null = null;

function loadCatalogFile(): { categories: Category[]; products: Product[] } {
  return loadSpiceCatalogFile();
}

export function getCatalogProducts(): Product[] {
  if (cachedProducts) return cachedProducts;
  cachedProducts = (loadCatalogFile().products ?? [])
    .filter(isStorefrontVisibleProduct)
    .map((p) =>
      p.images?.length
        ? p
        : { ...p, images: spiceStockImagesForProduct(p) }
    );
  return cachedProducts;
}

export function getCatalogCategories(): Category[] {
  if (cachedCategories) return cachedCategories;
  cachedCategories = loadCatalogFile().categories ?? [];
  return cachedCategories;
}

export function getCatalogProduct(slug: string): Product | undefined {
  return getCatalogProducts().find((p) => p.slug === slug);
}

export function getCatalogCategory(slug: string): Category | undefined {
  return getCatalogCategories().find((c) => c.slug === slug);
}

export function getCatalogProductsByCategory(categorySlug: string): Product[] {
  return getCatalogProducts().filter(
    (p) => p.categorySlug === categorySlug || p.additionalCategorySlugs?.includes(categorySlug)
  );
}

export { categorySlugVariants } from "@spicycorner/shared";
