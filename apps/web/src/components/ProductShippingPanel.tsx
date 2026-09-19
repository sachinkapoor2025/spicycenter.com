"use client";

export function ProductShippingPanel() {
  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-start gap-2 rounded-md border border-orange-100 bg-orange-50/80 px-3 py-2.5 text-sm text-slate-700">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-nav"
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
        <div className="min-w-0">
          <p>
            <span className="font-semibold text-primary">UK &amp; EU delivery</span>
          </p>
          <p className="mt-1 text-slate-800">
            Typical transit is 5–7 days after dispatch. Shipping is confirmed on your enquiry, not at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
