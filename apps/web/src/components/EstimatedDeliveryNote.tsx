import { estimatedDeliveryLabel } from "@spicycorner/shared";

interface Props {
  variant?: "inline" | "banner";
  prefix?: string;
  className?: string;
}

/** Estimated delivery window (5–7 business days). */
export function EstimatedDeliveryNote({
  variant = "inline",
  prefix = "Estimated delivery:",
  className = "",
}: Props) {
  const label = estimatedDeliveryLabel();

  if (variant === "banner") {
    return (
      <div
        className={`flex items-center gap-2 rounded-md bg-orange-50 border border-orange-100 px-3 py-2.5 text-sm text-slate-700 ${className}`}
      >
        <svg
          className="w-5 h-5 shrink-0 text-nav"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0m-4 0V9m0 0H5.5M12 9h6.5M12 9L9 5m3 4l3-4"
          />
        </svg>
        <span>
          <span className="font-semibold text-primary">{prefix}</span> {label}
        </span>
      </div>
    );
  }

  return (
    <p className={`text-xs sm:text-sm text-slate-600 ${className}`}>
      <span className="font-medium text-slate-700">{prefix}</span> {label}
    </p>
  );
}
