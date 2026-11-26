import Link from "next/link";
import { legalMeta, LegalShell } from "@/components/LegalShell";
import { ReturnsPolicy } from "@/components/ReturnsPolicy";

export const metadata = legalMeta(
  "/legal/returns",
  "Returns",
  "SpicyCenter returns policy for damaged, incorrect or missing spice orders.",
);

export default function Page() {
  return (
    <LegalShell title="Returns policy">
      <ReturnsPolicy />
      <p className="mt-6">
        The same policy is also published on{" "}
        <Link href="/returns" className="text-nav font-semibold hover:underline">
          the customer returns page
        </Link>
        . This is not a statutory-rights substitute.
      </p>
    </LegalShell>
  );
}
