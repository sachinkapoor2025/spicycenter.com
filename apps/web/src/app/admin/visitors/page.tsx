import { redirect } from "next/navigation";

/** Visitors live under Analytics → Visitors. */
export default function AdminVisitorsRedirectPage() {
  redirect("/admin/analytics?tab=sessions");
}
