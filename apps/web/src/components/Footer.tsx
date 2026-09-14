import Link from "next/link";
import { site, navItems } from "@/lib/site";
import { PaymentMethodIcons } from "@/components/PaymentMethodIcons";
import { SiteLogoLink } from "@/components/SiteLogo";
import { StoreLocations } from "@/components/StoreLocations";

export function Footer() {
  return (
    <footer className="border-t border-amber-100 bg-primary text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 text-sm">
          <div>
            <SiteLogoLink size="desktop" className="mb-4 bg-white rounded-xl px-2 py-1 inline-block" />
            <p className="text-white/80 leading-relaxed mb-3 max-w-xs">
              {site.tagline}. Indian spices sourced from growing regions across India — retail packs and 10kg+ wholesale for UK and European kitchens.
            </p>
            <p className="text-accent font-serif italic text-base">Spices for a better tomorrow</p>
          </div>
          <div>
            <p className="font-semibold mb-3 tracking-wide">Shop</p>
            <ul className="space-y-2 text-white/80">
              {navItems.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="hover:text-white hover:underline">{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3 tracking-wide">Help &amp; Support</p>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/legal/food-information" className="hover:underline">Food information</Link></li>
              <li><Link href="/legal/allergens" className="hover:underline">Allergens</Link></li>
              <li><Link href="/legal/shipping" className="hover:underline">Shipping</Link></li>
              <li><Link href="/legal/returns" className="hover:underline">Returns</Link></li>
              <li><Link href="/legal/privacy" className="hover:underline">Privacy</Link></li>
              <li><Link href="/faq" className="hover:underline">FAQ</Link></li>
              <li><Link href="/spice-finder" className="hover:underline">Spice Finder</Link></li>
              <li><Link href="/contact" className="hover:underline">Contact</Link></li>
            </ul>
          </div>
          <div>
            <StoreLocations variant="dark" />
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-white/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PaymentMethodIcons />
          <p className="text-xs text-white/50 max-w-md">Product price, shipping, VAT and customs duty are shown separately. Indicative Indian market prices are not your purchase cost.</p>
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#1a0e0a]">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-white/50 flex flex-wrap gap-3 justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p className="flex gap-3">
            <Link href="/uk" className="hover:text-white">UK</Link>
            <Link href="/eu" className="hover:text-white">Europe</Link>
            <Link href="/legal/terms" className="hover:text-white">Terms</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
