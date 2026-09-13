import Link from "next/link";
import { site } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-6xl font-bold text-primary/20 mb-4">404</p>
      <h1 className="text-2xl font-bold text-primary mb-3">Page not found</h1>
      <p className="text-slate-600 mb-8">
        This spice page doesn&apos;t exist. Browse our collections or return home to shop spice to the USA.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/products"
          className="rounded-md bg-primary text-white font-semibold px-6 py-3 hover:bg-primary/90 transition"
        >
          Shop all spice items
        </Link>
        <Link href="/" className="rounded-md border border-slate-200 font-semibold px-6 py-3 hover:border-nav transition">
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
