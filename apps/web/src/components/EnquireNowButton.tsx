"use client";

import { useEnquiry } from "@/lib/enquiry-context";

export function EnquireNowButton({
  productName,
  variant = "default",
  className = "",
  label = "Enquire Now",
}: {
  productName?: string;
  variant?: "default" | "card" | "detail" | "header" | "sticky" | "icon";
  className?: string;
  label?: string;
}) {
  const { openEnquiry } = useEnquiry();

  const styles: Record<typeof variant, string> = {
    default: "btn-primary",
    card: "btn-cart w-full text-xs sm:text-sm px-3 py-2 sm:px-5 sm:py-2.5",
    detail: "w-full rounded-md bg-nav text-white font-bold text-sm uppercase tracking-wide py-3.5 hover:bg-primary transition",
    header:
      "relative flex flex-col items-center gap-1 px-3 text-primary hover:text-nav min-w-[4.5rem] bg-transparent border-0 cursor-pointer",
    sticky: "w-full rounded-md bg-nav text-white font-bold text-sm uppercase tracking-wide py-3 hover:bg-primary transition",
    icon: "p-1.5 text-primary hover:text-nav",
  };

  return (
    <button
      type="button"
      onClick={() => openEnquiry(productName)}
      className={`${styles[variant]} ${className}`}
      aria-label={variant === "icon" || variant === "header" ? "Enquire Now" : undefined}
    >
      {variant === "icon" ? (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h8M8 14h5M7 4h10a2 2 0 012 2v14l-4-2-3 2-3-2-4 2V6a2 2 0 012-2z"
          />
        </svg>
      ) : variant === "header" ? (
        <>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h8M8 14h5M7 4h10a2 2 0 012 2v14l-4-2-3 2-3-2-4 2V6a2 2 0 012-2z"
            />
          </svg>
          <span className="text-xs font-medium leading-none">Enquire</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
