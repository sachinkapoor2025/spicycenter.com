"use client";

import {
  MAX_PRODUCT_ADDON_QUANTITY,
  PRODUCT_ADDONS,
  sumAddonPrices,
  type ProductAddonDef,
  type ProductAddonSelection,
} from "@spicycorner/shared";
import { useCurrency } from "@/lib/currency-context";

const DRY_FRUITS = PRODUCT_ADDONS.filter((a) => a.group === "dry-fruits");
const CHOCOLATES = PRODUCT_ADDONS.filter((a) => a.group === "chocolates");

function qtyMap(selected: ProductAddonSelection[]): Map<string, number> {
  return new Map(selected.map((s) => [s.id, s.quantity]));
}

function AddonGroup({
  title,
  items,
  quantities,
  onToggle,
  onSetQuantity,
}: {
  title: string;
  items: readonly ProductAddonDef[];
  quantities: Map<string, number>;
  onToggle: (id: string) => void;
  onSetQuantity: (id: string, quantity: number) => void;
}) {
  const { format } = useCurrency();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</p>
      <ul className="space-y-2">
        {items.map((addon) => {
          const qty = quantities.get(addon.id) ?? 0;
          const checked = qty > 0;
          const linePrice = addon.priceUsd * Math.max(qty, 1);
          return (
            <li key={addon.id}>
              <div
                className={`rounded-lg border px-3 py-2.5 transition ${
                  checked
                    ? "border-nav bg-blue-50/60 ring-1 ring-nav/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-nav focus:ring-nav"
                    checked={checked}
                    onChange={() => onToggle(addon.id)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{addon.name}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{addon.detail}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-primary tabular-nums">
                    +{format(checked ? linePrice : addon.priceUsd, "USD")}
                  </span>
                </label>
                {checked ? (
                  <div className="mt-2 ml-7 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Qty</span>
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white">
                      <button
                        type="button"
                        aria-label={`Decrease ${addon.name}`}
                        className="flex h-8 w-8 items-center justify-center text-slate-700 hover:bg-slate-50 rounded-l-full disabled:opacity-40"
                        disabled={qty <= 1}
                        onClick={() => onSetQuantity(addon.id, qty - 1)}
                      >
                        −
                      </button>
                      <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${addon.name}`}
                        className="flex h-8 w-8 items-center justify-center text-slate-700 hover:bg-slate-50 rounded-r-full disabled:opacity-40"
                        disabled={qty >= MAX_PRODUCT_ADDON_QUANTITY}
                        onClick={() => onSetQuantity(addon.id, qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    {qty > 1 ? (
                      <span className="text-xs text-slate-500">
                        {format(addon.priceUsd, "USD")} each
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** SpicyCorner-only dry fruit & chocolate add-ons (multi-select with quantity). */
export function ProductAddonsPicker({
  selected,
  onChange,
  className = "",
}: {
  selected: ProductAddonSelection[];
  onChange: (next: ProductAddonSelection[]) => void;
  className?: string;
}) {
  const { format } = useCurrency();
  const quantities = qtyMap(selected);
  const addonsTotal = sumAddonPrices(
    selected.map((s) => {
      const def = PRODUCT_ADDONS.find((a) => a.id === s.id);
      return {
        id: s.id,
        name: def?.name ?? s.id,
        price: def?.priceUsd ?? 0,
        quantity: s.quantity,
      };
    })
  );

  const toggle = (id: string) => {
    if (quantities.has(id)) {
      onChange(selected.filter((s) => s.id !== id));
      return;
    }
    onChange([...selected, { id, quantity: 1 }].sort((a, b) => a.id.localeCompare(b.id)));
  };

  const setQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      onChange(selected.filter((s) => s.id !== id));
      return;
    }
    const nextQty = Math.min(MAX_PRODUCT_ADDON_QUANTITY, quantity);
    const exists = selected.some((s) => s.id === id);
    const next = exists
      ? selected.map((s) => (s.id === id ? { ...s, quantity: nextQty } : s))
      : [...selected, { id, quantity: nextQty }];
    onChange(next.sort((a, b) => a.id.localeCompare(b.id)));
  };

  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-4 sm:py-4 ${className}`}>
      <div className="mb-3">
        <p className="text-sm font-bold text-primary">Add something sweet</p>
        <p className="text-xs text-slate-600 mt-0.5">
          Optional dry fruits &amp; chocolates — choose how many of each to add.
        </p>
      </div>
      <div className="space-y-4">
        <AddonGroup
          title="Dry fruits"
          items={DRY_FRUITS}
          quantities={quantities}
          onToggle={toggle}
          onSetQuantity={setQuantity}
        />
        <AddonGroup
          title="Chocolates"
          items={CHOCOLATES}
          quantities={quantities}
          onToggle={toggle}
          onSetQuantity={setQuantity}
        />
      </div>
      {addonsTotal > 0 ? (
        <p className="mt-3 pt-3 border-t border-slate-200 text-sm font-semibold text-slate-800 flex justify-between gap-3">
          <span>Add-ons total</span>
          <span className="text-primary tabular-nums">+{format(addonsTotal, "USD")}</span>
        </p>
      ) : null}
    </div>
  );
}
