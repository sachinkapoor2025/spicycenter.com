import type { BulkPaymentLedgerRow, PaymentLedgerSource } from "@spicycorner/shared";

export type SettlementParseIssue = {
  rowNumber: number;
  reason: string;
};

export type SettlementParseResult = {
  rows: BulkPaymentLedgerRow[];
  skipped: SettlementParseIssue[];
  detectedColumns: { date?: string; amount?: string; fee?: string };
};

const DATE_ALIASES = [
  "received date",
  "receiveddate",
  "date received",
  "arrival date",
  "arrival date (utc)",
  "arrival_date",
  "settlement date",
  "settlement_date",
  "settled_at",
  "settled at",
  "payout date",
  "payout_date",
  "payment date",
  "payment_date",
  "transaction date",
  "transaction_date",
  "created (utc)",
  "created",
  "date",
];

const AMOUNT_ALIASES = [
  "net",
  "net amount",
  "amount settled",
  "amount_settled",
  "settled amount",
  "settled_amount",
  "payout amount",
  "payout_amount",
  "credit",
  "amount",
  "total",
  "settlement amount",
];

const FEE_ALIASES = ["fee", "fees", "gateway fee", "gateway_fee", "total fee", "processing fee"];

const NOTE_ALIASES = [
  "notes",
  "note",
  "description",
  "narration",
  "utr",
  "settlement utr",
  "payout id",
  "payout_id",
  "id",
];

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_]+/g, " ");
}

function findColumn(headers: string[], aliases: string[]): string | undefined {
  const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));
  for (const alias of aliases) {
    const hit = normalized.find((h) => h.key === alias);
    if (hit) return hit.raw;
  }
  for (const alias of aliases) {
    const hit = normalized.find((h) => h.key.includes(alias));
    if (hit) return hit.raw;
  }
  return undefined;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Parse gateway date cells (Excel Date, ISO, DD/MM/YYYY, MM/DD/YYYY). */
export function parseSettlementDate(value: unknown, preferDayFirst: boolean): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date (days since 1899-12-30)
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + Math.round(value) * 86_400_000;
    const dt = new Date(ms);
    if (!Number.isNaN(dt.getTime())) {
      return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
    }
  }

  const s = String(value).trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return ymd(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    let a = Number(dmy[1]);
    let b = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    if (a > 12 && b <= 12) return ymd(y, b, a); // DD/MM
    if (b > 12 && a <= 12) return ymd(y, a, b); // MM/DD
    return preferDayFirst ? ymd(y, b, a) : ymd(y, a, b);
  }

  const named = Date.parse(s);
  if (!Number.isNaN(named)) {
    const dt = new Date(named);
    return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
  }

  return null;
}

export function parseSettlementAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(Math.abs(value) * 100) / 100;
  }
  let s = String(value).trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s
    .replace(/[($₹,\s]/g, "")
    .replace(/[)]/g, "")
    .replace(/^-/, "");
  const n = Number(s);
  if (!Number.isFinite(n) || n === 0) return null;
  const abs = Math.round(Math.abs(n) * 100) / 100;
  // Skip refunds / debits — settlements are credits
  if (negative) return null;
  return abs;
}

function cell(row: Record<string, unknown>, key?: string): unknown {
  if (!key) return undefined;
  if (key in row) return row[key];
  const found = Object.keys(row).find((k) => normalizeHeader(k) === normalizeHeader(key));
  return found ? row[found] : undefined;
}

function shouldSkipStatus(row: Record<string, unknown>): boolean {
  const statusKey = Object.keys(row).find((k) => {
    const n = normalizeHeader(k);
    return n === "status" || n === "payout status" || n === "settlement status";
  });
  if (!statusKey) return false;
  const status = String(row[statusKey] ?? "")
    .trim()
    .toLowerCase();
  if (!status) return false;
  // Keep paid / settled / completed / paid out
  if (/(paid|settled|completed|available|processed|success)/.test(status)) return false;
  if (/(fail|cancel|pending|in_transit|in transit|open|draft)/.test(status)) return true;
  return false;
}

/**
 * Parse rows from a gateway export (Stripe / Razorpay / generic).
 * Expects objects keyed by spreadsheet headers (sheet_to_json).
 */
export function parseSettlementRows(
  records: Record<string, unknown>[],
  paymentSource: PaymentLedgerSource
): SettlementParseResult {
  const skipped: SettlementParseIssue[] = [];
  const rows: BulkPaymentLedgerRow[] = [];
  if (!records.length) {
    return { rows, skipped, detectedColumns: {} };
  }

  const headers = Object.keys(records[0]!);
  const dateCol = findColumn(headers, DATE_ALIASES);
  const amountCol = findColumn(headers, AMOUNT_ALIASES);
  const feeCol = findColumn(headers, FEE_ALIASES);
  const noteCol = findColumn(headers, NOTE_ALIASES);
  const preferDayFirst = paymentSource === "razorpay";

  if (!dateCol || !amountCol) {
    skipped.push({
      rowNumber: 1,
      reason: `Could not find date/amount columns. Found headers: ${headers.slice(0, 12).join(", ") || "(none)"}`,
    });
    return {
      rows,
      skipped,
      detectedColumns: { date: dateCol, amount: amountCol, fee: feeCol },
    };
  }

  const seenInFile = new Set<string>();

  records.forEach((record, idx) => {
    const rowNumber = idx + 2; // header is row 1
    const values = Object.values(record).map((v) => String(v ?? "").trim());
    if (values.every((v) => !v)) return;

    if (shouldSkipStatus(record)) {
      skipped.push({ rowNumber, reason: "Skipped non-settled status row" });
      return;
    }

    const receivedDate = parseSettlementDate(cell(record, dateCol), preferDayFirst);
    if (!receivedDate) {
      skipped.push({ rowNumber, reason: "Missing or invalid transaction date" });
      return;
    }

    const amount = parseSettlementAmount(cell(record, amountCol));
    if (amount == null || amount <= 0) {
      skipped.push({ rowNumber, reason: "Missing or invalid transaction amount" });
      return;
    }

    const feeRaw = parseSettlementAmount(cell(record, feeCol));
    const gatewayFee = feeRaw != null && feeRaw > 0 ? feeRaw : undefined;
    const noteRaw = noteCol ? String(cell(record, noteCol) ?? "").trim() : "";
    const notes = noteRaw ? noteRaw.slice(0, 2000) : undefined;

    const dedupe = `${receivedDate}|${amount.toFixed(2)}`;
    if (seenInFile.has(dedupe)) {
      skipped.push({
        rowNumber,
        reason: `Duplicate row in file for ${receivedDate} / ${amount.toFixed(2)}`,
      });
      return;
    }
    seenInFile.add(dedupe);

    rows.push({
      amount,
      receivedDate,
      ...(gatewayFee !== undefined ? { gatewayFee } : {}),
      ...(notes ? { notes } : {}),
      rowNumber,
    });
  });

  return {
    rows,
    skipped,
    detectedColumns: { date: dateCol, amount: amountCol, fee: feeCol },
  };
}

/** Read .xlsx / .xls / .csv via SheetJS. */
export async function parseSettlementFile(
  file: File,
  paymentSource: PaymentLedgerSource
): Promise<SettlementParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      skipped: [{ rowNumber: 1, reason: "Workbook has no sheets" }],
      detectedColumns: {},
    };
  }
  const sheet = workbook.Sheets[sheetName]!;
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  // Prefer raw dates when available
  const recordsRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  const merged = records.map((row, i) => {
    const raw = recordsRaw[i] ?? {};
    const out: Record<string, unknown> = { ...row };
    for (const [k, v] of Object.entries(raw)) {
      if (v instanceof Date) out[k] = v;
      else if (typeof v === "number" && typeof row[k] === "string") out[k] = v;
    }
    return out;
  });
  return parseSettlementRows(merged, paymentSource);
}
