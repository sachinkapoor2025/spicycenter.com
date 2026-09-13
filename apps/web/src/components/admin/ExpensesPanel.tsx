"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  EXPENSE_BILL_STATUSES,
  EXPENSE_BILL_STATUS_LABELS,
  EXPENSE_MAX_BILL_IMAGES,
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  normalizeExpenseTypes,
  LEDGER_CURRENCIES,
  recordedByLabel,
  type Expense,
  type ExpenseBillStatus,
  type ExpenseType,
  type LedgerCurrency,
} from "@spicycorner/shared";
import { useAuth, useApiClient } from "@/lib/auth-context";
import { compressBillFiles } from "@/lib/compress-bill";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: number, currency: LedgerCurrency) {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function expenseBillUrls(ex: Expense): string[] {
  if (ex.billImageUrls?.length) return ex.billImageUrls;
  if (ex.billImageUrl) return [ex.billImageUrl];
  return [];
}

function resolveStatus(ex: Expense): ExpenseBillStatus {
  if (ex.billStatus) return ex.billStatus;
  if (ex.noBill) return "no_bill";
  return expenseBillUrls(ex).length ? "all_bills" : "no_bill";
}

export function ExpensesPanel() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const api = useApiClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalByCurrency, setTotalByCurrency] = useState({ USD: 0, INR: 0 });
  const [listCurrency, setListCurrency] = useState<LedgerCurrency | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<LedgerCurrency>("USD");
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(["shipping_charges"]);
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayYmd());
  const [billStatus, setBillStatus] = useState<ExpenseBillStatus>("all_bills");
  const [billFiles, setBillFiles] = useState<File[]>([]);
  const [existingBillUrls, setExistingBillUrls] = useState<string[]>([]);

  const toggleExpenseType = (t: ExpenseType) => {
    setExpenseTypes((prev) => {
      if (prev.includes(t)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== t);
      }
      return [...prev, t];
    });
  };

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setExpenseDate(todayYmd());
    setExpenseTypes(["shipping_charges"]);
    setCurrency("USD");
    setBillStatus("all_bills");
    setBillFiles([]);
    setExistingBillUrls([]);
    setEditing(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{
        expenses: Expense[];
        totalByCurrency?: { USD: number; INR: number };
        totalAmount?: number;
      }>("/admin/expenses");
      setExpenses(res.expenses ?? []);
      setTotalByCurrency(
        res.totalByCurrency ?? {
          USD: res.totalAmount ?? 0,
          INR: 0,
        }
      );
    } catch (err) {
      setExpenses([]);
      setError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) void load();
  }, [authLoading, isSuperAdmin, load]);

  const visibleExpenses = useMemo(() => {
    if (listCurrency === "ALL") return expenses;
    return expenses.filter((e) => (e.currency ?? "USD") === listCurrency);
  }, [expenses, listCurrency]);

  const startEdit = (ex: Expense) => {
    setEditing(ex);
    setAmount(String(ex.amount));
    setCurrency(ex.currency ?? "USD");
    setExpenseTypes(
      normalizeExpenseTypes({ expenseType: ex.expenseType, expenseTypes: ex.expenseTypes })
    );
    setDescription(ex.description ?? "");
    setExpenseDate(ex.expenseDate);
    setBillStatus(resolveStatus(ex));
    setExistingBillUrls(expenseBillUrls(ex));
    setBillFiles([]);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onBillFilesChange = (fileList: FileList | null) => {
    const next = Array.from(fileList ?? []);
    if (next.length > EXPENSE_MAX_BILL_IMAGES) {
      setError(`You can upload at most ${EXPENSE_MAX_BILL_IMAGES} bills`);
      setBillFiles(next.slice(0, EXPENSE_MAX_BILL_IMAGES));
      return;
    }
    setError("");
    setBillFiles(next);
  };

  const uploadBill = async (file: File): Promise<string> => {
    const contentType = file.type || "image/jpeg";
    const presign = await api<{ uploadUrl: string; publicUrl: string }>("/uploads/presign", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType,
        folder: "expenses",
      }),
    });
    const uploadRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType },
    });
    if (!uploadRes.ok) throw new Error(`Bill upload failed: ${file.name}`);
    return presign.publicUrl;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid amount");

      let billImageUrls: string[] = [];
      if (billStatus === "no_bill") {
        billImageUrls = [];
      } else {
        const compressed = await compressBillFiles(billFiles);
        const uploaded: string[] = [];
        for (const file of compressed) {
          uploaded.push(await uploadBill(file));
        }
        billImageUrls = editing
          ? [...existingBillUrls, ...uploaded].slice(0, EXPENSE_MAX_BILL_IMAGES)
          : uploaded;
        if (billImageUrls.length === 0) {
          throw new Error("Upload at least one bill, or select “This expense has no bill”");
        }
      }

      if (expenseTypes.length === 0) {
        throw new Error("Select at least one expense type");
      }

      const body = {
        amount: value,
        currency,
        expenseType: expenseTypes[0],
        expenseTypes,
        description: description.trim() || undefined,
        expenseDate,
        billStatus,
        noBill: billStatus === "no_bill",
        billImageUrls,
      };

      if (editing) {
        await api(`/admin/expenses/${editing.expenseId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setMessage("Expense updated");
      } else {
        await api("/admin/expenses", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setMessage("Expense saved");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expenseId: string) => {
    if (!confirm("Delete this expense?")) return;
    setError("");
    try {
      await api(`/admin/expenses/${expenseId}`, { method: "DELETE" });
      if (editing?.expenseId === expenseId) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (authLoading) {
    return <div className="p-10 text-slate-500">Loading…</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Super admin only</h1>
        <Link href="/admin" className="text-sm text-accent hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <h2 className="text-lg font-semibold mb-1">Expense</h2>
      <p className="text-slate-600 text-sm mb-6">
        Track business expenses. Images are compressed before upload (max {EXPENSE_MAX_BILL_IMAGES}{" "}
        bills).
      </p>

      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 mb-8 space-y-4">
        {editing && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span>Editing expense {editing.expenseId.slice(0, 8)}…</span>
            <button type="button" className="text-accent hover:underline" onClick={resetForm}>
              Cancel edit
            </button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="block text-sm">
            <span className="text-slate-700 font-medium">Expense amount</span>
            <div className="mt-1 flex items-center gap-4 mb-2">
              {LEDGER_CURRENCIES.map((c) => (
                <label key={c} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="expense-currency"
                    value={c}
                    checked={currency === c}
                    onChange={() => setCurrency(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="block text-sm sm:col-span-2">
            <span className="text-slate-700 font-medium">Expense type</span>
            <p className="text-xs text-slate-500 mt-0.5 mb-2">
              Select one or more — e.g. Shipping, Inventory Purchase, and Purchase Bills together.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXPENSE_TYPES.map((t) => {
                const checked = expenseTypes.includes(t);
                return (
                  <label
                    key={t}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      checked
                        ? "border-nav bg-blue-50 text-nav"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExpenseType(t)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm font-medium">{EXPENSE_TYPE_LABELS[t]}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <label className="block text-sm">
            <span className="text-slate-700 font-medium">Expense date</span>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </label>
          <div className="block text-sm space-y-2">
            <span className="text-slate-700 font-medium">Bill availability</span>
            <div className="space-y-1.5">
              {EXPENSE_BILL_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-slate-700">
                  <input
                    type="radio"
                    name="bill-status"
                    checked={billStatus === s}
                    onChange={() => {
                      setBillStatus(s);
                      if (s === "no_bill") {
                        setBillFiles([]);
                        setExistingBillUrls([]);
                      }
                    }}
                  />
                  {EXPENSE_BILL_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
            {billStatus !== "no_bill" && (
              <div>
                <span className="text-slate-700 font-medium">
                  Bill / invoice images (max {EXPENSE_MAX_BILL_IMAGES})
                </span>
                {editing && existingBillUrls.length > 0 && (
                  <ul className="mt-1 text-xs text-slate-600 space-y-0.5">
                    {existingBillUrls.map((url, i) => (
                      <li key={url} className="flex items-center gap-2">
                        <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                          Existing {i + 1}
                        </a>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() =>
                            setExistingBillUrls((prev) => prev.filter((u) => u !== url))
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  multiple
                  onChange={(e) => onBillFilesChange(e.target.files)}
                  className="mt-1 w-full text-sm"
                />
                {billFiles.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {billFiles.length} new file(s) selected (will be compressed if images)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <label className="block text-sm">
          <span className="text-slate-700 font-medium">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-nav text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Update expense" : "Add expense"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {message && <p className="text-sm text-emerald-700 mb-3">{message}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <h2 className="text-lg font-semibold">All expenses</h2>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {(["ALL", "USD", "INR"] as const).map((c) => (
            <label key={c} className="inline-flex items-center gap-1.5 text-slate-700">
              <input
                type="radio"
                name="expense-list-currency"
                checked={listCurrency === c}
                onChange={() => setListCurrency(c)}
              />
              {c === "ALL" ? "All" : c}
            </label>
          ))}
          <p className="text-slate-600">
            Total:{" "}
            <span className="font-semibold text-slate-900">
              {listCurrency === "ALL"
                ? `${formatMoney(totalByCurrency.USD, "USD")} · ${formatMoney(totalByCurrency.INR, "INR")}`
                : formatMoney(totalByCurrency[listCurrency], listCurrency)}
            </span>
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : visibleExpenses.length === 0 ? (
        <p className="text-slate-500 text-sm">No expenses recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Bills</th>
                <th className="py-3 px-3">Logged by</th>
                <th className="py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleExpenses.map((ex) => {
                const urls = expenseBillUrls(ex);
                const status = resolveStatus(ex);
                return (
                  <tr key={ex.expenseId} className="border-t border-slate-100">
                    <td className="py-3 px-3 whitespace-nowrap">{ex.expenseDate}</td>
                    <td className="py-3 px-3">
                      {normalizeExpenseTypes({
                        expenseType: ex.expenseType,
                        expenseTypes: ex.expenseTypes,
                      })
                        .map((t) => EXPENSE_TYPE_LABELS[t])
                        .join(", ")}
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {formatMoney(ex.amount, ex.currency ?? "USD")}
                    </td>
                    <td className="py-3 px-3">
                      {status === "no_bill" || urls.length === 0 ? (
                        <span className="text-slate-500">No bill</span>
                      ) : (
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="text-xs text-slate-500">
                            {EXPENSE_BILL_STATUS_LABELS[status]}
                          </span>
                          <span className="inline-flex flex-wrap gap-2">
                            {urls.map((url, i) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent hover:underline"
                              >
                                View {urls.length > 1 ? i + 1 : ""}
                              </a>
                            ))}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 max-w-[9rem]">
                      {ex.createdBy ? recordedByLabel(ex.createdBy, "expense") : "—"}
                    </td>
                    <td className="py-3 px-3 space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(ex)}
                        className="text-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(ex.expenseId)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
