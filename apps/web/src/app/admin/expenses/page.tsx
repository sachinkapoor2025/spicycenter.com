import { redirect } from "next/navigation";

export default function AdminExpensesRedirectPage() {
  redirect("/admin/expense-settlement?tab=expense");
}
