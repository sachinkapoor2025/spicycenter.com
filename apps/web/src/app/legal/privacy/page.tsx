import { legalMeta, LegalShell } from "@/components/LegalShell";

export const metadata = legalMeta("/legal/privacy", "Privacy", "Privacy notice placeholder — complete with your processor list before launch.");

export default function Page() {
  return (
    <LegalShell title="Privacy">
      <p>
        We process orders, wholesale inquiries and account data to run the shop. Analytics IDs belong in environment variables.
        A full GDPR-style notice (controllers, processors, retention) must be completed by the business before public launch.
      </p>
    </LegalShell>
  );
}
