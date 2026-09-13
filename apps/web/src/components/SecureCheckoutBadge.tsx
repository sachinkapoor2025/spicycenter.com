export function SecureCheckoutBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <p className="text-sm font-semibold text-slate-800">🔒 100% Secure Checkout</p>
      <p className="text-xs text-slate-500 mt-0.5">Your payment is encrypted & protected</p>
    </div>
  );
}
