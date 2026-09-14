import { trustStripItems } from "@/lib/trust";

export function TrustStrip() {
  return (
    <div
      className="bg-primary/5 border-y border-primary/10"
      aria-label="Why shoppers trust SpicyCenter"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-700">
          {trustStripItems.map((item, i) => (
            <li key={item} className="flex items-center gap-4">
              {i > 0 && (
                <span className="hidden sm:inline text-slate-300" aria-hidden>
                  •
                </span>
              )}
              <span className="font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
