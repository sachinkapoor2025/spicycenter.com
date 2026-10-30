import { NextResponse } from "next/server";
import { loadEnquiryProductSuggestions } from "@/lib/enquiry-catalogue-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search") ?? "";
  try {
    const suggestions = await loadEnquiryProductSuggestions(search);
    return NextResponse.json(
      {
        products: suggestions.map((product) => ({
          slug: product.key,
          name: product.name,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Catalogue search is unavailable" }, { status: 502 });
  }
}
