import Link from "next/link";
import { site } from "@/lib/site";

const recovery = [
  { href: "/enquiry", label: "Free sourcing enquiry" },
  { href: "/markets", label: "Export markets" },
  { href: "/wholesale", label: "Wholesale (10kg+)" },
  { href: "/bulk-enquiry", label: "100kg+ bulk quote" },
  { href: "/spice-guide", label: "Spice guide" },
  { href: "/spices", label: "Shop spices" },
] as const;

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-6xl font-bold text-primary/20 mb-4">404</p>
      <h1 className="text-2xl font-bold text-primary mb-3">Page not found</h1>
      <p className="text-slate-600 mb-8">
        This page does not exist. Continue to a sourcing enquiry, an export-market hub, or the spice shop.
      </p>
      <div className="flex flex-col gap-2">
        {recovery.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md border border-slate-200 font-semibold px-6 py-3 hover:border-nav transition"
          >
            {item.label}
          </Link>
        ))}
        <Link href="/" className="rounded-md bg-primary text-white font-semibold px-6 py-3 hover:bg-primary/90 transition">
          Back to home
        </Link>
      </div>
      <p className="mt-10 text-sm text-slate-500">
        Need help?{" "}
        <Link href="/contact" className="text-nav underline">
          Contact {site.name}
        </Link>
      </p>
    </div>
  );
}
