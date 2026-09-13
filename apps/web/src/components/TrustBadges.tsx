import Link from "next/link";

type Variant = "compact" | "full";

export function TrustBadges({ variant = "full", className = "" }: { variant?: Variant; className?: string }) {
  const items = [
    { icon: "🚚", label: "Delivering in 5–7 days" },
    { icon: "🔒", label: "SSL Secure Checkout" },
    { icon: "💳", label: "Secure Payments" },
    { icon: "✓", label: "Satisfaction Guarantee", href: "/returns" },
  ] as const;

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`} aria-label="Trust and security badges">
        {items.map((item) =>
          "href" in item && item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-nav"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ) : (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </span>
          )
        )}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${className}`} aria-label="Trust and security badges">
      {items.map((item) => {
        const inner = (
          <>
            <span className="text-lg" aria-hidden>
              {item.icon}
            </span>
            <span className="text-[11px] font-semibold text-slate-700 leading-tight">{item.label}</span>
          </>
        );
        return "href" in item && item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-3 text-center hover:border-nav transition"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-3 text-center"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
