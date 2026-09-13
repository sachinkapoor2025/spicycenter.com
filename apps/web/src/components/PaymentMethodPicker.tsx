import type { ReactNode } from "react";

export type PaymentMethod = "stripe" | "razorpay";

function RazorpayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#072654" />
      <path
        fill="#3395FF"
        d="M6.2 16.5V7.5h2.1l2.4 5.8 2.4-5.8h2.1v9h-1.8v-6.1l-2.2 5.3h-1.2l-2.2-5.3v6.1H6.2z"
      />
    </svg>
  );
}

function StripeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <rect width="24" height="24" rx="5" fill="#635BFF" />
      <path
        fill="#fff"
        d="M10.2 9.8c0-.7.6-1 1.5-1 1.3 0 2.9.4 4.2 1.1V7.4c-1.4-.5-2.8-.8-4.2-.8-3.4 0-5.7 1.8-5.7 4.8 0 4.7 6.5 3.9 6.5 5.9 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v2.9c1.7.7 3.3 1 4.9 1 3.5 0 5.9-1.7 5.9-4.9 0-5.1-6.6-4.1-6.6-6.1z"
      />
    </svg>
  );
}

export function PaymentMethodPicker({
  value,
  onChange,
  checkoutCurrency = "USD",
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  checkoutCurrency?: "USD" | "INR";
}) {
  const allOptions: { id: PaymentMethod; label: string; icon: ReactNode }[] = [
    { id: "razorpay", label: "Pay with Razorpay", icon: <RazorpayIcon /> },
    { id: "stripe", label: "Pay with Stripe", icon: <StripeIcon /> },
  ];

  const options =
    checkoutCurrency === "INR"
      ? allOptions.filter((o) => o.id === "razorpay")
      : allOptions;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition-all ${
              selected
                ? "border-nav bg-blue-50 shadow-sm ring-1 ring-nav/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            aria-pressed={selected}
          >
            {option.icon}
            <span className="font-semibold text-slate-900 text-sm">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
