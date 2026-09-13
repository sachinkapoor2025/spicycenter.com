import { redirect } from "next/navigation";

/** Legacy /ses-email/* → /admin/email (marketing email lives in the admin portal). */
export default function SesEmailLegacyRedirect() {
  redirect("/admin/email");
}
