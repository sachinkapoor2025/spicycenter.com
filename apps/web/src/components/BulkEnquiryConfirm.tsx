"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function BulkEnquiryConfirm({ enquiryId }: { enquiryId: string }) {
  const [status, setStatus] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");

  useEffect(() => {
    api<{ status: string; paymentStatus: string }>(`/bulk/enquiries/${enquiryId}`, { revalidate: false })
      .then((d) => {
        setStatus(d.status);
        setPaymentStatus(d.paymentStatus);
      })
      .catch(() => setStatus("new"));
  }, [enquiryId]);

  return (
    <div className="mt-4 space-y-3 text-muted">
      <p>
        Your reference number is{" "}
        <strong className="text-primary font-mono">{enquiryId}</strong>. Keep it for follow-up emails.
      </p>
      {paymentStatus === "paid" || status === "paid_addons" ? (
        <p>Add-on fees were received. The cargo itself is still quoted offline.</p>
      ) : (
        <p>We emailed a copy of the indicative breakdown to you and to the sales team.</p>
      )}
    </div>
  );
}
