"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import { LEAD_STATUS, type LeadStatus } from "@spicycorner/shared";
import { downloadCsv, paginate, sortItems, type SortDir } from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";

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
}

const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: LEAD_STATUS.NEW, label: "New" },
  { id: LEAD_STATUS.CONTACTED, label: "Contacted" },
  { id: LEAD_STATUS.FOLLOW_UP, label: "Follow-up" },
  { id: LEAD_STATUS.CONVERTED, label: "Converted" },
];

const SOURCE_OPTIONS = ["all", "checkout", "newsletter", "product", "browse", "contact"];

export function LeadsPanel() {
  const apiClient = useApiClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiClient<{ leads: Lead[] }>("/admin/leads")
      .then((d) =>
        setLeads(
          d.leads.map((l) => ({
            ...l,
            sessionId: l.sessionId ?? (l as { PK?: string }).PK?.replace("SESSION#", "") ?? "",
            leadStatus: l.leadStatus ?? LEAD_STATUS.NEW,
          }))
        )
      )
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () => ({
      total: leads.length,
      new: leads.filter((l) => (l.leadStatus ?? LEAD_STATUS.NEW) === LEAD_STATUS.NEW).length,
      converted: leads.filter((l) => l.leadStatus === LEAD_STATUS.CONVERTED).length,
    }),
    [leads]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = leads.filter((l) => {
      if (statusFilter !== "all" && (l.leadStatus ?? LEAD_STATUS.NEW) !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (dateFrom && l.createdAt.slice(0, 10) < dateFrom) return false;
      if (!q) return true;
      return (
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q)
      );
    });
    list = sortItems(list, (l) => l.createdAt, sortDir);
    return list;
  }, [leads, search, statusFilter, sourceFilter, dateFrom, sortDir]);

  const { items: pageItems, totalPages, total } = paginate(filtered, page, pageSize);

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

  const exportLeads = () => {
    downloadCsv(
      `leads-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        ["Name", "Email", "Phone", "Status", "Source", "Page", "Created", "Assigned", "Notes"],
        ...filtered.map((l) => [
          l.name ?? "",
          l.email ?? "",
          l.phone ?? "",
          l.leadStatus ?? LEAD_STATUS.NEW,
          l.source ?? "",
          l.page ?? l.productSlug ?? "",
          l.createdAt,
          l.assignedTo ?? "",
          l.adminNotes ?? "",
        ]),
      ]
    );
  };

  const bulkStatus = async (status: LeadStatus) => {
    const subset = filtered.filter((l) => selected.has(l.leadId));
    for (const l of subset) {
      await updateLead(l, { leadStatus: status });
    }
    setSelected(new Set());
  };

  const deleteSelected = () => {
    setLeads((prev) => prev.filter((l) => !selected.has(l.leadId)));
    setSelected(new Set());
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <h2 className="text-lg font-semibold mb-2">Leads</h2>
      <p className="text-slate-600 text-sm mb-4">
        Partial customer data captured as users browse — use for outreach and sales.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total leads", value: summary.total },
          { label: "New leads", value: summary.new },
          { label: "Converted", value: summary.converted },
        ].map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-4">
            <p className="text-xs uppercase text-slate-400">{k.label}</p>
            <p className="text-xl font-bold mt-1">{k.value}</p>
          </div>
        ))}
      </div>

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
          {SOURCE_OPTIONS.map((s) => (
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
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortLabel="Date"
        sortDir={sortDir}
        onSortToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        onExport={exportLeads}
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
      ) : pageItems.length === 0 ? (
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
                      if (e.target.checked) setSelected(new Set(pageItems.map((l) => l.leadId)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((l) => (
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
                      <td colSpan={7} className="py-3 px-4 text-sm">
                        <p>
                          <span className="text-slate-500">Page:</span> {l.page ?? l.productSlug ?? "—"}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          Device: {l.metadata?.userAgent?.slice(0, 80) ?? "—"} · Country:{" "}
                          {l.metadata?.country ?? "—"} · IP: {l.metadata?.ip ?? "—"}
                        </p>
                        <div className="mt-2 flex gap-2">
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
