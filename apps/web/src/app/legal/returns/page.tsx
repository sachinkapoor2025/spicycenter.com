import { legalMeta, LegalShell } from "@/components/LegalShell";

export const metadata = legalMeta("/legal/returns", "Returns", "Returns for food products.");

export default function Page() {
  return (
    <LegalShell title="Returns">
      <p>
        Opened food cannot usually be restocked. Unopened, unused packs may be discussed with support if they arrived damaged
        or incorrect. Wholesale returns follow the quote terms. This is not a statutory-rights substitute.
      </p>
    </LegalShell>
  );
}
