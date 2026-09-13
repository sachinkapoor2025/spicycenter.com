import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { randomUUID } from "crypto";
import {
  CJ_ADMIN_CATALOG_PAGE_SIZE,
  CJ_LIST_V2_PAGE_SIZE,
  cjImportJobKeys,
  type CjImportJob,
  type CjImportJobLine,
} from "@spicycorner/shared";
import { CONFIG_TABLE, docClient, now } from "./db";
import { cjListProductsV2, flattenListV2, type CjListProduct } from "./cj-dropshipping";
import { importCjProduct, listImportedCjPids } from "./cj-import";

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? "us-east-1" });

function countsFromItems(items: CjImportJobLine[]): CjImportJob["counts"] {
  const counts = {
    total: items.length,
    pending: 0,
    inProgress: 0,
    complete: 0,
    skipped: 0,
    failed: 0,
  };
  for (const item of items) {
    if (item.status === "pending") counts.pending += 1;
    else if (item.status === "in_progress") counts.inProgress += 1;
    else if (item.status === "complete") counts.complete += 1;
    else if (item.status === "skipped") counts.skipped += 1;
    else counts.failed += 1;
  }
  return counts;
}

function indexItem(job: CjImportJob) {
  return {
    PK: cjImportJobKeys.listPk(),
    SK: cjImportJobKeys.listSk(job.createdAt, job.jobId),
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    source: job.source,
    keyword: job.keyword,
    counts: job.counts,
  };
}

async function putJob(job: CjImportJob): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: { PK: cjImportJobKeys.pk(job.jobId), SK: cjImportJobKeys.sk(), ...job },
    })
  );
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: indexItem(job),
    })
  );
}

export async function getCjImportJob(jobId: string): Promise<CjImportJob | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: cjImportJobKeys.pk(jobId), SK: cjImportJobKeys.sk() },
    })
  );
  return (result.Item as CjImportJob | undefined) ?? null;
}

export async function listCjImportJobs(limit = 30): Promise<CjImportJob[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: CONFIG_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": cjImportJobKeys.listPk() },
      ScanIndexForward: false,
      Limit: Math.min(50, Math.max(1, limit)),
    })
  );
  const summaries = (result.Items ?? []) as Array<{ jobId?: string }>;
  const jobs: CjImportJob[] = [];
  for (const row of summaries) {
    if (!row.jobId) continue;
    const job = await getCjImportJob(row.jobId);
    if (job) jobs.push(job);
  }
  return jobs;
}

export async function fetchCjAdminCatalogPage(input: {
  keyWord?: string;
  page?: number;
  size?: number;
  categoryId?: string;
  countryCode?: string;
}): Promise<{
  products: ReturnType<typeof flattenListV2>;
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}> {
  const page = input.page ?? 1;
  const size = Math.min(input.size ?? CJ_ADMIN_CATALOG_PAGE_SIZE, CJ_ADMIN_CATALOG_PAGE_SIZE);
  const cjPages = Math.max(1, Math.ceil(size / CJ_LIST_V2_PAGE_SIZE));
  const firstCjPage = (page - 1) * cjPages + 1;
  let totalRecords = 0;
  const products: CjListProduct[] = [];

  for (let i = 0; i < cjPages; i++) {
    const data = await cjListProductsV2({
      keyWord: input.keyWord,
      page: firstCjPage + i,
      size: CJ_LIST_V2_PAGE_SIZE,
      categoryId: input.categoryId,
      countryCode: input.countryCode,
    });
    totalRecords = data.totalRecords ?? totalRecords;
    products.push(...flattenListV2(data));
  }

  return {
    products: products.slice(0, size),
    page,
    pageSize: size,
    totalRecords,
    totalPages: Math.max(1, Math.ceil((totalRecords || products.length) / size)),
  };
}

export async function enqueueCjImportJob(input: {
  pids: string[];
  names?: Record<string, string>;
  createdBy?: string;
  source: "selected" | "spice";
  keyword?: string;
  categorySlug?: string;
  published?: boolean;
}): Promise<CjImportJob> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const pid of input.pids) {
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    unique.push(pid);
  }
  if (!unique.length) throw new Error("Select at least one product");

  const imported = await listImportedCjPids();
  const items: CjImportJobLine[] = unique.map((pid) => ({
    pid,
    ...(input.names?.[pid] ? { name: input.names[pid] } : {}),
    status: imported.has(pid) ? "skipped" : "pending",
  }));

  const timestamp = now();
  const jobId = randomUUID();
  const counts = countsFromItems(items);
  const allSkipped = counts.pending === 0;
  const job: CjImportJob = {
    jobId,
    status: allSkipped ? "complete" : "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(allSkipped ? { finishedAt: timestamp } : {}),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    source: input.source,
    ...(input.keyword ? { keyword: input.keyword } : {}),
    items,
    counts,
  };
  await putJob(job);

  if (!allSkipped) {
    await startCjImportWorker(jobId);
  }
  return job;
}

export async function startCjImportWorker(jobId: string): Promise<void> {
  const functionName = process.env.CJ_IMPORT_WORKER_FUNCTION;
  if (!functionName) {
    void processCjImportJob(jobId).catch((err) => console.error("CJ import job failed", jobId, err));
    return;
  }
  await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({ jobId })),
    })
  );
}

export async function processCjImportJob(
  jobId: string,
  remainingMs?: () => number
): Promise<CjImportJob | null> {
  const job = await getCjImportJob(jobId);
  if (!job) return null;
  if (job.status === "complete" || job.status === "failed") return job;

  const items = job.items.map((item) =>
    item.status === "in_progress" ? { ...item, status: "pending" as const } : item
  );
  const started: CjImportJob = {
    ...job,
    items,
    status: "in_progress",
    startedAt: job.startedAt ?? now(),
    updatedAt: now(),
    counts: countsFromItems(items),
  };
  await putJob(started);
  let current = started;
  const imported = await listImportedCjPids();

  for (let i = 0; i < current.items.length; i++) {
    if (current.items[i].status !== "pending") continue;
    if (remainingMs && remainingMs() < 45_000) {
      await startCjImportWorker(jobId);
      return current;
    }

    if (imported.has(current.items[i].pid)) {
      current.items[i] = { ...current.items[i], status: "skipped" };
      current.counts = countsFromItems(current.items);
      current.updatedAt = now();
      await putJob(current);
      continue;
    }

    current.items[i] = { ...current.items[i], status: "in_progress" };
    current.counts = countsFromItems(current.items);
    current.updatedAt = now();
    await putJob(current);

    try {
      const result = await importCjProduct(current.items[i].pid, {
        published: true,
        addToMyProduct: false,
        skipVideos: true,
      });
      current.items[i] = {
        ...current.items[i],
        status: result.created ? "complete" : "skipped",
        slug: result.product.slug,
        name: result.product.name,
      };
      imported.add(current.items[i].pid);
    } catch (err) {
      current.items[i] = {
        ...current.items[i],
        status: "failed",
        error: err instanceof Error ? err.message : "Import failed",
      };
    }
    current.counts = countsFromItems(current.items);
    current.updatedAt = now();
    await putJob(current);
  }

  const pendingLeft = current.items.some((item) => item.status === "pending" || item.status === "in_progress");
  current = {
    ...current,
    status: pendingLeft ? "in_progress" : "complete",
    ...(pendingLeft ? {} : { finishedAt: now() }),
    updatedAt: now(),
    counts: countsFromItems(current.items),
  };
  await putJob(current);
  return current;
}
