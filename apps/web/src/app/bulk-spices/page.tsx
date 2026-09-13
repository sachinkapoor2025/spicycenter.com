import { redirect } from "next/navigation";

export default async function BulkIndex() {
  redirect("/spices?channel=bulk");
}
