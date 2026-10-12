import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { customerKeys, leadMatchesFilters, type AdminLeadRecord, type LeadListFilters } from "@spicycorner/shared";
import { docClient, CUSTOMERS_TABLE } from "./db";

export const LEAD_PAGE_DEFAULT = 25;
export const LEAD_PAGE_MAX = 100;
export const LEAD_QUERY_PAGE_SIZE = 100;
export const LEAD_LIST_MAX_QUERY_PAGES = 20;

export function clampLeadPageLimit(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return LEAD_PAGE_DEFAULT;
  return Math.min(LEAD_PAGE_MAX, Math.max(1, Math.floor(parsed)));
}

export function encodeLeadCursor(key: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(key), "utf8").toString("base64url");
}

export function decodeLeadCursor(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function leadItemCursor(item: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!item.PK || !item.SK || !item.GSI1PK || !item.GSI1SK) return undefined;
  return {
    PK: item.PK,
    SK: item.SK,
    GSI1PK: item.GSI1PK,
    GSI1SK: item.GSI1SK,
  };
}

export async function collectLeadPage(
  fetchPage: (
    startKey?: Record<string, unknown>
  ) => Promise<{ items: Record<string, unknown>[]; lastKey?: Record<string, unknown> }>,
  opts: {
    limit: number;
    startKey?: Record<string, unknown>;
    match: (item: Record<string, unknown>) => boolean;
    maxPages?: number;
  }
): Promise<{
  items: Record<string, unknown>[];
  nextKey?: Record<string, unknown>;
  exhausted: boolean;
  pagesScanned: number;
}> {
  const collected: Record<string, unknown>[] = [];
  let startKey = opts.startKey;
  let pagesScanned = 0;
  const maxPages = opts.maxPages ?? LEAD_LIST_MAX_QUERY_PAGES;

  while (collected.length < opts.limit && pagesScanned < maxPages) {
    const page = await fetchPage(startKey);
    pagesScanned += 1;
    for (const item of page.items) {
      if (!opts.match(item)) continue;
      collected.push(item);
      if (collected.length === opts.limit) {
        return {
          items: collected,
          nextKey: leadItemCursor(item) ?? page.lastKey,
          exhausted: false,
          pagesScanned,
        };
      }
    }
    if (!page.lastKey) {
      return { items: collected, exhausted: true, pagesScanned };
    }
    startKey = page.lastKey;
  }

  return {
    items: collected,
    nextKey: startKey,
    exhausted: false,
    pagesScanned,
  };
}

export async function countLeadIndex(
  fetchCountPage: (
    startKey?: Record<string, unknown>
  ) => Promise<{ count: number; lastKey?: Record<string, unknown> }>
): Promise<number> {
  let total = 0;
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await fetchCountPage(startKey);
    total += page.count;
    startKey = page.lastKey;
  } while (startKey);
  return total;
}

function asLead(item: Record<string, unknown>): AdminLeadRecord {
  return item as AdminLeadRecord;
}

export async function queryLeadGsiPage(input: {
  startKey?: Record<string, unknown>;
  limit: number;
  scanForward: boolean;
}): Promise<{ items: Record<string, unknown>[]; lastKey?: Record<string, unknown> }> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: CUSTOMERS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": customerKeys.gsi1pk() },
      ScanIndexForward: input.scanForward,
      Limit: input.limit,
      ExclusiveStartKey: input.startKey,
    })
  );
  return {
    items: (result.Items ?? []) as Record<string, unknown>[],
    lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

export async function countAllLeads(): Promise<number> {
  return countLeadIndex(async (startKey) => {
    const result = await docClient.send(
      new QueryCommand({
        TableName: CUSTOMERS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": customerKeys.gsi1pk() },
        Select: "COUNT",
        ExclusiveStartKey: startKey,
      })
    );
    return {
      count: result.Count ?? 0,
      lastKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  });
}

export async function listAdminLeads(input: {
  limit: number;
  cursor?: string;
  scanForward: boolean;
  filters: LeadListFilters;
}): Promise<{
  leads: Record<string, unknown>[];
  total: number;
  filteredTotal?: number;
  filteredTotalExact: boolean;
  nextCursor?: string;
  limit: number;
}> {
  const total = await countAllLeads();
  const startKey = decodeLeadCursor(input.cursor);
  const filterApplied = Boolean(
    (input.filters.source && input.filters.source !== "all") ||
      (input.filters.status && input.filters.status !== "all") ||
      input.filters.dateFrom ||
      input.filters.q?.trim()
  );

  const page = await collectLeadPage(
    (key) =>
      queryLeadGsiPage({
        startKey: key,
        limit: filterApplied ? LEAD_QUERY_PAGE_SIZE : input.limit,
        scanForward: input.scanForward,
      }),
    {
      limit: input.limit,
      startKey,
      match: (item) => leadMatchesFilters(asLead(item), input.filters),
    }
  );

  let filteredTotal = filterApplied ? undefined : total;
  let filteredTotalExact = !filterApplied;
  if (filterApplied) {
    const counted = await collectLeadPage(
      (key) =>
        queryLeadGsiPage({
          startKey: key,
          limit: LEAD_QUERY_PAGE_SIZE,
          scanForward: true,
        }),
      {
        limit: Number.MAX_SAFE_INTEGER,
        match: (item) => leadMatchesFilters(asLead(item), input.filters),
        maxPages: LEAD_LIST_MAX_QUERY_PAGES,
      }
    );
    filteredTotal = counted.items.length;
    filteredTotalExact = counted.exhausted;
  }

  return {
    leads: page.items,
    total,
    filteredTotal,
    filteredTotalExact,
    nextCursor: page.nextKey ? encodeLeadCursor(page.nextKey) : undefined,
    limit: input.limit,
  };
}
