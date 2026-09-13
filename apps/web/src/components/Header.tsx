"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { navItems, regionLinks } from "@/lib/site";
import { SearchBar } from "@/components/SearchBar";
import { SiteLogoLink } from "@/components/SiteLogo";
import { CountrySelector } from "@/components/CountrySelector";
import { CurrencySelect } from "@/components/CurrencySelect";

function RegionsMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`btn-nav gap-1 ${open ? "btn-nav-active" : ""}`}
      >
        Regions
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 pt-1.5 z-[100]">
          <div className="min-w-[220px] max-h-[min(70vh,360px)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
            {regionLinks.map((c) => (
              <Link
                key={c.slug}
                href={`/indian-spice-regions/${c.slug}`}
                className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-nav whitespace-nowrap"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
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

function CartLink({ className = "" }: { className?: string }) {
  const { itemCount } = useCart();

  return (
    <Link href="/cart" className={`relative p-2 text-primary hover:text-nav ${className}`} aria-label="Cart">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-nav text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {itemCount}
        </span>
      )}
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

function DesktopCartAction() {
  const { itemCount } = useCart();

  return (
    <Link href="/cart" className="relative flex flex-col items-center gap-1 px-3 text-primary hover:text-nav min-w-[4.5rem]">
      <span className="relative">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {itemCount > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-nav text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {itemCount}
          </span>
        )}
      </span>
      <span className="text-xs font-medium leading-none">Cart</span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const [menuOpen, setMenuOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);

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
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm overflow-visible">
      {/* Mobile top bar */}
      <div className="md:hidden max-w-7xl mx-auto px-3 py-3 flex items-center gap-2">
        <button
          type="button"
          className="p-1.5 text-nav hover:text-primary shrink-0"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <BurgerIcon />
        </button>

        <SiteLogoLink size="mobile" priority onClick={closeMenu} />

        <div className="flex-1" />

        <div className="flex items-center shrink-0 gap-1">
          <CurrencySelect variant="header" />
          <CountrySelector compact />
          <AccountLink className="text-nav hover:text-primary p-1.5" />
          <WishlistLink className="text-nav hover:text-primary p-1.5" />
          <CartLink className="p-1.5" />
        </div>
      </div>

      {/* Desktop top bar */}
      <div className="hidden md:grid max-w-7xl mx-auto px-4 py-2.5 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
        <SiteLogoLink size="desktop" priority />

        <div className="w-full max-w-2xl mx-auto">
          <SearchBar />
        </div>

        <div className="flex items-start justify-end shrink-0 gap-3">
          <CurrencySelect variant="header" className="mt-1" />
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
          <DesktopCartAction />
        </div>
      </div>

      <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2.5">
        <div className="max-w-7xl mx-auto">
          <SearchBar />
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:block border-t border-slate-100 bg-white overflow-visible">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`btn-nav shrink-0 px-3 py-1.5 text-[13px] ${isActive(item.href) ? "btn-nav-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            <RegionsMenu />
          </div>
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-[min(85vw,320px)] z-50 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <span className="font-semibold text-primary">Menu</span>
              <button
                type="button"
                className="p-1 text-slate-500 hover:text-nav"
                aria-label="Close menu"
                onClick={closeMenu}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              <div className="px-2 pb-2 space-y-2">
                <CurrencySelect variant="inline" />
                <CountrySelector />
              </div>
              {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`block rounded-lg px-4 py-3 text-sm font-semibold ${
                  isActive(item.href)
                    ? "bg-nav text-white"
                    : "text-primary hover:bg-orange-50 hover:text-nav"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/wishlist"
              onClick={closeMenu}
              className={`block rounded-lg px-4 py-3 text-sm font-semibold ${
                pathname === "/wishlist"
                  ? "bg-nav text-white"
                  : "text-primary hover:bg-orange-50 hover:text-nav"
              }`}
            >
              Wish Lists
            </Link>

            <div>
                <button
                  type="button"
                  onClick={() => setCitiesOpen((v) => !v)}
                  className={`w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold ${
                    citiesOpen ? "bg-nav text-white" : "text-primary hover:bg-orange-50 hover:text-nav"
                  }`}
                >
                  Regions
                  <span className={`text-xs transition-transform ${citiesOpen ? "rotate-180" : ""}`}>▼</span>
                </button>
                {citiesOpen && (
                  <div className="mt-1 ml-2 border-l-2 border-slate-100 pl-2 space-y-1">
                    {regionLinks.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/indian-spice-regions/${c.slug}`}
                        onClick={closeMenu}
                        className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-nav"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </aside>
        </>
      )}
    </header>
  );
}
