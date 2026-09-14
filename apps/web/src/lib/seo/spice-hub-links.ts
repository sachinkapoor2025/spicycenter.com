export type SpiceHubLinks = {
  heading: string;
  href: string;
  label: string;
}[];

/** Semantic internal links for a spice entity — used on guides, shop and wholesale. */
export function spiceHubLinks(slug: string, name: string): { heading: string; links: { href: string; label: string }[] }[] {
  const spice = slug.replace(/^\//, "");
  return [
    {
      heading: "Buy and learn",
      links: [
        { href: `/spice-guide/${spice}`, label: `What is ${name}?` },
        { href: `/spices/${spice}`, label: `Shop ${name}` },
        { href: `/wholesale/${spice}`, label: `${name} wholesale (10kg+)` },
        { href: "/spices", label: "Full Indian spice catalogue" },
      ],
    },
    {
      heading: "UK and Europe",
      links: [
        { href: "/uk", label: `Indian spices UK` },
        { href: "/uk/indian-spices-wholesale", label: "Indian spice wholesale UK" },
        { href: "/eu", label: "Indian spices Europe" },
        { href: "/spice-supplier", label: "Indian spice supplier" },
      ],
    },
    {
      heading: "Trade buyers",
      links: [
        { href: "/wholesale", label: "Request a wholesale quote" },
        { href: "/wholesale/restaurants", label: "Restaurant spice supply" },
        { href: "/wholesale/food-manufacturers", label: "Food manufacturers" },
        { href: "/legal/food-information", label: "UK/EU food information" },
      ],
    },
  ];
}
