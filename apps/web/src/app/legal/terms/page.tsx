import { legalMeta, LegalShell } from "@/components/LegalShell";

export const metadata = legalMeta("/legal/terms", "Terms", "Terms of sale placeholder.");

export default function Page() {
  return (
    <LegalShell title="Terms">
      <p>
        Retail checkout creates a consumer contract; wholesale quotes are business-to-business. Prices, shipping and tax
        are shown as separate lines where configured. Draft catalogue prices are not live offers until published by admin.
      </p>
    </LegalShell>
  );
}
