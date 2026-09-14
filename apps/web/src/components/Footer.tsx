import Image from "next/image";
import Link from "next/link";
import { SOCIAL_LINKS } from "@spicycorner/shared";
import { site, STORE_LOCATIONS, whatsappChatUrl } from "@/lib/site";
import { PaymentMethodIcons } from "@/components/PaymentMethodIcons";
import { SiteLogoLink } from "@/components/SiteLogo";
import { FooterNewsletterForm } from "@/components/FooterNewsletterForm";

const shopLinks = [
  { href: "/spices", label: "Spices" },
  { href: "/indian-spice-regions", label: "Indian Spices" },
  { href: "/spices/indian-masalas", label: "Masalas" },
  { href: "/wholesale", label: "Bulk & Wholesale" },
  { href: "/recipes", label: "Recipes" },
  { href: "/spice-guide", label: "Spice Guide" },
  { href: "/spice-market-prices", label: "Spice Market Prices" },
] as const;

const stores = [...STORE_LOCATIONS].sort((a, b) => Number(a.id === "uk") - Number(b.id === "uk"));

export function Footer() {
  return (
    <div className="mt-auto">
      <section className="relative overflow-hidden border-t border-[#e6d5bc]">
        <Image src="/images/footer-spices.jpg" alt="" fill className="object-cover object-center" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f3eadc] via-[#f3eadc]/88 to-[#f3eadc]/55" />
        <div className="relative max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <p className="spice-kicker">The spice kitchen list</p>
            <h2 className="font-serif text-3xl text-primary mt-2">Join the SpicyCenter Family</h2>
            <p className="text-sm text-muted mt-2 max-w-xl">
              Get spice arrivals, recipes and flavour inspiration — harvest notes for UK and European kitchens.
            </p>
          </div>
          <FooterNewsletterForm />
        </div>
      </section>

      <footer className="relative text-white overflow-hidden bg-primary">
        <Image
          src="/images/footer-spices.jpg"
          alt=""
          fill
          className="object-cover object-[70%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1f140c] via-[#2c1810]/92 to-[#2c1810]/45" />

        <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-8">
          <p className="text-center text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.28em] uppercase text-accent/90 mb-10 px-2">
            Cinnamon · Cardamom · Pepper · Chilli · Turmeric
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
            <div className="col-span-2 lg:col-span-1">
              <SiteLogoLink size="desktop" className="mb-4 bg-paper rounded-md px-1.5 py-1 inline-block" />
              <p className="font-serif italic text-accent text-lg leading-snug">King of Every Kitchen</p>
              <p className="text-white/75 leading-relaxed mt-3 text-[13px]">
                Authentic Indian spices — retail packs and 10kg+ wholesale. From farms in India to kitchens in the UK and Europe.
              </p>
              <div className="flex flex-wrap gap-3 mt-5 text-white/70">
                {(
                  [
                    { href: SOCIAL_LINKS.facebook, label: "Facebook", short: "f" },
                    { href: SOCIAL_LINKS.instagram, label: "Instagram", short: "ig" },
                    { href: SOCIAL_LINKS.pinterest, label: "Pinterest", short: "pin" },
                    { href: SOCIAL_LINKS.youtube, label: "YouTube", short: "yt" },
                    { href: SOCIAL_LINKS.linkedin, label: "LinkedIn", short: "in" },
                  ] as const
                ).map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="h-8 min-w-8 px-2 rounded-md border border-white/25 inline-flex items-center justify-center text-[11px] uppercase hover:bg-white/10 hover:text-white"
                  >
                    {item.short}
                  </a>
                ))}
                <a
                  href={whatsappChatUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-md border border-white/25 inline-flex items-center justify-center text-[11px] uppercase hover:bg-white/10 hover:text-white"
                >
                  WhatsApp
                </a>
              </div>
            </div>
            <div>
              <p className="font-serif text-lg mb-3">Shop</p>
              <ul className="space-y-2 text-white/75">
                {shopLinks.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="hover:text-white">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-serif text-lg mb-3">Help &amp; Support</p>
              <ul className="space-y-2 text-white/75">
                <li><Link href="/legal/food-information" className="hover:text-white">Food information</Link></li>
                <li><Link href="/legal/allergens" className="hover:text-white">Allergens</Link></li>
                <li><Link href="/legal/shipping" className="hover:text-white">Shipping</Link></li>
                <li><Link href="/legal/returns" className="hover:text-white">Returns</Link></li>
                <li><Link href="/legal/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/about" className="hover:text-white">About</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-serif text-lg mb-3">Our Stores</p>
              <ul className="space-y-4 text-white/75">
                {stores.map((store) => (
                  <li key={store.id}>
                    <p className="text-white font-medium">
                      {store.flag} {store.country}
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

          <p className="font-serif italic text-center text-xl md:text-2xl text-accent mt-12">
            Good food starts with great spices
          </p>
        </div>

        <div className="relative border-y border-white/15 bg-primary/40">
          <p className="text-center text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.28em] uppercase text-white/55 py-3 px-2">
            Chilli · Pepper · Cinnamon · Cardamom · Herbs
          </p>
        </div>

        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 py-4 pb-24 md:pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-white/55">
            <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
            <p className="font-serif italic text-accent/90 text-sm">Good Food · Better Tomorrow</p>
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
