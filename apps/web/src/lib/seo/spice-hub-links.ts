import { flattenInternalLinks, type SeoLinkGroup } from "@spicycorner/shared";

/** At most three unique related pages for a spice entity. */
export function spiceHubLinks(slug: string, name: string): SeoLinkGroup[] {
  const spice = slug.replace(/^\//, "");
  const links = flattenInternalLinks(
    [
      {
        heading: "Buy and learn",
        links: [
          { href: `/spice-guide/${spice}`, label: `What is ${name}?` },
          { href: `/spices/${spice}`, label: `Shop ${name}` },
          { href: `/wholesale/${spice}`, label: `${name} wholesale (10kg+)` },
          { href: "/recipes", label: "Recipes using Indian spices" },
          { href: "/spice-guide/comparisons", label: "Spice comparisons" },
          { href: "/spices", label: "Full Indian spice catalogue" },
        ],
      },
      {
        heading: "UK and Europe",
        links: [
          { href: "/uk", label: "Indian spices UK" },
          { href: "/uk/indian-spices-wholesale", label: "Indian spice wholesale UK" },
          { href: "/eu", label: "Indian spices Europe" },
          { href: "/spice-supplier", label: "Indian spice supplier" },
        ],
      },
      {
        heading: "Trade buyers",
        links: [
          { href: "/enquiry", label: "Request a wholesale quote" },
          { href: "/wholesale/restaurants", label: "Restaurant spice supply" },
          { href: "/wholesale/food-manufacturers", label: "Food manufacturers" },
          { href: "/legal/food-information", label: "UK/EU food information" },
        ],
      },
    ],
    `/spice-guide/${spice}`
  );
  return [{ heading: "Related pages", links }];
}
