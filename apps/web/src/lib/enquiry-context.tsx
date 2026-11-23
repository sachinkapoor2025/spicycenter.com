"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { EnquiryModal } from "@/components/EnquiryModal";

type EnquiryContextValue = {
  openEnquiry: (productName?: string) => void;
  closeEnquiry: () => void;
};

const EnquiryContext = createContext<EnquiryContextValue | null>(null);

export function EnquiryProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState("");

  const openEnquiry = useCallback((name?: string) => {
    setProductName(name?.trim() ?? "");
    setOpen(true);
  }, []);

  const closeEnquiry = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openEnquiry, closeEnquiry }), [openEnquiry, closeEnquiry]);

  return (
    <EnquiryContext.Provider value={value}>
      {children}
      <EnquiryModal open={open} productName={productName} onClose={closeEnquiry} />
    </EnquiryContext.Provider>
  );
}

export function useEnquiry() {
  const ctx = useContext(EnquiryContext);
  if (!ctx) throw new Error("useEnquiry must be used within EnquiryProvider");
  return ctx;
}
