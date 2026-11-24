"use client";

import { useEffect, useMemo, useState } from "react";
import type { VendorRecord } from "@spicycorner/shared";
import { api } from "@/lib/api";

type Quote = {
  vendorName: string;
  product: string;
  price: string;
  currency: string;
  moq: string;
  grade: string;
  packaging: string;
  leadTime: string;
  incoterms: string;
  sampleAvailability: string;
  documents: string;
  quoteValidity: string;
};

type Lead = {
  sessionId: string;
  createdAt: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  leadStatus?: string;
  assignedTo?: string;
  adminNotes?: string;
  followUpOn?: string;
  vendorsApproached?: string;
  quotesJson?: string;
  lostReason?: string;
  orderValue?: string;
  commissionEarned?: string;
  metadata?: Record<string, string>;
};

const STATUSES = ["new", "under_review", "vendor_search", "quotes_received", "quote_sent", "negotiation", "won", "lost"];
const EMPTY_QUOTE: Quote = {
  vendorName: "",
  product: "",
  price: "",
  currency: "",
  moq: "",
  grade: "",
  packaging: "",
  leadTime: "",
  incoterms: "",
  sampleAvailability: "",
  documents: "",
  quoteValidity: "",
};

function show(value?: string) {
  return value?.trim() ? value : "Pending Confirmation";
}

export default function AdminSourcingPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [leadData, vendorData] = await Promise.all([
      api<{ leads: Lead[] }>("/admin/leads?source=sourcing-rfq&limit=100"),
      api<{ vendors: VendorRecord[] }>("/admin/vendors"),
    ]);
    setLeads(leadData.leads ?? []);
    setVendors(vendorData.vendors ?? []);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Could not load sourcing data"));
  }, []);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
    for (const lead of leads) byStatus[lead.leadStatus || "new"] = (byStatus[lead.leadStatus || "new"] ?? 0) + 1;
    return byStatus;
  }, [leads]);

  const matches = useMemo(() => {
    const needle = (selected?.metadata?.product || query).trim().toLowerCase();
    if (!needle) return [];
    return vendors.filter((vendor) =>
      `${vendor.name} ${vendor.productsSupplied ?? ""} ${vendor.location ?? ""} ${vendor.countryCode}`.toLowerCase().includes(needle)
    );
  }, [vendors, selected, query]);

  function openLead(lead: Lead) {
    setSelected(lead);
    try {
      setQuotes(lead.quotesJson ? (JSON.parse(lead.quotesJson) as Quote[]) : [{ ...EMPTY_QUOTE, product: lead.metadata?.product ?? "" }]);
    } catch {
      setQuotes([{ ...EMPTY_QUOTE, product: lead.metadata?.product ?? "" }]);
    }
  }

  async function saveLead() {
    if (!selected) return;
    setError("");
    setMessage("");
    try {
      await api("/admin/leads", {
        method: "PATCH",
        body: JSON.stringify({
          sessionId: selected.sessionId,
          createdAt: selected.createdAt,
          leadStatus: selected.leadStatus || "new",
          assignedTo: selected.assignedTo || "",
          adminNotes: selected.adminNotes || "",
          followUpOn: selected.followUpOn || "",
          vendorsApproached: selected.vendorsApproached || "",
          quotesJson: JSON.stringify(quotes),
          lostReason: selected.lostReason || "",
          orderValue: selected.orderValue || "",
          commissionEarned: selected.commissionEarned || "",
        }),
      });
      setMessage("Requirement saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Sourcing requirements</h1>
      <p className="mt-2 text-sm text-slate-600">Counts come from stored RFQs. Search and visitor figures stay in the existing analytics pages and are not estimated here.</p>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg border p-3">Total RFQs: {leads.length}</div>
        <div className="rounded-lg border p-3">Won: {counts.won ?? 0}</div>
        <div className="rounded-lg border p-3">Lost: {counts.lost ?? 0}</div>
        <div className="rounded-lg border p-3">Quotes sent: {counts.quote_sent ?? 0}</div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      <div className="mt-6 grid lg:grid-cols-[18rem_1fr] gap-6">
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={`${lead.sessionId}-${lead.createdAt}`}>
              <button type="button" onClick={() => openLead(lead)} className="w-full rounded-lg border bg-white p-3 text-left text-sm">
                <span className="font-semibold">{lead.metadata?.product || lead.name || "Requirement"}</span>
                <span className="mt-1 block text-slate-500">{lead.metadata?.destinationCountry || "Destination pending"} · {lead.leadStatus || "new"}</span>
              </button>
            </li>
          ))}
          {leads.length === 0 ? <li className="text-sm text-slate-500">No sourcing requirements stored yet.</li> : null}
        </ul>
        {selected ? (
          <div className="rounded-xl border bg-white p-4 text-sm space-y-3">
            <h2 className="text-lg font-semibold">{selected.metadata?.company || selected.name}</h2>
            <p>{selected.email} {selected.phone}</p>
            <p>Product: {show(selected.metadata?.product)} · {show(selected.metadata?.quantity)} {selected.metadata?.unit || ""}</p>
            <p>Grade: {show(selected.metadata?.grade)} · Packaging: {show(selected.metadata?.packaging)}</p>
            <label className="block">Status
              <select className="mt-1 w-full border rounded px-2 py-1" value={selected.leadStatus || "new"} onChange={(e) => setSelected({ ...selected, leadStatus: e.target.value })}>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="block">Assigned to
              <input className="mt-1 w-full border rounded px-2 py-1" value={selected.assignedTo || ""} onChange={(e) => setSelected({ ...selected, assignedTo: e.target.value })} />
            </label>
            <label className="block">Follow-up date
              <input className="mt-1 w-full border rounded px-2 py-1" value={selected.followUpOn || ""} onChange={(e) => setSelected({ ...selected, followUpOn: e.target.value })} />
            </label>
            <label className="block">Vendors approached
              <textarea className="mt-1 w-full border rounded px-2 py-1" rows={2} value={selected.vendorsApproached || ""} onChange={(e) => setSelected({ ...selected, vendorsApproached: e.target.value })} />
            </label>
            <label className="block">Internal notes
              <textarea className="mt-1 w-full border rounded px-2 py-1" rows={2} value={selected.adminNotes || ""} onChange={(e) => setSelected({ ...selected, adminNotes: e.target.value })} />
            </label>
            <h3 className="font-semibold pt-2">Quotation comparison</h3>
            {quotes.map((quote, index) => (
              <div key={index} className="grid sm:grid-cols-2 gap-2 border rounded p-2">
                {Object.keys(EMPTY_QUOTE).map((key) => (
                  <label key={key} className="block text-xs">{key}
                    <input className="mt-1 w-full border rounded px-2 py-1" value={quote[key as keyof Quote]} onChange={(e) => setQuotes(quotes.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: e.target.value } : row))} />
                  </label>
                ))}
              </div>
            ))}
            <button type="button" className="text-nav" onClick={() => setQuotes([...quotes, { ...EMPTY_QUOTE }])}>Add quotation</button>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead><tr>{Object.keys(EMPTY_QUOTE).map((key) => <th key={key} className="p-1 text-left">{key}</th>)}</tr></thead>
                <tbody>
                  {quotes.map((quote, index) => (
                    <tr key={index}>{Object.keys(EMPTY_QUOTE).map((key) => <td key={key} className="p-1">{show(quote[key as keyof Quote])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="block">Match vendors for
              <input className="mt-1 w-full border rounded px-2 py-1" value={query} placeholder={selected.metadata?.product || "Product"} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <ul>
              {matches.map((vendor) => (
                <li key={vendor.vendorId}>{vendor.name} · {vendor.location || vendor.countryCode} · last check {show(vendor.lastVerificationDate)} · {vendor.vendorStatus || "pending"}</li>
              ))}
              {matches.length === 0 ? <li>No recorded vendor matches this product. Nothing has been marked verified.</li> : null}
            </ul>
            <label className="block">Lost reason
              <input className="mt-1 w-full border rounded px-2 py-1" value={selected.lostReason || ""} onChange={(e) => setSelected({ ...selected, lostReason: e.target.value })} />
            </label>
            <label className="block">Order value, if known
              <input className="mt-1 w-full border rounded px-2 py-1" value={selected.orderValue || ""} onChange={(e) => setSelected({ ...selected, orderValue: e.target.value })} />
            </label>
            <label className="block">Commission, if agreed
              <input className="mt-1 w-full border rounded px-2 py-1" value={selected.commissionEarned || ""} onChange={(e) => setSelected({ ...selected, commissionEarned: e.target.value })} />
            </label>
            <button type="button" onClick={() => void saveLead()} className="rounded bg-nav px-3 py-2 font-semibold text-white">Save requirement</button>
          </div>
        ) : <p className="text-sm text-slate-500">Select a requirement to compare quotations.</p>}
      </div>
    </div>
  );
}
