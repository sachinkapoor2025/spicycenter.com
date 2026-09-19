"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist-context";
import { ProductImage } from "@/components/ProductImage";
import { EnquireNowButton } from "@/components/EnquireNowButton";

export function WishlistPageClient() {
  const { items, remove } = useWishlist();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-primary mb-3">Wish Lists</h1>
        <p className="text-slate-600 mb-6">Your saved spice items will appear here. Tap the heart on any product to save it.</p>
        <Link href="/products" className="text-nav font-semibold hover:underline">
          Browse spice collection →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-primary mb-2">Wish Lists</h1>
      <p className="text-slate-600 mb-8">{items.length} saved {items.length === 1 ? "item" : "items"}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
            <div
              key={item.slug}
              className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow relative flex flex-col"
            >
              <div className="relative aspect-square bg-slate-50">
                <button
                  type="button"
                  onClick={() => remove(item.slug)}
                  className="absolute top-2 right-2 z-20 p-1"
                  aria-label="Remove from wishlist"
                >
                  <svg className="w-6 h-6 text-accent drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
                <Link href={`/products/${item.slug}`} className="block w-full h-full">
                  {item.image ? (
                    <ProductImage src={item.image} alt={item.name} variant="card" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No image</div>
                  )}
                </Link>
              </div>
              <Link href={`/products/${item.slug}`} className="block p-3 flex-1">
                <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 min-h-[2.5rem] hover:text-nav">
                  {item.name}
                </h3>
              </Link>
              <div className="px-3 pb-3">
                <EnquireNowButton productName={item.name} variant="card" />
              </div>
            </div>
        ))}
      </div>
    </div>
  );
}
