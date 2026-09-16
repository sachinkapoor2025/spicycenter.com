/**
 * Ocean freight container selection for bulk spices.
 * Always standard dry / general-purpose — never reefer or ventilated.
 */
export const DEFAULT_FREIGHT_TIERS = {
  /** Below this weight the cargo ships as groupage. */
  lcl_max_kg: 10_000,
  /** Typical 20ft GP payload used for spice FCL (weight-limited). */
  payload_20ft_kg: 22_000,
  /** Typical 40ft GP payload used for spice FCL (weight-limited). */
  payload_40ft_kg: 26_500,
} as const;

export type FreightTiers = {
  lcl_max_kg: number;
  payload_20ft_kg: number;
  payload_40ft_kg: number;
};

export type ContainerRecommendation = {
  tier: "LCL" | "FCL";
  sizeFt: 20 | 40 | null;
  containerCount: number;
  label: string;
  explanation: string;
};

function tonnesLabel(kg: number): string {
  const t = kg / 1000;
  return Number.isInteger(t) ? String(t) : t.toFixed(1);
}

export function recommendContainer(
  qtyKg: number,
  tiers: FreightTiers = DEFAULT_FREIGHT_TIERS
): ContainerRecommendation {
  const qty = Number.isFinite(qtyKg) && qtyKg > 0 ? qtyKg : 0;
  const lclMax = tiers.lcl_max_kg;
  const p20 = tiers.payload_20ft_kg;
  const p40 = tiers.payload_40ft_kg;

  if (qty <= lclMax) {
    return {
      tier: "LCL",
      sizeFt: null,
      containerCount: 0,
      label:
        "Shared container (LCL / groupage) — your cargo shares space with other shipments in a standard dry container",
      explanation: `Your ${qty.toLocaleString("en-IN")} kg shipment is below a full-container load (${tonnesLabel(lclMax)} tonnes), so it ships as groupage in a shared standard dry container.`,
    };
  }

  if (qty <= p20) {
    return {
      tier: "FCL",
      sizeFt: 20,
      containerCount: 1,
      label: "1 × 20ft Standard Dry Container",
      explanation: `Fits comfortably within a single 20ft container's ~${tonnesLabel(p20)}-tonne capacity.`,
    };
  }

  if (qty <= p40) {
    return {
      tier: "FCL",
      sizeFt: 40,
      containerCount: 1,
      label: "1 × 40ft Standard Dry Container",
      explanation: `This quantity exceeds a 20ft payload (~${tonnesLabel(p20)} tonnes) and fits a single 40ft standard dry container (~${tonnesLabel(p40)}-tonne capacity).`,
    };
  }

  const n20 = Math.ceil(qty / p20);
  const n40 = Math.ceil(qty / p40);
  const use40 = n40 < n20;
  const sizeFt: 20 | 40 = use40 ? 40 : 20;
  const n = use40 ? n40 : n20;
  const payload = use40 ? p40 : p20;

  return {
    tier: "FCL",
    sizeFt,
    containerCount: n,
    label: `${n} × ${sizeFt}ft Standard Dry Containers`,
    explanation: `This quantity exceeds a single container payload; ${n} × ${sizeFt}ft standard dry containers are required (~${tonnesLabel(payload)}-tonne capacity each).`,
  };
}
