"use client";

import type { ReactNode } from "react";

export type AccountTab = "orders" | "addresses" | "payments" | "details";

function OrdersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function AddressIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 0 1-2.828 0l-4.243-4.243a8 8 0 1 1 11.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
    </svg>
  );
}

const TABS: { id: AccountTab; label: string; icon: ReactNode }[] = [
  { id: "orders", label: "Orders", icon: <OrdersIcon /> },
  { id: "addresses", label: "Addresses", icon: <AddressIcon /> },
  { id: "payments", label: "Payment methods", icon: <PaymentIcon /> },
  { id: "details", label: "Account details", icon: <UserIcon /> },
];

export function AccountNav({
  active,
  onChange,
}: {
  active: AccountTab;
  onChange: (tab: AccountTab) => void;
}) {
  return (
    <nav className="flex flex-wrap gap-x-6 sm:gap-x-10 gap-y-3 pt-1">
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 text-sm font-semibold transition pb-1 border-b-2 ${
              selected
                ? "text-primary border-primary"
                : "text-slate-600 border-transparent hover:text-primary hover:border-slate-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
