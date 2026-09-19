"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { useAuth } from "@/lib/auth-context";

type NavChild = { href: string; label: string; vendorAllowed?: boolean };
type NavItem =
  | { type: "link"; href: string; label: string; exact?: boolean; vendorAllowed?: boolean; adminOnly?: boolean }
  | { type: "group"; id: string; label: string; href: string; children: NavChild[]; superOnly?: boolean; vendorAllowed?: boolean; adminOnly?: boolean };

const navItems: NavItem[] = [
  { type: "link", href: "/admin", label: "Dashboard", exact: true, vendorAllowed: true },
  { type: "link", href: "/admin/orders", label: "Orders", vendorAllowed: true },
  {
    type: "group",
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    children: [
      { href: "/admin/analytics?tab=overview", label: "Overview" },
      { href: "/admin/analytics/merchandising", label: "Product performance" },
      { href: "/admin/analytics/assistant", label: "Shopping assistant" },
      { href: "/admin/analytics?tab=order-routes", label: "Order routes" },
      { href: "/admin/analytics?tab=visitor-analytics", label: "Visitor analytics" },
      { href: "/admin/analytics?tab=live", label: "Live visitor" },
      { href: "/admin/analytics?tab=sessions", label: "Visitors" },
    ],
  },
  {
    type: "group",
    id: "boost-sales",
    label: "Boost Sales",
    href: "/admin/boost-sales",
    children: [
      { href: "/admin/boost-sales?tab=welcome-leads", label: "Welcome Leads" },
      { href: "/admin/boost-sales?tab=carts", label: "Abandoned Carts" },
      { href: "/admin/boost-sales?tab=coupons", label: "Coupons" },
      { href: "/admin/boost-sales?tab=leads", label: "Leads" },
    ],
  },
  { type: "link", href: "/admin/products", label: "Products", vendorAllowed: true },
  { type: "link", href: "/admin/spices", label: "Spices" },
  { type: "link", href: "/admin/keywords", label: "Keyword map" },
  { type: "link", href: "/admin/seo", label: "SEO ops" },
  { type: "link", href: "/admin/market-prices", label: "Market Prices" },
  { type: "link", href: "/admin/wholesale", label: "Wholesale Quotes" },
  { type: "link", href: "/admin/bulk-pricing", label: "Bulk Pricing" },
  { type: "link", href: "/admin/compliance", label: "Compliance" },
  { type: "link", href: "/admin/categories", label: "Categories" },
  { type: "link", href: "/admin/shipping", label: "Shipping" },
  {
    type: "group",
    id: "vendor",
    label: "Vendor Management",
    href: "/admin/network",
    vendorAllowed: true,
    children: [
      { href: "/admin/network?tab=vendors", label: "Vendors", vendorAllowed: true },
      { href: "/admin/network?tab=warehouses", label: "Warehouses", vendorAllowed: true },
      { href: "/admin/network?tab=markets", label: "Markets" },
      { href: "/admin/network?tab=inventory", label: "Inventory", vendorAllowed: true },
      { href: "/admin/vendor-management?tab=expense", label: "Vendor expense" },
      { href: "/admin/vendor-management?tab=api", label: "Vendor API" },
      { href: "/admin/cj-dropshipping", label: "CJ Dropshipping" },
      { href: "/admin/eprolo", label: "Eprolo" },
    ],
  },
  { type: "link", href: "/admin/email", label: "Marketing Email" },
  {
    type: "group",
    id: "expense-settlement",
    label: "Expense & Settlement",
    href: "/admin/expense-settlement",
    children: [
      { href: "/admin/expense-settlement?tab=expense", label: "Expense" },
      { href: "/admin/expense-settlement?tab=settlement", label: "Settlement" },
      { href: "/admin/expense-settlement?tab=reconciliation", label: "Reconciliation" },
    ],
    superOnly: true,
  },
  { type: "link", href: "/admin/load-test", label: "Load Test", exact: false },
];

function pathActive(pathname: string, href: string, exact?: boolean) {
  const base = href.split("?")[0]!;
  return exact ? pathname === base : pathname === base || pathname.startsWith(`${base}/`);
}

function childActive(pathname: string, search: string, href: string) {
  const [path, query = ""] = href.split("?");
  if (pathname !== path) return false;
  if (!query) return true;
  const want = new URLSearchParams(query);
  const have = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  // Default hub tabs (no ?tab=) treat first child as active when path matches and tab missing.
  if ([...want.keys()].length === 1 && want.has("tab") && !have.has("tab")) {
    return false;
  }
  for (const [k, v] of want.entries()) {
    if (have.get(k) !== v) return false;
  }
  return true;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    >
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavButtons({
  pathname,
  search,
  onNavigate,
  isSuperAdmin,
  isVendor,
  authLoading,
  collapsed,
  variant = "desktop",
}: {
  pathname: string;
  search: string;
  onNavigate?: () => void;
  isSuperAdmin: boolean;
  isVendor: boolean;
  authLoading?: boolean;
  collapsed?: boolean;
  /** Mobile drawer expands groups by default and uses tap (no hover). */
  variant?: "desktop" | "mobile";
}) {
  // While auth loads, keep super-admin items visible so Vendor expense isn't missing on first paint.
  const showSuper = Boolean(authLoading || isSuperAdmin);

  const visible = useMemo(
    () =>
      navItems
        .filter((item) => {
          if (isVendor) return Boolean(item.vendorAllowed);
          if (item.type === "link" && item.href === "/admin/load-test") return showSuper;
          if (item.type === "group" && item.superOnly) return showSuper;
          return true;
        })
        .map((item) => {
          if (item.type !== "group" || !isVendor) return item;
          return { ...item, children: item.children.filter((c) => c.vendorAllowed) };
        }),
    [showSuper, isVendor]
  );

  const initiallyOpen = useMemo(() => {
    const open: Record<string, boolean> = {};
    for (const item of visible) {
      if (item.type !== "group") continue;
      if (variant === "mobile") {
        open[item.id] = true;
      } else if (pathActive(pathname, item.href)) {
        open[item.id] = true;
      }
    }
    return open;
  }, [pathname, visible, variant]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initiallyOpen);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const item of visible) {
        if (item.type === "group" && pathActive(pathname, item.href)) {
          next[item.id] = true;
        }
        if (variant === "mobile" && item.type === "group") {
          next[item.id] = true;
        }
      }
      return next;
    });
  }, [pathname, visible, variant]);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const linkClass = (active: boolean) =>
    `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      collapsed ? "text-center px-2" : ""
    } ${
      active
        ? "bg-nav text-white shadow-sm"
        : "text-slate-700 hover:bg-blue-50 hover:text-nav"
    }`;

  return (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {visible.map((item) => {
        if (item.type === "link") {
          const active = pathActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={linkClass(active)}
            >
              {collapsed ? item.label.slice(0, 1) : item.label}
            </Link>
          );
        }

        const groupActive =
          pathActive(pathname, item.href) ||
          item.children.some((c) => pathActive(pathname, c.href.split("?")[0]!));
        const children =
          item.id === "vendor" && !showSuper
            ? item.children.filter((c) => !c.href.includes("tab=expense"))
            : item.children;

        const open =
          variant === "mobile"
            ? !!expanded[item.id]
            : !!expanded[item.id] || hovered === item.id || groupActive;

        if (collapsed) {
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              className={linkClass(groupActive)}
            >
              {item.label.slice(0, 1)}
            </Link>
          );
        }

        const groupBlue = open || groupActive;

        return (
          <div
            key={item.id}
            className="group/nav relative"
            onMouseEnter={() => {
              if (variant === "desktop") setHovered(item.id);
            }}
            onMouseLeave={() => {
              if (variant === "desktop") setHovered((h) => (h === item.id ? null : h));
            }}
          >
            <div
              className={`flex items-center gap-0.5 rounded-lg transition-colors ${
                groupBlue
                  ? "bg-nav text-white shadow-sm"
                  : "text-slate-700 hover:bg-nav hover:text-white"
              }`}
            >
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  groupBlue ? "text-white" : "text-inherit"
                }`}
              >
                {item.label}
              </Link>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={`mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                  groupBlue
                    ? "text-white/90 hover:bg-white/15"
                    : "text-slate-500 hover:bg-white/15 hover:text-white"
                }`}
                aria-expanded={open}
                aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
              >
                <Chevron open={open} />
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                open ? "mt-0.5 max-h-96 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="ml-2 flex flex-col gap-0.5 border-l-2 border-nav/30 pl-2 py-0.5">
                {children.map((child) => {
                  const active = childActive(pathname, search, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={`rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-nav text-white shadow-sm"
                          : "text-slate-600 hover:bg-nav hover:text-white"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const { isSuperAdmin, isVendor, loading: authLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, search]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 lg:flex">
        <aside
          className={`hidden lg:flex lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white transition-[width] duration-200 ${
            sidebarCollapsed ? "lg:w-16" : "lg:w-60"
          }`}
        >
          <div className="sticky top-0 flex h-screen flex-col px-2 py-4">
            <div
              className={`mb-3 flex items-center ${
                sidebarCollapsed ? "justify-center" : "justify-between px-1"
              }`}
            >
              {!sidebarCollapsed && (
                <Link href="/admin" className="px-2 text-lg font-bold text-primary truncate">
                  SpicyCenter Admin
                </Link>
              )}
              <button
                type="button"
                onClick={toggleSidebar}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-nav"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  {sidebarCollapsed ? (
                    <path
                      d="M6 3.5L10.5 8L6 12.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M10 3.5L5.5 8L10 12.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </button>
            </div>
            {!sidebarCollapsed && (
              <div className="mb-4 px-1">
                <AdminSearch />
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-1 pb-2">
              <NavButtons
                pathname={pathname}
                search={search}
                isSuperAdmin={isSuperAdmin}
                isVendor={isVendor}
                authLoading={authLoading}
                collapsed={sidebarCollapsed}
                variant="desktop"
              />
            </div>
            {!sidebarCollapsed && (
              <Link
                href="/"
                className="mt-2 rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-blue-50 hover:text-nav"
              >
                ← Storefront
              </Link>
            )}
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 border-b border-slate-200 bg-white lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-blue-50"
                aria-label="Open admin menu"
                aria-expanded={menuOpen}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M3 5h14M3 10h14M3 15h14"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <Link href="/admin" className="truncate font-bold text-primary">
                SpicyCenter Admin
              </Link>
            </div>
            <Link href="/" className="shrink-0 text-sm text-slate-500 hover:text-nav">
              ← Store
            </Link>
          </div>
        </div>

        {/* Mobile drawer — wider, all groups expanded, search inside */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20.5rem)] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span className="font-bold text-primary">Admin menu</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50"
                  aria-label="Close menu"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="border-b border-slate-100 px-3 py-3">
                <AdminSearch />
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                <NavButtons
                  pathname={pathname}
                  search={search}
                  onNavigate={() => setMenuOpen(false)}
                  isSuperAdmin={isSuperAdmin}
                  isVendor={isVendor}
                  authLoading={authLoading}
                  variant="mobile"
                />
              </div>
              <div className="border-t border-slate-200 px-3 py-3 safe-area-pb">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm text-slate-500 hover:bg-blue-50 hover:text-nav"
                >
                  ← Storefront
                </Link>
              </div>
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminGuard>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}
