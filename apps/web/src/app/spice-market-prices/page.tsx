import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { api } from "@/lib/api";
import { AGMARKNET_SOURCE_DISCLAIMER } from "@spicycorner/shared";
import { LiveMandiPriceBoard } from "@/components/LiveMandiPriceBoard";
import { formatMandiDate, type LiveMandiBoard } from "@/lib/live-mandi-prices";

export const metadata: Metadata = pageMetadata({
  title: "Live Indian spice market prices",
  description:
    "Live Agmarknet mandi prices for Indian spices, updated daily. These wholesale market prints fluctuate every day and are a reference, not SpicyCenter checkout prices.",
  path: "/spice-market-prices",
});

export const dynamic = "force-dynamic";

async function loadBoard(): Promise<LiveMandiBoard | null> {
  try {
    return await api<LiveMandiBoard>("/prices", { revalidate: 3600, timeoutMs: 8000 });
  } catch {
    return null;
  }
}

export default async function MarketPricesPage() {
  const board = await loadBoard();
  const prices = board?.prices ?? [];
  const liveCount = prices.filter((p) => p.available).length;
  const asOf = formatMandiDate(board?.fetchedAt ?? prices.find((p) => p.arrivalDate)?.arrivalDate);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <p className="spice-kicker">Agmarknet · India</p>
      <h1 className="spice-heading text-4xl mt-2">Live Indian spice market prices</h1>
      <div className="mt-5 max-w-3xl rounded-2xl border border-[#e6d5bc] bg-[#fdf8f1] p-5">
        <p className="text-sm font-semibold text-primary">These are live mandi prices and they fluctuate every day.</p>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          Figures come from India&apos;s official Agmarknet (data.gov.in) feed, pulled by our daily Lambda. A spice can
          move with arrivals, quality, grade and local demand — so yesterday&apos;s print is not today&apos;s. They are a
          wholesale market reference, not SpicyCenter&apos;s retail checkout price or a confirmed bulk quote.
        </p>
        <p className="text-xs text-muted mt-3">
          {liveCount > 0
            ? `${liveCount} spices with a live print${asOf ? ` · last refreshed ${asOf}` : ""} · ${board?.source ?? "Agmarknet"}`
            : "Waiting for the next daily Agmarknet fetch."}
        </p>
      </div>
      <LiveMandiPriceBoard prices={prices} />
      <p className="mt-8 text-xs text-muted max-w-3xl leading-relaxed">
        {board?.disclaimer ?? AGMARKNET_SOURCE_DISCLAIMER} Historical rows in our database are never overwritten; each
        day&apos;s board is a new snapshot.
      </p>
    </div>
  );
}
