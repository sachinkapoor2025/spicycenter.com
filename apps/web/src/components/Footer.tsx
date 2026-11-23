import Image from "next/image";
import Link from "next/link";
import { SOCIAL_LINKS } from "@spicycorner/shared";
import { regionLinks, site, STORE_LOCATIONS, whatsappChatUrl } from "@/lib/site";
import { SiteLogoLink } from "@/components/SiteLogo";
import { FooterNewsletterForm } from "@/components/FooterNewsletterForm";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "@/components/SocialMediaIcons";

const shopLinks = [
  { href: "/spices", label: "Spices" },
  { href: "/markets", label: "Export markets" },
  { href: "/locations", label: "Location list" },
  { href: "/food", label: "Food sourcing" },
  { href: "/guides", label: "Sourcing guides" },
  { href: "/spice-guide", label: "Spice Guide" },
  { href: "/enquiry", label: "Enquire Now" },
] as const;

const stores = [...STORE_LOCATIONS];

const spiceKnowledgeLinks = [
  { href: "/spice-guide", label: "All 88 spice guides" },
  { href: "/spice-guide/comparisons", label: "Spice comparisons" },
  { href: "/spice-guide/comparisons/kashmiri-chilli-vs-regular-chilli", label: "Kashmiri vs regular chilli" },
  { href: "/spice-guide/comparisons/garam-masala-vs-curry-powder", label: "Garam masala vs curry powder" },
  { href: "/spice-guide/comparisons/whole-spices-vs-ground-spices", label: "Whole vs ground spices" },
] as const;

const recipeLinks = [
  { href: "/recipes", label: "Recipe hub" },
  { href: "/recipes/biryani", label: "Biryani" },
  { href: "/recipes/dal-tadka", label: "Dal tadka" },
  { href: "/journal", label: "Spice journal" },
  { href: "/spice-finder", label: "Which spice should I use?" },
] as const;

const helpLinks = [
  { href: "/legal/food-information", label: "Food information" },
  { href: "/legal/allergens", label: "Allergens" },
  { href: "/legal/shipping", label: "Shipping" },
  { href: "/legal/returns", label: "Returns" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About" },
  { href: "/about#gst-certificate", label: "GST certificate" },
] as const;

const columnHeading = "font-serif text-base md:text-lg mb-1.5 md:mb-2";
const linkList = "text-white/75";
const footerLink = "inline-block py-1 leading-5 hover:text-white md:py-0.5";

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
              Spice notes for importers, distributors and commercial kitchens worldwide.
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

        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-4 md:pt-8 md:pb-6">
          <p className="text-center text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.22em] uppercase text-accent/90 mb-4 md:mb-6 px-2">
            Cinnamon · Cardamom · Pepper · Chilli · Turmeric
          </p>

          <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 text-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,0.9fr)] lg:gap-x-8 lg:gap-y-0">
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <SiteLogoLink size="desktop" className="mb-2 inline-block md:mb-3" />
              <p className="font-serif italic text-accent text-lg leading-snug">{site.tagline}</p>
              <p className="font-serif text-white text-base leading-snug mt-0.5">{site.homepageTagline}</p>
              <p className="text-white/80 text-sm">{site.homepageSubline}</p>
              <p className="font-serif italic text-accent/90 text-sm mt-0.5">{site.promise}</p>
              <p className="text-white/75 leading-snug mt-2 text-[13px] md:leading-relaxed md:mt-3">
                Indian spice catalogue. Origin: India. Worldwide delivery is arranged through enquiry for business buyers.
              </p>
              <a
                href={`mailto:${site.contactEmail}`}
                className="inline-block py-1 text-[13px] text-white/80 hover:text-white hover:underline md:mt-1"
              >
                {site.contactEmail}
              </a>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-3">
                {(
                  [
                    { href: SOCIAL_LINKS.facebook, label: "Follow SpicyCenter on Facebook", icon: FacebookIcon },
                    { href: SOCIAL_LINKS.instagram, label: "Follow SpicyCenter on Instagram", icon: InstagramIcon },
                    { href: SOCIAL_LINKS.pinterest, label: "Follow SpicyCenter on Pinterest", icon: PinterestIcon },
                    { href: SOCIAL_LINKS.youtube, label: "Follow SpicyCenter on YouTube", icon: YouTubeIcon },
                    { href: SOCIAL_LINKS.linkedin, label: "Follow SpicyCenter on LinkedIn", icon: LinkedInIcon },
                  ] as const
                ).map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="h-8 w-8 rounded-md border border-white/25 inline-flex items-center justify-center hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <item.icon />
                  </a>
                ))}
                <a
                  href={whatsappChatUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat with SpicyCenter on WhatsApp"
                  className="h-8 w-8 rounded-md border border-white/25 inline-flex items-center justify-center hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <WhatsAppIcon />
                </a>
              </div>
            </div>
            <div className="min-w-0">
              <p className={columnHeading}>Shop</p>
              <ul className={linkList}>
                {shopLinks.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className={footerLink}>
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <p className={columnHeading}>Help &amp; Support</p>
              <ul className={linkList}>
                {helpLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={footerLink}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <p className={columnHeading}>Our Stores</p>
              <ul className="space-y-2 text-white/75">
                {stores.map((store) => (
                  <li key={store.id}>
                    <p className="text-white font-medium">
                      {store.flag} {store.country}
                    </p>
                    <p className="text-[13px] mt-0.5">
                      {store.id === "in" ? "Ferozepur City, Punjab" : store.country}
                    </p>
                    <a href={store.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-1 text-[12px] text-white/60 hover:text-white md:py-0.5">
                      View on map
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 items-start gap-x-4 gap-y-4 border-t border-white/15 pt-5 text-sm md:grid-cols-3 lg:mt-6 lg:gap-x-8 lg:pt-6">
            <div className="min-w-0">
              <p className={columnHeading}>Spice knowledge</p>
              <ul className={linkList}>
                {spiceKnowledgeLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={footerLink}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <p className={columnHeading}>Recipes</p>
              <ul className={linkList}>
                {recipeLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={footerLink}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 min-w-0 md:col-span-1">
              <p className={columnHeading}>Indian spice regions</p>
              <ul className="grid grid-cols-2 gap-x-3 text-white/75 md:grid-cols-1 md:gap-x-0">
                {regionLinks.map((region) => (
                  <li key={region.slug}>
                    <Link href={`/indian-spice-regions/${region.slug}`} className={footerLink}>{region.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="font-serif italic text-center text-xl md:text-2xl text-accent mt-5 md:mt-6">
            Good food starts with great spices
          </p>
        </div>

        <div className="relative border-y border-white/15 bg-primary/40">
          <p className="text-center text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.28em] uppercase text-white/55 py-3 px-2">
            Chilli · Pepper · Cinnamon · Cardamom · Herbs
          </p>
        </div>

        <div className="relative">
          <div className="max-w-6xl mx-auto px-4 pt-3 pb-28 md:pb-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center text-xs text-white/55">
            <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
            <p className="font-serif italic text-accent/90 text-sm sm:text-center">Good Food · Better Tomorrow</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 sm:justify-end">
              <Link href="/enquiry" className="hover:text-white">Worldwide</Link>
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
