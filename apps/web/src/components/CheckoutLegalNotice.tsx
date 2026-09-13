import Link from "next/link";

export function CheckoutLegalNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-500 leading-relaxed ${className}`}>
      By proceeding with your purchase, you agree to our{" "}
      <Link href="/terms" className="text-nav underline underline-offset-2 hover:text-primary">
        Terms &amp; Conditions
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="text-nav underline underline-offset-2 hover:text-primary">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
