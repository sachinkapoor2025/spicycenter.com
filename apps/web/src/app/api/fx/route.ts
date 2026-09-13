import { NextResponse } from "next/server";
import { completeUsdRates, fetchLiveUsdRates } from "@spicycorner/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const live = await fetchLiveUsdRates();
  const rates = completeUsdRates(live?.rates);
  return NextResponse.json(
    {
      base: "USD",
      rates,
      source: live?.source ?? "fallback",
      asOf: live?.asOf ?? new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
