import Image from "next/image";
import Link from "next/link";
import { site, navItems, STORE_LOCATIONS } from "@/lib/site";
import { PaymentMethodIcons } from "@/components/PaymentMethodIcons";
import { SiteLogoLink } from "@/components/SiteLogo";

const shopLinks = navItems.filter((n) => n.href !== "/about");

export function Footer() {
  return (
    <div className="mt-auto">
      <section className="bg-[#f3eadc] border-t border-[#eadfce]">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-start gap-3 flex-1">
            <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nav text-white" aria-hidden>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <p className="font-serif text-xl text-primary">Join the SpicyCorner family</p>
              <p className="text-sm text-muted mt-1">Harvest notes, new packs and spice tips for UK and European kitchens.</p>
            </div>
          </div>
          <form action="/contact" className="flex w-full md:w-auto gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="Enter your email address"
              className="flex-1 md:w-72 rounded-full border border-[#dcc9a8] bg-white px-4 py-2.5 text-sm text-primary"
            />
            <button type="submit" className="rounded-full bg-nav px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#a74c1e]">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      <footer className="bg-primary text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12">
          <div className="lg:col-span-8 px-4 py-10 sm:py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
              <div className="col-span-2 md:col-span-1">
                <SiteLogoLink size="desktop" className="mb-4 bg-white rounded-lg px-1.5 py-1 inline-block" />
                <p className="text-white/75 leading-relaxed text-[13px]">
                  Authentic Indian Spices — Retail &amp; Bulk Supply. From farms in India to kitchens in the UK and Europe.
                </p>
                <div className="flex gap-3 mt-4 text-white/70">
                  {["f", "ig", "yt"].map((id) => (
                    <span key={id} className="h-8 w-8 rounded-full border border-white/20 inline-flex items-center justify-center text-[11px] uppercase">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-3">Shop</p>
                <ul className="space-y-2 text-white/75">
                  {shopLinks.map((n) => (
                    <li key={n.href}>
                      <Link href={n.href} className="hover:text-white">{n.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-3">Help &amp; Support</p>
                <ul className="space-y-2 text-white/75">
                  <li><Link href="/legal/food-information" className="hover:text-white">Food information</Link></li>
                  <li><Link href="/legal/allergens" className="hover:text-white">Allergens</Link></li>
                  <li><Link href="/legal/shipping" className="hover:text-white">Shipping</Link></li>
                  <li><Link href="/legal/returns" className="hover:text-white">Returns</Link></li>
                  <li><Link href="/legal/privacy" className="hover:text-white">Privacy</Link></li>
                  <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                  <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-3">Our Stores</p>
                <ul className="space-y-4 text-white/75">
                  {STORE_LOCATIONS.map((store) => (
                    <li key={store.id}>
                      <p className="text-white font-medium">
                        {store.flag} {store.country === "United Kingdom" ? "United Kingdom" : "India"}
                      </p>
                      <p className="text-[13px] mt-0.5">
                        {store.id === "in" ? "Ferozepur City, Punjab" : "Southampton, UK"}
                      </p>
                      <a href={store.mapUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-white/60 hover:text-white">
                        View on map
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 relative min-h-[240px]">
            <Image
              src="/images/footer-spices.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 33vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/20 to-primary/40" />
            <p className="absolute inset-0 flex items-center justify-center font-serif italic text-2xl md:text-3xl text-white drop-shadow-lg px-6 text-center">
              Spices Connect People
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-white/50">
            <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
            <PaymentMethodIcons />
            <p className="flex gap-3">
              <Link href="/uk" className="hover:text-white">UK</Link>
              <Link href="/eu" className="hover:text-white">Europe</Link>
              <Link href="/legal/terms" className="hover:text-white">Terms</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
