import type { Context } from "aws-lambda";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { mandiPriceKeys } from "@spicycorner/shared";
import { TRACKED_COMMODITIES } from "@spicycorner/shared";
import { docClient, now, SPICE_MANDI_PRICES_TABLE } from "./lib/db";
import {
  fetchAllCommodityRecords,
  parsePriceRow,
  readAgmarknetApiKey,
  type AgmarknetRecord,
} from "./lib/agmarknet";

type FetcherEvent = {
  backfill?: boolean;
  arrivalDate?: string;
  commodity?: string;
};

const cw = new CloudWatchClient({});
const sns = new SNSClient({});

async function putFailureMetric(commodity: string, consecutive: number) {
  await cw.send(
    new PutMetricDataCommand({
      Namespace: "SpicyCenter/Agmarknet",
      MetricData: [
        {
          MetricName: "CommodityFetchFailure",
          Dimensions: [{ Name: "Commodity", Value: commodity }],
          Value: 1,
          Unit: "Count",
        },
        {
          MetricName: "ConsecutiveFetchFailures",
          Dimensions: [{ Name: "Commodity", Value: commodity }],
          Value: consecutive,
          Unit: "Count",
        },
      ],
    })
  );
}

async function notifyConsecutiveFailure(commodity: string, consecutive: number, error: string) {
  const topic = process.env.AGMARKNET_ALERT_TOPIC_ARN;
  if (!topic) return;
  await sns.send(
    new PublishCommand({
      TopicArn: topic,
      Subject: `Agmarknet fetch failed 2+ days: ${commodity}`,
      Message: `${commodity} has ${consecutive} consecutive failed daily fetches.\n${error}\nLATEST item was not overwritten.`,
    })
  );
}

async function readHealth(slug: string) {
  const res = await docClient.send(
    new GetCommand({
      TableName: SPICE_MANDI_PRICES_TABLE,
      Key: { PK: mandiPriceKeys.pk(slug), SK: mandiPriceKeys.fetchHealthSk() },
    })
  );
  return {
    consecutiveFailures: Number(res.Item?.consecutiveFailures ?? 0),
    lastSuccessAt: (res.Item?.lastSuccessAt as string | undefined) ?? null,
  };
}

async function writeHealth(slug: string, consecutiveFailures: number, lastSuccessAt: string | null) {
  await docClient.send(
    new PutCommand({
      TableName: SPICE_MANDI_PRICES_TABLE,
      Item: {
        PK: mandiPriceKeys.pk(slug),
        SK: mandiPriceKeys.fetchHealthSk(),
        consecutiveFailures,
        lastSuccessAt,
        updatedAt: now(),
      },
    })
  );
}

async function persistCommodity(slug: string, records: AgmarknetRecord[]) {
  const fetchedAt = now();
  const parsed = records.map(parsePriceRow).filter((r) => r.arrival_date && r.market);
  if (!parsed.length) {
    throw new Error("No usable market rows");
  }

  const writes = parsed.map((row) =>
    docClient.send(
      new PutCommand({
        TableName: SPICE_MANDI_PRICES_TABLE,
        Item: {
          PK: mandiPriceKeys.pk(slug),
          SK: mandiPriceKeys.historySk(row.arrival_date!, row.market),
          ...row,
          commodity: slug,
          fetched_at: fetchedAt,
        },
      })
    )
  );
  const chunk = 25;
  for (let i = 0; i < writes.length; i += chunk) {
    await Promise.all(writes.slice(i, i + chunk));
  }

  const modals = parsed.map((r) => r.modal_price).filter((n): n is number => n != null && n > 0);
  if (!modals.length) {
    throw new Error("No modal prices to average");
  }
  const averageModal = modals.reduce((a, b) => a + b, 0) / modals.length;
  const latestDate = parsed.map((r) => r.arrival_date!).sort().at(-1);

  await docClient.send(
    new PutCommand({
      TableName: SPICE_MANDI_PRICES_TABLE,
      Item: {
        PK: mandiPriceKeys.pk(slug),
        SK: mandiPriceKeys.latestSk(),
        commodity: slug,
        market: "AGGREGATE",
        state: "",
        district: "",
        min_price: Math.min(...parsed.map((r) => r.min_price).filter((n): n is number => n != null)),
        max_price: Math.max(...parsed.map((r) => r.max_price).filter((n): n is number => n != null)),
        modal_price: averageModal,
        average_modal_price: averageModal,
        market_count: parsed.length,
        arrival_date: latestDate,
        unit: "INR/quintal as reported (average modal across markets)",
        fetched_at: fetchedAt,
        source_disclaimer: parsed[0].source_disclaimer,
      },
    })
  );

  return { rows: parsed.length, averageModal, latestDate };
}

export async function handler(event: FetcherEvent, _context: Context) {
  const apiKey = await readAgmarknetApiKey();
  const list = event.commodity
    ? TRACKED_COMMODITIES.filter((c) => c.slug === event.commodity || c.agmarknetName === event.commodity)
    : TRACKED_COMMODITIES;

  const results: Record<string, unknown> = {};
  for (const commodity of list) {
    try {
      const records = await fetchAllCommodityRecords(apiKey, commodity, event.arrivalDate);
      const saved = await persistCommodity(commodity.slug, records);
      await writeHealth(commodity.slug, 0, now());
      results[commodity.slug] = { ok: true, ...saved };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Agmarknet commodity fetch failed", { commodity: commodity.slug, error: message });
      const health = await readHealth(commodity.slug);
      const consecutive = health.consecutiveFailures + 1;
      await writeHealth(commodity.slug, consecutive, health.lastSuccessAt);
      try {
        await putFailureMetric(commodity.slug, consecutive);
        if (consecutive >= 2) {
          await notifyConsecutiveFailure(commodity.slug, consecutive, message);
        }
      } catch (metricErr) {
        console.error("Failed to publish Agmarknet failure metric", metricErr);
      }
      results[commodity.slug] = { ok: false, error: message, consecutiveFailures: consecutive };
    }
  }

  return { backfill: Boolean(event.backfill), results };
}
