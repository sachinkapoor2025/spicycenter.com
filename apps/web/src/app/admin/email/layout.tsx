"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/admin/email", label: "Dashboard", exact: true },
  { href: "/admin/email/nudges", label: "Checkout nudges" },
  { href: "/admin/email/compose", label: "Compose Email" },
  { href: "/admin/email/upload", label: "Upload Recipients" },
  { href: "/admin/email/campaigns", label: "Campaigns" },
  { href: "/admin/email/templates", label: "Templates" },
  { href: "/admin/email/queue", label: "Queue" },
  { href: "/admin/email/analytics", label: "Analytics" },
  { href: "/admin/email/suppression", label: "Suppression List" },
  { href: "/admin/email/settings", label: "Settings" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export default function AdminEmailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Email</h1>
          <p className="text-sm text-slate-500">SES campaigns, templates, and analytics</p>
        </div>
        <button
          type="button"
          className="sm:hidden text-sm border rounded-lg px-3 py-1.5 self-start"
          onClick={() => setMenuOpen((v) => !v)}
        >
          Email menu
        </button>
      </div>

      <nav className={`flex flex-wrap gap-1 ${menuOpen ? "flex" : "hidden sm:flex"}`}>
        {links.map((l) => {
          const active = isActive(pathname, l.href, l.exact);
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                active ? "bg-nav text-white" : "bg-white border text-slate-700 hover:bg-slate-50"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="max-w-6xl">{children}</div>
    </div>
  );
}
