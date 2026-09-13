import { redirect } from "next/navigation";

/** Vendor API lives under Vendor Management → Vendor API. */
export default function AdminVendorApiRedirectPage() {
  redirect("/admin/vendor-management?tab=api");
}
