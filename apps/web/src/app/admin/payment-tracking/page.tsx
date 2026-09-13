import { redirect } from "next/navigation";

export default function AdminPaymentTrackingRedirectPage() {
  redirect("/admin/expense-settlement?tab=settlement");
}
