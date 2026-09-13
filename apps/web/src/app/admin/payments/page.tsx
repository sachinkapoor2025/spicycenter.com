import { redirect } from "next/navigation";

/** Payment config UI removed from admin nav — redirect to dashboard. */
export default function AdminPaymentsRedirectPage() {
  redirect("/admin");
}
