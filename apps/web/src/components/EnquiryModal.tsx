"use client";

import { useEffect } from "react";
import { EnquiryForm } from "@/components/EnquiryForm";

export function EnquiryModal({
  open,
  productName,
  onClose,
}: {
  open: boolean;
  productName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close enquiry form" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-modal-title"
        className="relative z-[121] w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-paper border border-[#e6d5bc] shadow-xl p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="spice-kicker">Enquiry</p>
            <h2 id="enquiry-modal-title" className="font-serif text-2xl text-primary mt-1">
              Enquire Now
            </h2>
            <p className="text-sm text-muted mt-1">Tell us what you need — we will reply with availability.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-earth hover:text-nav rounded-md"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <EnquiryForm defaultProduct={productName} />
      </div>
    </div>
  );
}
