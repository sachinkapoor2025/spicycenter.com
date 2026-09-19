"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EVENT_TYPES } from "@spicycorner/shared";
import { WholesaleQuoteForm } from "@/components/WholesaleQuoteForm";
import { trackEnquiryEvent } from "@/lib/track";

export function EnquiryFloat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/ses-email") ||
    pathname.startsWith("/checkout");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_VIEW, { form: "float" });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[60] bg-nav text-white font-semibold shadow-[0_6px_20px_rgba(196,92,38,0.35)] hover:bg-nav/90 active:scale-[0.99] transition
          inset-x-3 bottom-3 rounded-2xl px-4 py-3 text-sm
          md:inset-auto md:bottom-6 md:right-6 md:rounded-full md:px-5 md:py-3.5"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Bulk enquiry
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="enquiry-float-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close enquiry"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 md:inset-auto md:right-6 md:bottom-6 md:top-6 md:w-[min(32rem,calc(100vw-3rem))] overflow-y-auto rounded-t-3xl md:rounded-2xl bg-cream border border-[#e6d5bc] p-4 md:p-6 max-h-[92vh] md:max-h-full">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="spice-kicker">Always available</p>
                <h2 id="enquiry-float-title" className="font-serif text-2xl text-primary mt-1">
                  Bulk enquiry
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[#e6d5bc] px-3 py-1.5 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-muted mb-4">
              Free to submit. 10kg+ wholesale on this form. For 100kg+ cargo use{" "}
              <Link href="/bulk-enquiry" className="text-nav font-semibold" onClick={() => setOpen(false)}>
                the bulk quote
              </Link>
              .
            </p>
            <WholesaleQuoteForm />
          </div>
        </div>
      ) : null}
    </>
  );
}
