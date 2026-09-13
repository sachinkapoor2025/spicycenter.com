import { STORE_LOCATIONS } from "@/lib/site";

export function StoreLocations({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const isDark = variant === "dark";
  return (
    <div>
      <p
        className={`text-xs uppercase tracking-wide mb-2 ${isDark ? "text-white/60" : "text-slate-500"}`}
      >
        Our stores
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {STORE_LOCATIONS.map((store) => (
          <address
            key={store.id}
            className={
              isDark
                ? "not-italic rounded-xl border border-white/15 bg-white/5 px-3.5 py-3"
                : "not-italic rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
            }
          >
            <p className={`font-semibold mb-1.5 ${isDark ? "text-white" : "text-primary"}`}>
              <span aria-hidden className="mr-1.5">
                {store.flag}
              </span>
              {store.country}
            </p>
            <p className={`text-sm leading-relaxed ${isDark ? "text-white/80" : "text-slate-600"}`}>
              {store.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <a
              href={store.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-block mt-2 text-xs font-medium hover:underline ${
                isDark ? "text-white/70 hover:text-white" : "text-nav"
              }`}
            >
              View on map
            </a>
          </address>
        ))}
      </div>
    </div>
  );
}
