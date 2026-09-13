import { redirect } from "next/navigation";

export default async function BulkSpice({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/spices/${slug}?channel=bulk`);
}
