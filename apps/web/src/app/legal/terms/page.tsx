import { legalMeta, LegalShell } from "@/components/LegalShell";

export const metadata = legalMeta("/legal/terms", "Terms", "Terms of sale placeholder.");

export default function Page() {
  return (
    <LegalShell title="Terms">
      <p>
        SpicyCenter is an enquiry catalogue. Availability is confirmed when you send an enquiry. Prices are not published on this website.
      </p>
    </LegalShell>
  );
}
