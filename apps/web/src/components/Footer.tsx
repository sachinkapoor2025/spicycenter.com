import Link from "next/link";
import { site, navItems, regionLinks, faqs } from "@/lib/site";
import { PaymentMethodIcons } from "@/components/PaymentMethodIcons";
import { SiteLogoLink } from "@/components/SiteLogo";
import { MarketContactBlock } from "@/components/MarketContactBlock";

export function Footer() {
  return (
    <footer className="border-t border-amber-100 bg-primary text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 text-sm">
          <div className="col-span-2 lg:col-span-1">
            <SiteLogoLink size="desktop" className="mb-5 brightness-0 invert" />
            <p className="text-white/80 leading-relaxed mb-4 max-w-xs">{site.tagline}. Indian spice shop plus encyclopaedia — not a generic storefront.</p>
            <MarketContactBlock />
          </div>
          <div>
            <p className="font-semibold mb-3">Shop</p>
            <ul className="space-y-2 text-white/80">
              {navItems.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="hover:text-white hover:underline">{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Help &amp; legal</p>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/legal/food-information" className="hover:underline">Food information</Link></li>
              <li><Link href="/legal/allergens" className="hover:underline">Allergens</Link></li>
              <li><Link href="/legal/shipping" className="hover:underline">Shipping</Link></li>
              <li><Link href="/legal/returns" className="hover:underline">Returns</Link></li>
              <li><Link href="/legal/privacy" className="hover:underline">Privacy</Link></li>
              <li><Link href="/legal/terms" className="hover:underline">Terms</Link></li>
              <li><Link href="/spice-finder" className="hover:underline">Spice Finder</Link></li>
              <li><Link href="/contact" className="hover:underline">Contact</Link></li>
              <li><Link href="/faq" className="hover:underline">FAQ</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/15">
          <p className="font-semibold mb-3">Indian spice regions</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-white/80">
            {regionLinks.map((c) => (
              <li key={c.slug}>
                <Link href={`/indian-spice-regions/${c.slug}`} className="hover:underline">{c.label}</Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-white/60 text-xs max-w-2xl">{faqs[1].a}</p>
        </div>
        <div className="mt-10 pt-8 border-t border-white/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PaymentMethodIcons />
          <p className="text-xs text-white/50 max-w-md">Product price, shipping, VAT and customs duty are shown separately. Indicative Indian market prices are not your purchase cost.</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-5 text-xs text-white/50 flex flex-wrap gap-3 justify-between">
          <p>© {new Date().getFullYear()} {site.name} · {site.domain}</p>
          <p className="flex gap-3">
            <Link href="/llms.txt" className="underline">llms.txt</Link>
            <Link href="/uk" className="underline">UK</Link>
            <Link href="/eu" className="underline">EU</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
