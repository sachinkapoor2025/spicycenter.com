import Image from "next/image";
import Link from "next/link";
import { EnquireNowButton } from "@/components/EnquireNowButton";
import type { FeaturedHomepageSpice } from "@/lib/featured-homepage-spices";

export function FeaturedProducts({ items }: { items: FeaturedHomepageSpice[] }) {
  if (items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <div className="text-center mb-8">
        <p className="spice-kicker">Featured spices</p>
        <h2 className="font-serif text-2xl sm:text-3xl text-primary mt-2">Main spices from our collection</h2>
        <p className="text-muted mt-2 max-w-2xl mx-auto text-sm sm:text-base">
          A short list of the spices we are asked for most often. Enquire for retail packs or bulk supply.
        </p>
      </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <article key={item.slug} className="card-spice overflow-hidden flex flex-col h-full">
            <Link href={item.href} className="relative block aspect-square bg-beige">
              <Image
                src={item.image}
                alt={item.englishName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (min-width: 1024px) 20vw, 50vw"
              />
            </Link>
            <div className="p-4 flex flex-col flex-1">
              <Link href={item.href}>
                <h3 className="font-serif text-lg text-primary leading-tight hover:text-nav">{item.englishName}</h3>
                {item.arabicName ? (
                  <p className="text-sm text-earth mt-0.5" dir="rtl" lang="ar">
                    {item.arabicName}
                  </p>
                ) : null}
              </Link>
              <p className="text-sm text-muted mt-2 line-clamp-3 flex-1">{item.description}</p>
              <div className="mt-4">
                <EnquireNowButton productName={item.englishName} variant="card" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
