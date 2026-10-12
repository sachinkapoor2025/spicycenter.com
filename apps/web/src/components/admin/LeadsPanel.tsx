"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import {
  ADMIN_LEAD_SOURCE_OPTIONS,
  LEAD_CSV_HEADERS,
  LEAD_STATUS,
  formatLeadNotifyStatus,
  leadCanRetryNotifyEmail,
  leadCsvRow,
  leadEnquiryFields,
  leadsCountCaption,
  type LeadStatus,
} from "@spicycorner/shared";
import { downloadCsv, type SortDir } from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";
import {
  applyLeadRetryToList,
  interpretLeadRetryResponse,
  leadRetryButtonState,
  leadRetryRequestBody,
  leadRetryThrownMessage,
  type LeadRetryEmailResponse,
} from "@/lib/lead-retry-ui";

interface Lead {
  leadId: string;
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  page?: string;
  productSlug?: string;
  source?: string;
  createdAt: string;
  leadStatus?: LeadStatus;
  adminNotes?: string;
  assignedTo?: string;
  metadata?: Record<string, string>;
  notifyEmailStatus?: "sent" | "failed" | "skipped";
  notifyEmailAt?: string;
  notifyEmailError?: string;
  PK?: string;
}

type LeadsResponse = {
  leads: Lead[];
  total: number;
  filteredTotal?: number;
  filteredTotalExact: boolean;
  nextCursor?: string;
  limit: number;
};

const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: LEAD_STATUS.NEW, label: "New" },
  { id: LEAD_STATUS.CONTACTED, label: "Contacted" },
  { id: LEAD_STATUS.FOLLOW_UP, label: "Follow-up" },
  { id: LEAD_STATUS.QUALIFIED, label: "Qualified" },
  { id: LEAD_STATUS.QUOTATION_SENT, label: "Quotation sent" },
  { id: LEAD_STATUS.NEGOTIATION, label: "Negotiation" },
  { id: LEAD_STATUS.CONVERTED, label: "Converted" },
  { id: LEAD_STATUS.WON, label: "Won" },
  { id: LEAD_STATUS.LOST, label: "Lost" },
  { id: LEAD_STATUS.SPAM, label: "Spam" },
  { id: LEAD_STATUS.CLOSED, label: "Closed" },
];

function normalizeLead(lead: Lead): Lead {
  return {
    ...lead,
    sessionId: lead.sessionId ?? lead.PK?.replace("SESSION#", "") ?? "",
    leadStatus: lead.leadStatus ?? LEAD_STATUS.NEW,
  };
}

export function LeadsPanel() {
  const apiClient = useApiClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState<number | undefined>();
  const [filteredTotalExact, setFilteredTotalExact] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const pageCursorsRef = useRef<string[]>(["", ""]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const retryingRef = useRef<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<{
    leadId: string;
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filterApplied = Boolean(
    (sourceFilter && sourceFilter !== "all") ||
      (statusFilter && statusFilter !== "all") ||
      dateFrom ||
      q.trim()
  );

  useEffect(() => {
    setPage(1);
    pageCursorsRef.current = ["", ""];
    setHasNextPage(false);
    setSelected(new Set());
  }, [dateFrom, pageSize, q, sortDir, sourceFilter, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("dir", sortDir);
    const cursor = page <= 1 ? "" : (pageCursorsRef.current[page] ?? "");
    if (cursor) params.set("cursor", cursor);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (q.trim()) params.set("q", q.trim());

    apiClient<LeadsResponse>(`/admin/leads?${params.toString()}`)
      .then((d) => {
        if (cancelled) return;
        setLeads((d.leads ?? []).map(normalizeLead));
        setTotal(d.total ?? 0);
        setFilteredTotal(d.filteredTotal);
        setFilteredTotalExact(Boolean(d.filteredTotalExact));
        const cursors = [...pageCursorsRef.current];
        cursors[page + 1] = d.nextCursor ?? "";
        pageCursorsRef.current = cursors;
        setHasNextPage(Boolean(d.nextCursor));
      })
      .catch(() => {
        if (cancelled) return;
        setLeads([]);
        setTotal(0);
        setFilteredTotal(undefined);
        setFilteredTotalExact(true);
        setHasNextPage(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, dateFrom, page, pageSize, q, sortDir, sourceFilter, statusFilter]);

  const pageNew = leads.filter((l) => (l.leadStatus ?? LEAD_STATUS.NEW) === LEAD_STATUS.NEW).length;
  const pageConverted = leads.filter((l) => l.leadStatus === LEAD_STATUS.CONVERTED).length;
  const matchedTotal = filterApplied ? filteredTotal : total;
  const totalPages =
    filteredTotalExact && matchedTotal != null
      ? Math.max(1, Math.ceil(matchedTotal / pageSize))
      : hasNextPage
        ? page + 1
        : page;

  const updateLead = async (lead: Lead, patch: Partial<Lead>) => {
    setSaving(true);
    try {
      await apiClient("/admin/leads", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: lead.sessionId,
          createdAt: lead.createdAt,
          leadStatus: patch.leadStatus,
          adminNotes: patch.adminNotes,
          assignedTo: patch.assignedTo,
        }),
      });
      setLeads((prev) =>
        prev.map((l) => (l.leadId === lead.leadId ? { ...l, ...patch } : l))
      );
    } finally {
      setSaving(false);
    }
  };

  const exportLeads = async () => {
    const rows: Lead[] = [];
    let cursor = "";
    for (let i = 0; i < 20; i++) {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("dir", sortDir);
      if (cursor) params.set("cursor", cursor);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (q.trim()) params.set("q", q.trim());
      const d = await apiClient<LeadsResponse>(`/admin/leads?${params.toString()}`);
      rows.push(...(d.leads ?? []).map(normalizeLead));
      if (!d.nextCursor) break;
      cursor = d.nextCursor;
    }
    downloadCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, [
      LEAD_CSV_HEADERS,
      ...rows.map(leadCsvRow),
    ]);
  };

  const bulkStatus = async (status: LeadStatus) => {
    const subset = leads.filter((l) => selected.has(l.leadId));
    for (const l of subset) {
      await updateLead(l, { leadStatus: status });
    }
    setSelected(new Set());
  };

  const deleteSelected = () => {
    setLeads((prev) => prev.filter((l) => !selected.has(l.leadId)));
    setSelected(new Set());
  };

  const retryLeadEmail = async (lead: Lead) => {
    if (retryingRef.current === lead.leadId || !leadCanRetryNotifyEmail(lead)) return;
    retryingRef.current = lead.leadId;
    setRetryingId(lead.leadId);
    setRetryFeedback(null);
    try {
      const body = await apiClient<LeadRetryEmailResponse>("/admin/leads/retry-email", {
        method: "POST",
        body: JSON.stringify(leadRetryRequestBody(lead)),
      });
      const outcome = interpretLeadRetryResponse(body);
      if (outcome.kind === "updated") {
        setLeads((prev) => applyLeadRetryToList(prev, lead.leadId, outcome.patch));
      }
      setRetryFeedback({ leadId: lead.leadId, tone: outcome.tone, text: outcome.message });
    } catch (err) {
      setRetryFeedback({
        leadId: lead.leadId,
        tone: "error",
        text: leadRetryThrownMessage(err),
      });
    } finally {
      retryingRef.current = null;
      setRetryingId(null);
    }
  };

  const caption = useMemo(
    () =>
      leadsCountCaption({
        total,
        filteredTotal,
        filteredTotalExact,
        loaded: leads.length,
        filterApplied,
      }),
    [filterApplied, filteredTotal, filteredTotalExact, leads.length, total]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <h2 className="text-lg font-semibold mb-2">Leads</h2>
      <p className="text-slate-600 text-sm mb-4">
        Catalogue enquiries and other captured contacts. Use for outreach and sales.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-2">
        {[
          { label: "Total leads", value: total, hint: "All stored leads" },
          { label: "New", value: pageNew, hint: "On this page" },
          { label: "Converted", value: pageConverted, hint: "On this page" },
        ].map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-4">
            <p className="text-xs uppercase text-slate-400">{k.label}</p>
            <p className="text-xl font-bold mt-1">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1">{k.hint}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mb-4">{caption}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <input
          type="search"
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          {ADMIN_LEAD_SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All sources" : s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
          title="From date"
        />
      </div>

      <TableControls
        page={page}
        totalPages={totalPages}
        total={filteredTotalExact && matchedTotal != null ? matchedTotal : leads.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortLabel="Date"
        sortDir={sortDir}
        onSortToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        onExport={() => void exportLeads()}
      >
        {selected.size > 0 && (
          <>
            <button
              type="button"
              onClick={() => bulkStatus(LEAD_STATUS.CONTACTED)}
              className="text-sm border rounded-lg px-3 py-1.5"
              disabled={saving}
            >
              Mark contacted ({selected.size})
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="text-sm border border-red-200 text-red-700 rounded-lg px-3 py-1.5"
            >
              Remove selected
            </button>
          </>
        )}
      </TableControls>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : leads.length === 0 ? (
        <p className="text-slate-600">No leads found.</p>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(leads.map((l) => l.leadId)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Notify</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <Fragment key={l.leadId}>
                  <tr className="border-t align-top">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selected.has(l.leadId)}
                        onChange={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(l.leadId)) next.delete(l.leadId);
                            else next.add(l.leadId);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="py-3 px-4">{l.name ?? "—"}</td>
                    <td className="py-3 px-4">
                      <div>{l.email ?? "—"}</div>
                      {l.phone && <div className="text-xs text-slate-400">{l.phone}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={l.leadStatus ?? LEAD_STATUS.NEW}
                        onChange={(e) =>
                          updateLead(l, { leadStatus: e.target.value as LeadStatus })
                        }
                        className="text-xs border rounded px-1 py-0.5"
                        disabled={saving}
                      >
                        {STATUS_OPTIONS.filter((o) => o.id !== "all").map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 capitalize">{l.source ?? "—"}</td>
                    <td className="py-3 px-4 text-xs">{formatLeadNotifyStatus(l.notifyEmailStatus)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === l.leadId ? null : l.leadId)}
                        className="text-xs text-nav hover:underline mr-2"
                      >
                        Details
                      </button>
                      {l.email && (
                        <a href={`mailto:${l.email}`} className="text-xs text-nav hover:underline">
                          Email
                        </a>
                      )}
                    </td>
                  </tr>
                  {expanded === l.leadId && (
                    <tr className="border-t bg-slate-50">
                      <td colSpan={8} className="py-3 px-4 text-sm">
                        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                          {leadEnquiryFields(l).map((row) => (
                            <div key={row.label} className={row.label === "Message" ? "sm:col-span-2" : ""}>
                              <dt className="text-xs uppercase tracking-wide text-slate-500">{row.label}</dt>
                              <dd className="mt-0.5 whitespace-pre-wrap">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="mt-3 flex gap-2">
                          <input
                            placeholder="Assigned to"
                            defaultValue={l.assignedTo ?? ""}
                            onBlur={(e) => updateLead(l, { assignedTo: e.target.value })}
                            className="text-xs border rounded px-2 py-1 flex-1"
                          />
                          <input
                            placeholder="Notes"
                            defaultValue={l.adminNotes ?? ""}
                            onBlur={(e) => updateLead(l, { adminNotes: e.target.value })}
                            className="text-xs border rounded px-2 py-1 flex-[2]"
                          />
                        </div>
                        {leadCanRetryNotifyEmail(l) && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => void retryLeadEmail(l)}
                              disabled={leadRetryButtonState(retryingId === l.leadId).disabled}
                              aria-busy={leadRetryButtonState(retryingId === l.leadId).busy}
                              className="text-xs border rounded-lg px-3 py-1.5 disabled:opacity-50"
                            >
                              {leadRetryButtonState(retryingId === l.leadId).label}
                            </button>
                          </div>
                        )}
                        {retryFeedback?.leadId === l.leadId && (
                          <p
                            role="status"
                            className={`mt-2 text-xs ${
                              retryFeedback.tone === "error" ? "text-red-700" : "text-emerald-700"
                            }`}
                          >
                            {retryFeedback.text}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
