import { z } from "zod";

export const LEDGER_CURRENCIES = ["USD", "INR"] as const;

export type LedgerCurrency = (typeof LEDGER_CURRENCIES)[number];

export const EXPENSE_MAX_BILL_IMAGES = 10;

export const EXPENSE_TYPES = [
  "shipping_charges",
  "inventory_purchase",
  "bills",
  "marketing",
  "office_expense",
  "other",
] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  shipping_charges: "Shipping Charges",
  inventory_purchase: "Inventory Purchase",
  bills: "Purchase Bills",
  marketing: "Marketing",
  office_expense: "Office Expense",
  other: "Other",
};

/** Bill availability for an expense. */
export const EXPENSE_BILL_STATUSES = ["all_bills", "partial_bills", "no_bill"] as const;
export type ExpenseBillStatus = (typeof EXPENSE_BILL_STATUSES)[number];

export const EXPENSE_BILL_STATUS_LABELS: Record<ExpenseBillStatus, string> = {
  all_bills: "I have all bills",
  partial_bills: "I have partial bills",
  no_bill: "This expense has no bill",
};

const billUrlSchema = z.string().url();

function collectBillUrls(data: {
  billImageUrls?: string[];
  billImageUrl?: string;
}): string[] {
  return Array.from(
    new Set(
      [
        ...(data.billImageUrls ?? []),
        ...(data.billImageUrl?.trim() ? [data.billImageUrl.trim()] : []),
      ].filter(Boolean)
    )
  );
}

function resolveBillStatus(data: {
  billStatus?: ExpenseBillStatus;
  noBill?: boolean;
}): ExpenseBillStatus {
  if (data.billStatus) return data.billStatus;
  if (data.noBill) return "no_bill";
  return "all_bills";
}

const expenseTypeEnum = z.enum(EXPENSE_TYPES);

/** Normalize single + multi type fields into a unique ordered list. */
export function normalizeExpenseTypes(input: {
  expenseType?: ExpenseType;
  expenseTypes?: ExpenseType[];
}): ExpenseType[] {
  const fromMulti = (input.expenseTypes ?? []).filter(Boolean);
  const merged = fromMulti.length
    ? fromMulti
    : input.expenseType
      ? [input.expenseType]
      : [];
  const unique: ExpenseType[] = [];
  for (const t of merged) {
    if (!unique.includes(t)) unique.push(t);
  }
  return unique;
}

function refineExpenseTypes(
  data: { expenseType?: ExpenseType; expenseTypes?: ExpenseType[] },
  ctx: z.RefinementCtx
) {
  const types = normalizeExpenseTypes(data);
  if (types.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one expense type",
      path: ["expenseTypes"],
    });
  }
}

export const createExpenseSchema = z
  .object({
    amount: z.number().positive(),
    currency: z.enum(LEDGER_CURRENCIES).default("USD"),
    /** Primary type (first selected). Kept for older clients. */
    expenseType: expenseTypeEnum.optional(),
    /** Multi-select types (Shipping, Inventory, Purchase Bills, …). */
    expenseTypes: z.array(expenseTypeEnum).min(1).max(EXPENSE_TYPES.length).optional(),
    description: z.string().trim().max(2000).optional(),
    expenseDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expenseDate must be YYYY-MM-DD"),
    billStatus: z.enum(EXPENSE_BILL_STATUSES).optional(),
    /** @deprecated use billStatus === "no_bill" */
    noBill: z.boolean().optional(),
    billImageUrls: z.array(billUrlSchema).max(EXPENSE_MAX_BILL_IMAGES).optional(),
    billImageUrl: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    refineExpenseTypes(data, ctx);
    const status = resolveBillStatus(data);
    const unique = collectBillUrls(data);
    if (status === "no_bill" && unique.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clear bill uploads when marking expense as having no bill",
        path: ["billStatus"],
      });
    }
    if (status !== "no_bill" && unique.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Upload at least one bill, or select “This expense has no bill”",
        path: ["billImageUrls"],
      });
    }
    if (unique.length > EXPENSE_MAX_BILL_IMAGES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Maximum ${EXPENSE_MAX_BILL_IMAGES} bill images allowed`,
        path: ["billImageUrls"],
      });
    }
  });

export const updateExpenseSchema = z
  .object({
    amount: z.number().positive().optional(),
    currency: z.enum(LEDGER_CURRENCIES).optional(),
    expenseType: expenseTypeEnum.optional(),
    expenseTypes: z.array(expenseTypeEnum).min(1).max(EXPENSE_TYPES.length).optional(),
    description: z.string().trim().max(2000).optional(),
    expenseDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expenseDate must be YYYY-MM-DD")
      .optional(),
    billStatus: z.enum(EXPENSE_BILL_STATUSES).optional(),
    noBill: z.boolean().optional(),
    billImageUrls: z.array(billUrlSchema).max(EXPENSE_MAX_BILL_IMAGES).optional(),
    billImageUrl: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.expenseType !== undefined || data.expenseTypes !== undefined) {
      refineExpenseTypes(data, ctx);
    }
  });

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export type Expense = {
  expenseId: string;
  amount: number;
  currency: LedgerCurrency;
  /** Primary / first type (backward compatible). */
  expenseType: ExpenseType;
  /** All selected types when multi-select is used. */
  expenseTypes?: ExpenseType[];
  description?: string;
  expenseDate: string;
  billStatus?: ExpenseBillStatus;
  /** @deprecated use billStatus */
  noBill?: boolean;
  billImageUrls?: string[];
  billImageUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export { resolveBillStatus, collectBillUrls };
