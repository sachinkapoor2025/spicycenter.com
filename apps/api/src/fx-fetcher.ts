import type { Context } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { fxRateKeys } from "@spicycorner/shared";
import { docClient, now, SPICE_MANDI_PRICES_TABLE } from "./lib/db";

/** Frankfurter returns units of GBP per 1 INR when from=INR&to=GBP. */
export async function fetchFrankfurterInrRates(): Promise<{ inr_gbp: number; inr_eur: number }> {
  const url = "https://api.frankfurter.app/latest?from=INR&to=GBP,EUR";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
  const body = (await res.json()) as { rates?: { GBP?: number; EUR?: number } };
  const gbp = body.rates?.GBP;
  const eur = body.rates?.EUR;
  if (!gbp || !eur || gbp <= 0 || eur <= 0) {
    throw new Error("Frankfurter returned invalid INR rates");
  }
  return { inr_gbp: gbp, inr_eur: eur };
}

export async function handler(_event: unknown, _context: Context) {
  const rates = await fetchFrankfurterInrRates();
  await docClient.send(
    new PutCommand({
      TableName: SPICE_MANDI_PRICES_TABLE,
      Item: {
        PK: fxRateKeys.pk(),
        SK: fxRateKeys.latestSk(),
        inr_gbp: rates.inr_gbp,
        inr_eur: rates.inr_eur,
        fetched_at: now(),
        source: "frankfurter.app",
      },
    })
  );
  return { ok: true, ...rates };
}
