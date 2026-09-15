"use client";

import { useCurrency } from "@/lib/currency-context";

export function StorefrontPrice({
  amount,
  from,
  className = "",
}: {
  amount: number;
  from: string;
  className?: string;
}) {
  const { format } = useCurrency();
  const source = from === "INR" ? "INR" : from === "EUR" ? "EUR" : from === "GBP" ? "GBP" : "USD";
  return <span className={className}>{format(amount, source)}</span>;
}
