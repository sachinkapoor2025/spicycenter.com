import Link from "next/link";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import { getInternalLinkGroups } from "@spicycorner/shared";

/** Product-page explore block — contextual graph, not every city × category dump. */
export function ExploreMoreSection({
  categorySlug,
  productSlug,
  availableCountryCodes,
}: {
  categorySlug: string;
  productSlug: string;
  availableCountryCodes?: string[] | null;
}) {
  const groups = getInternalLinkGroups({
    type: "product",
    categorySlug,
    productSlug,
    availableCountryCodes,
  });

  return (
    <InternalLinksSection
      groups={groups}
      title="Explore more"
      intro="Continue to related categories, destination pages, and spice guides."
    />
  );
}

export function ExploreMoreFallback() {
  return (
    <p className="mt-8 text-sm">
      <Link href="/products" className="text-nav hover:underline">
        Browse all spice products
      </Link>
    </p>
  );
}
