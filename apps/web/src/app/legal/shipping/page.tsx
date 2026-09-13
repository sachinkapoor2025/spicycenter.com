import { legalMeta, LegalShell } from "@/components/LegalShell";
import { DEFAULT_SHIPPING_RATES } from "@spicycorner/shared";

export const metadata = legalMeta("/legal/shipping", "Shipping", "Configurable shipping, separate from duty and VAT.");

export default function Page() {
  const uk = DEFAULT_SHIPPING_RATES.find((r) => r.country === "GB");
  return (
    <LegalShell title="Shipping">
      <p>{uk?.notes}</p>
      <p>
        Default UK configuration: ₹{uk?.perKgCharge} per kg, {uk?.minimumWeightKg}kg minimum chargeable weight.
        Change this in admin. We do not claim that shipping includes customs duty or VAT unless a rule says so.
      </p>
    </LegalShell>
  );
}
