"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { navItems, regionLinks } from "@/lib/site";
import { SearchBar } from "@/components/SearchBar";
import { SiteLogoLink } from "@/components/SiteLogo";
import { CountrySelector } from "@/components/CountrySelector";
import { QuoteRibbon } from "@/components/QuoteRibbon";
import { EnquireNowButton } from "@/components/EnquireNowButton";
import { useEnquiry } from "@/lib/enquiry-context";

function RegionsMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
          open ? "bg-nav text-white" : "text-primary hover:bg-nav hover:text-white"
        }`}
      >
        Regions
        <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[90]" aria-label="Close regions menu" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-[100] mt-1 min-w-[220px] max-h-[min(70vh,360px)] overflow-y-auto rounded-md border border-[#e6d5bc] bg-paper py-1 shadow-card">
            {regionLinks.map((c) => (
              <Link
                key={c.slug}
                href={`/indian-spice-regions/${c.slug}`}
                className="block px-4 py-2.5 text-sm text-earth hover:bg-beige hover:text-nav whitespace-nowrap"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BurgerIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function AccountLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/account" className={`p-2 text-primary hover:text-nav ${className}`} aria-label="Account">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </Link>
  );
}

function WishlistLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/wishlist" className={`p-2 text-primary hover:text-nav ${className}`} aria-label="Wishlist">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </Link>
  );
}


function DesktopHeaderAction({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 px-3 text-primary hover:text-nav min-w-[4.5rem]">
      {children}
      <span className="text-xs font-medium leading-none">{label}</span>
    </Link>
  );
}


export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const [menuOpen, setMenuOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const { openEnquiry } = useEnquiry();

  const isActive = (href: string, category?: string) => {
    if (href === "/") return pathname === "/" && !activeCategory;
    if (category) {
      return (
        (pathname === "/products" && activeCategory === category) ||
        pathname === `/categories/${category}`
      );
    }
    return pathname.startsWith(href.split("?")[0]) && href !== "/";
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setCitiesOpen(false);
  };

  useEffect(() => {
    setMenuOpen(false);
    setCitiesOpen(false);
  }, [pathname, activeCategory]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-[#e6d5bc] bg-cream sticky top-0 z-[90] shadow-card overflow-visible">
      <div className="text-[#f6efe3]" style={{ backgroundColor: "#2c1810" }}>
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-end gap-4 min-h-[3.25rem]">
          <QuoteRibbon />
          <div className="hidden sm:flex items-center gap-4 shrink-0 text-[13px] font-semibold text-[#f6efe3]/90 relative z-10">
            <Link href="/faq" className="hover:text-white">Help</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
      {/* Mobile top bar */}
      <div className="md:hidden max-w-7xl mx-auto px-3 py-2.5 flex items-center gap-2 min-w-0">
        <button
          type="button"
          className="p-1.5 text-nav hover:text-primary shrink-0"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <BurgerIcon />
        </button>

        <SiteLogoLink size="mobile" priority onClick={closeMenu} className="min-w-0" />

        <div className="flex-1 min-w-0" />

        <div className="flex items-center shrink-0">
          <EnquireNowButton variant="icon" className="p-1.5" />
        </div>
      </div>

      {/* Desktop top bar */}
      <div className="hidden md:grid max-w-7xl mx-auto px-4 py-2.5 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <SiteLogoLink size="desktop" priority />

        <div className="w-full max-w-2xl mx-auto">
          <SearchBar />
        </div>

        <div className="flex items-start justify-end shrink-0 gap-3">
          <CountrySelector />
          <DesktopHeaderAction href="/account" label="Account">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </DesktopHeaderAction>
          <DesktopHeaderAction href="/wishlist" label="Wish Lists">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </DesktopHeaderAction>
          <EnquireNowButton variant="header" />
        </div>
      </div>

      <div className="md:hidden border-t border-[#e6d5bc] bg-paper px-4 py-2.5">
        <div className="max-w-7xl mx-auto">
          <SearchBar />
        </div>
      </div>

      {/* Desktop nav — Regions sits outside the scrolling row so the menu is not clipped */}
      <nav className="hidden md:block border-t border-[#e6d5bc] bg-paper overflow-visible">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
          <div className="flex flex-nowrap items-center gap-1 flex-1 min-w-0 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  isActive(item.href)
                    ? "bg-nav text-white"
                    : "text-primary hover:bg-nav hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <RegionsMenu />
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 bg-black/40 z-[60]"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-[min(88vw,320px)] z-[70] bg-paper shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#e6d5bc]">
              <span className="font-semibold text-primary">Menu</span>
              <button
                type="button"
                className="p-1 text-earth hover:text-nav"
                aria-label="Close menu"
                onClick={closeMenu}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="px-2 pb-3 space-y-2">
                <CountrySelector />
              </div>
              <Link
                href="/account"
                onClick={closeMenu}
                className={`block rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  pathname.startsWith("/account")
                    ? "bg-nav text-white"
                    : "text-primary hover:bg-nav hover:text-white"
                }`}
              >
                Account
              </Link>
              {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`block rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive(item.href)
                    ? "bg-nav text-white"
                    : "text-primary hover:bg-nav hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/wishlist"
              onClick={closeMenu}
              className={`block rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                pathname === "/wishlist"
                  ? "bg-nav text-white"
                    : "text-primary hover:bg-nav hover:text-white"
              }`}
            >
              Wish Lists
            </Link>

            <div>
                <button
                  type="button"
                  onClick={() => setCitiesOpen((v) => !v)}
                  className={`w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    citiesOpen ? "bg-nav text-white" : "text-primary hover:bg-nav hover:text-white"
                  }`}
                >
                  Regions
                  <span className={`text-xs transition-transform ${citiesOpen ? "rotate-180" : ""}`}>▼</span>
                </button>
                {citiesOpen && (
                  <div className="mt-1 ml-2 border-l-2 border-[#e6d5bc] pl-2 space-y-1">
                    {regionLinks.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/indian-spice-regions/${c.slug}`}
                        onClick={closeMenu}
                        className="block rounded-md px-4 py-2.5 text-sm text-earth hover:bg-beige hover:text-nav"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                openEnquiry();
              }}
              className="block w-full text-left rounded-lg px-4 py-3 text-sm font-semibold text-primary hover:bg-nav hover:text-white transition-colors"
            >
              Enquire Now
            </button>
            <Link
              href="/contact"
              onClick={closeMenu}
              className="block rounded-lg px-4 py-3 text-sm font-semibold text-primary hover:bg-nav hover:text-white transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/faq"
              onClick={closeMenu}
              className="block rounded-lg px-4 py-3 text-sm font-semibold text-primary hover:bg-nav hover:text-white transition-colors"
            >
              Help / FAQ
            </Link>
            </nav>
          </aside>
        </>
      )}
    </header>
  );
}
