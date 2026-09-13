"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  parseStorefrontListingSort,
  sortStorefrontListing,
  type StorefrontListingSort,
} from "@spicycorner/shared";

export type ProductSort = StorefrontListingSort;

const OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A → Z" },
  { value: "name-desc", label: "Name: Z → A" },
];

export function ProductSortBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = parseStorefrontListingSort(searchParams.get("sort") ?? undefined);

  const onChange = (sort: ProductSort) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "featured") params.delete("sort");
    else params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="product-sort" className="text-sm text-slate-600 whitespace-nowrap">
        Sort by
      </label>
      <select
        id="product-sort"
        value={current}
        onChange={(e) => onChange(e.target.value as ProductSort)}
        className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function sortProducts<T extends { name: string; price: number }>(
  products: T[],
  sort: ProductSort
): T[] {
  return sortStorefrontListing(products, sort);
}
