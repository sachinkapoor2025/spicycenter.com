import { redirect } from "next/navigation";

export default function AdminCouponsRedirectPage() {
  redirect("/admin/boost-sales?tab=coupons");
}
