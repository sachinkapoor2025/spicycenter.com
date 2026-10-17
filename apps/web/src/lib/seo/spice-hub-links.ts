import { flattenInternalLinks, type SeoLinkGroup } from "@spicycorner/shared";

/** At most three unique related pages for a spice entity. */
export function spiceHubLinks(slug: string, name: string): SeoLinkGroup[] {
  const spice = slug.replace(/^\//, "");
  return [
    {
      heading: "Related pages",
      links: flattenInternalLinks(
        [
          {
            heading: "Related pages",
            links: [
              { href: `/spices/${spice}`, label: `${name} in the catalogue` },
              { href: `/wholesale/${spice}`, label: `${name} wholesale` },
              { href: "/uk", label: "Indian spices UK" },
            ],
          },
        ],
        `/spice-guide/${spice}`
      ),
    },
  ];
}
