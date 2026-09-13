"use client";

import { useState } from "react";
import type { AccountAddress } from "@spicycorner/shared";
import { AddressFormFields } from "./AddressFormFields";
import { LeadCaptureInput } from "@/components/LeadCaptureInput";
import { emptyShippingAddress, formatAddressLine } from "@/lib/shipping-address";
import {
  createAccountAddress,
  updateAccountAddress,
  deleteAccountAddress,
} from "@/lib/account";
import {
  loadUserAddresses,
  upsertUserAddress,
  removeUserAddress,
  setDefaultUserAddress,
} from "@/lib/user-addresses";

interface Props {
  addresses: AccountAddress[];
  token: string;
  sessionId: string;
  userEmail: string;
  offlineMode?: boolean;
  onRefresh: () => Promise<void>;
  onAddressesChange?: (addresses: AccountAddress[]) => void;
}

type Mode = "list" | "add" | "edit";

export function AccountAddressesPanel({
  addresses,
  token,
  sessionId,
  userEmail,
  offlineMode = false,
  onRefresh,
  onAddressesChange,
}: Props) {
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyShippingAddress());
  const [label, setLabel] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setForm({ ...emptyShippingAddress(), email: userEmail });
    setLabel("");
    setIsDefault(addresses.length === 0);
    setEditingId(null);
    setMode("list");
    setError("");
  };

  const startAdd = () => {
    setForm({ ...emptyShippingAddress(), email: userEmail });
    setLabel("");
    setIsDefault(addresses.length === 0);
    setEditingId(null);
    setMode("add");
    setError("");
    setMessage("");
  };

  const startEdit = (address: AccountAddress) => {
    setForm({
      name: address.name,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
      email: address.email,
    });
    setLabel(address.label ?? "");
    setIsDefault(address.isDefault);
    setEditingId(address.id);
    setMode("edit");
    setError("");
    setMessage("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const payload = {
      ...form,
      country: (form.country || "US").toUpperCase().slice(0, 2),
      label: label || form.name,
      isDefault,
      ...(form.phone?.trim() ? { phone: form.phone.trim() } : {}),
      ...(form.line2?.trim() ? { line2: form.line2.trim() } : { line2: undefined }),
    };

    try {
      if (offlineMode) {
        const id = mode === "edit" && editingId ? editingId : crypto.randomUUID();
        const saved = upsertUserAddress(userEmail, {
          ...payload,
          id,
          isDefault,
        });
        onAddressesChange?.(saved);
        setMessage("Address saved on this device.");
      } else if (mode === "edit" && editingId) {
        await updateAccountAddress(token, sessionId, editingId, payload);
        setMessage("Address updated successfully.");
        await onRefresh();
      } else {
        await createAccountAddress(token, sessionId, payload);
        setMessage("Address saved successfully.");
        await onRefresh();
      }
      resetForm();
    } catch (err) {
      if (!offlineMode) {
        const id = mode === "edit" && editingId ? editingId : crypto.randomUUID();
        const saved = upsertUserAddress(userEmail, { ...payload, id, isDefault });
        onAddressesChange?.(saved);
        setMessage("Address saved on this device (API unavailable).");
        resetForm();
      } else {
        setError(err instanceof Error ? err.message : "Could not save address");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    setLoading(true);
    setError("");
    try {
      if (offlineMode) {
        const saved = removeUserAddress(userEmail, id);
        onAddressesChange?.(saved);
        setMessage("Address deleted.");
      } else {
        await deleteAccountAddress(token, sessionId, id);
        await onRefresh();
        setMessage("Address deleted.");
      }
      if (editingId === id) resetForm();
    } catch (err) {
      if (!offlineMode) {
        const saved = removeUserAddress(userEmail, id);
        onAddressesChange?.(saved);
        if (editingId === id) resetForm();
        setMessage("Address deleted on this device.");
      } else {
        setError(err instanceof Error ? err.message : "Could not delete address");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (address: AccountAddress) => {
    setLoading(true);
    setError("");
    try {
      if (offlineMode) {
        const saved = setDefaultUserAddress(userEmail, address.id);
        onAddressesChange?.(saved);
        setMessage("Default address updated.");
      } else {
        await updateAccountAddress(token, sessionId, address.id, { isDefault: true });
        await onRefresh();
        setMessage("Default address updated.");
      }
    } catch (err) {
      if (!offlineMode) {
        const saved = setDefaultUserAddress(userEmail, address.id);
        onAddressesChange?.(saved);
        setMessage("Default address updated on this device.");
      } else {
        setError(err instanceof Error ? err.message : "Could not update default address");
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === "add" || mode === "edit") {
    return (
      <div className="pt-2">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-slate-900">
            {mode === "edit" ? "Edit address" : "Add new address"}
          </h3>
          <button type="button" onClick={resetForm} className="text-sm text-nav hover:underline">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <LeadCaptureInput
            label="Address label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Home, Brother's address, etc."
          />
          <AddressFormFields value={form} onChange={setForm} />

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-slate-300 text-nav focus:ring-accent"
            />
            Set as default delivery address
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-nav text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary transition disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "edit" ? "Save changes" : "Add address"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Manage your saved delivery addresses.</p>
        <button
          type="button"
          onClick={startAdd}
          className="text-sm font-semibold text-nav hover:underline shrink-0"
        >
          + Add address
        </button>
      </div>

      {message && <p className="text-green-600 text-sm">{message}</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {addresses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-600 mb-3">No saved addresses yet.</p>
          <button
            type="button"
            onClick={startAdd}
            className="bg-nav text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary transition"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-lg border border-slate-200 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{address.label || address.name}</p>
                    {address.isDefault && (
                      <span className="text-xs font-medium bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{address.name}</p>
                  <p className="text-sm text-slate-500">{formatAddressLine(address)}</p>
                  {address.line2 && <p className="text-sm text-slate-500">{address.line2}</p>}
                  <p className="text-sm text-slate-500 mt-1">{address.email}</p>
                  {address.phone && <p className="text-sm text-slate-500">{address.phone}</p>}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {!address.isDefault && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void handleSetDefault(address)}
                      className="text-xs font-medium text-nav hover:underline disabled:opacity-50"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => startEdit(address)}
                    className="text-xs font-medium text-nav hover:underline disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleDelete(address.id)}
                    className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
