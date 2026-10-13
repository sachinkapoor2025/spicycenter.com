import { permanentRedirect } from "next/navigation";
import { enquiryPathFromWholesaleSearch } from "@/lib/wholesale-hub-redirect";

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; country?: string; quantity?: string }>;
}) {
  permanentRedirect(enquiryPathFromWholesaleSearch(await searchParams));
}
