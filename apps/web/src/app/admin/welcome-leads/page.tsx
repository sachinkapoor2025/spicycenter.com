import { redirect } from "next/navigation";

export default function AdminWelcomeLeadsRedirectPage() {
  redirect("/admin/boost-sales?tab=welcome-leads");
}
