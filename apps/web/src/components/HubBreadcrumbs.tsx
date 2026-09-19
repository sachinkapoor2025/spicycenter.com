import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export function HubBreadcrumbs({
  items,
}: {
  items: { name: string; path?: string }[];
}) {
  const crumbs = items.map((item) => ({
    label: item.name,
    href: item.path,
  }));
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(
          items.map((item) => ({ name: item.name, path: item.path ?? items[items.length - 1]?.path ?? "/" }))
        )}
      />
      <Breadcrumbs items={crumbs} />
    </>
  );
}
