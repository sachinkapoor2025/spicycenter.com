import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/env";

/** Admin-only: bust Next.js cache after product image changes in admin portal. */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminCheck = await fetch(`${getApiUrl()}/admin/products`, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  if (!adminCheck.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const slug = body.slug?.trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  revalidatePath(`/products/${slug}`);
  revalidatePath("/products");
  revalidatePath("/");

  return NextResponse.json({ revalidated: true, slug });
}
