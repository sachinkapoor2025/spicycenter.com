import { isStorefrontVisibleProduct, type Category, type Product } from "@spicycorner/shared";
import { loadSpiceCatalogFile } from "@/lib/spice-data";
import { spiceStockImagesForProduct } from "@/lib/spice-stock-images";
import { catalogueDescription, collapseToOneEnquiryProduct, enquiryProductKey, enquiryProductName } from "@/lib/catalogue";

let cachedCategories: Category[] | null = null;
let cachedRawProducts: Product[] | null = null;
let cachedProducts: Product[] | null = null;

function loadCatalogFile(): { categories: Category[]; products: Product[] } {
  return loadSpiceCatalogFile();
}

function presentCatalogProduct(product: Product): Product {
  return {
    ...product,
    name: enquiryProductName(product.name),
    description: catalogueDescription(product.description),
    seoDescription: product.seoDescription ? catalogueDescription(product.seoDescription) : product.seoDescription,
    images: spiceStockImagesForProduct(product),
  };
}

function rawCatalogProducts(): Product[] {
  if (cachedRawProducts) return cachedRawProducts;
  cachedRawProducts = (loadCatalogFile().products ?? [])
    .filter(isStorefrontVisibleProduct)
    .filter((p) => !p.tags?.includes("channel:retail"))
    .map(presentCatalogProduct);
  return cachedRawProducts;
}

export function getCatalogProducts(): Product[] {
  if (cachedProducts) return cachedProducts;
  cachedProducts = collapseToOneEnquiryProduct(rawCatalogProducts());
  return cachedProducts;
}

export function getCatalogCategories(): Category[] {
  if (cachedCategories) return cachedCategories;
  cachedCategories = loadCatalogFile().categories ?? [];
  return cachedCategories;
}

export function getCatalogProduct(slug: string): Product | undefined {
  const listed = getCatalogProducts().find((p) => p.slug === slug);
  if (listed) return listed;
  const source = rawCatalogProducts().find((p) => p.slug === slug);
  if (!source) return undefined;
  const key = enquiryProductKey(source);
  return getCatalogProducts().find((p) => enquiryProductKey(p) === key) ?? source;
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
