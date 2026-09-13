"use client";

import { useEffect, useState } from "react";
import type { AccountProfile } from "@spicycorner/shared";
import { LeadCaptureInput } from "@/components/LeadCaptureInput";
import { updateAccountProfile } from "@/lib/account";

export function AccountDetailsPanel({
  profile,
  email,
  token,
  sessionId,
  onRefresh,
}: {
  profile: AccountProfile;
  email: string;
  token: string;
  sessionId: string;
  onRefresh: () => Promise<void>;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await updateAccountProfile(token, sessionId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      await onRefresh();
      setMessage("Account details updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="pt-2 space-y-4 max-w-lg">
      <p className="text-sm text-slate-600">
        Update your profile information used for orders and delivery updates.
      </p>

      <LeadCaptureInput
        label="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600"
        />
        <p className="text-xs text-slate-500 mt-1">Email is managed through your sign-in provider.</p>
      </div>

      <LeadCaptureInput
        label="Phone (optional)"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {message && <p className="text-green-600 text-sm">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-nav text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary transition disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save details"}
      </button>
    </form>
  );
}
