import { redirect } from "next/navigation";

export default function AdminPaymentReconciliationRedirectPage() {
  redirect("/admin/expense-settlement?tab=reconciliation");
}
