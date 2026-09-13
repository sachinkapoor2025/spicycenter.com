/** Accepted payment method badges for footer / checkout trust signals. */
export function PaymentMethodIcons({ className = "" }: { className?: string }) {
  const badge =
    "inline-flex h-8 items-center justify-center rounded border border-slate-200 bg-white px-2.5 shrink-0";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="Accepted payment methods">
      <span className={`${badge} min-w-[3rem] text-[10px] font-bold tracking-wide text-[#1A1F71]`}>VISA</span>
      <span className={`${badge} min-w-[3rem]`}>
        <svg viewBox="0 0 48 32" className="h-5 w-8" aria-label="Mastercard">
          <circle cx="18" cy="16" r="10" fill="#EB001B" />
          <circle cx="30" cy="16" r="10" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
      </span>
      <span className={`${badge} min-w-[3rem] text-[10px] font-bold text-[#006FCF]`}>AMEX</span>
      <span className={`${badge} min-w-[3rem] text-[10px] font-bold text-[#097969]`}>RuPay</span>
      <span
        className={`${badge} min-w-[3.5rem] text-[10px] font-bold tracking-tight text-[#635BFF]`}
        aria-label="Stripe"
      >
        stripe
      </span>
      <span
        className={`${badge} min-w-[4rem] text-[9px] font-bold tracking-tight text-[#072654]`}
        aria-label="Razorpay"
      >
        Razorpay
      </span>
    </div>
  );
}
