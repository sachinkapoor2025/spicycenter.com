import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PendingPaymentUnsubscribeForm } from "./UnsubscribeForm";

export const metadata: Metadata = pageMetadata({
  title: "Unsubscribe from payment reminders",
  description:
    "Stop daily emails about unpaid SpicyCorner checkout orders. You will still receive order updates after payment.",
  path: "/unsubscribe/payment-reminders",
});

export default async function PendingPaymentUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const prefillEmail = params.email?.trim() ?? "";

  return (
    <div className="max-w-lg mx-auto px-4 py-14">
      <h1 className="text-2xl font-bold text-primary mb-3">Unsubscribe from payment reminders</h1>
      <p className="text-slate-600 text-sm leading-relaxed mb-8">
        Enter the email address that receives daily reminders about an unpaid SpicyCorner order. We will stop
        those payment reminders only. You will still get order status emails if you complete payment
        later.
      </p>
      <PendingPaymentUnsubscribeForm initialEmail={prefillEmail} />
    </div>
  );
}
