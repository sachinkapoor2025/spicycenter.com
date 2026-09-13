import Link from "next/link";
import type { Product } from "@spicycorner/shared";

/** SEO internal links from category pages to individual product URLs. */
export function CategoryProductLinks({
  products,
  categoryName,
  total,
}: {
  products: Product[];
  categoryName: string;
  total?: number;
}) {
  if (products.length === 0) return null;

  const listed = products.slice(0, 24);
  const catalogTotal = total ?? products.length;

  return (
    <section className="mt-10 pt-8 border-t border-slate-200" aria-labelledby="category-product-links">
      <h2 id="category-product-links" className="text-xl font-bold text-primary mb-2">
        Shop {categoryName}
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        Jump to individual product pages for photos, pricing, and a destination shipping quote.
        {catalogTotal > listed.length ? ` Showing ${listed.length} of ${catalogTotal} items.` : ""}
      </p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        {listed.map((product) => (
          <li key={product.slug}>
            <Link
              href={`/products/${product.slug}`}
              className="text-nav font-medium hover:underline leading-snug"
            >
              {product.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
