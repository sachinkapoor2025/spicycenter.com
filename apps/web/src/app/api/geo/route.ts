import { NextResponse } from "next/server";
import { defaultCurrencyForCountry, detectViewerGeo } from "@/lib/geo-currency";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const geo = await detectViewerGeo();
  const currency = defaultCurrencyForCountry(geo.country);

  return NextResponse.json(
    {
      country: geo.country,
      region: geo.region,
      regionName: geo.regionName,
      city: geo.city,
      currency,
      source: geo.source,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
