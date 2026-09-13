import { redirect } from "next/navigation";

export default function AdminCartsRedirectPage() {
  redirect("/admin/boost-sales?tab=carts");
}
