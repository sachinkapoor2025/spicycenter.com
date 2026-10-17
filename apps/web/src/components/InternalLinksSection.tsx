import Link from "next/link";
import { flattenInternalLinks, type SeoLinkGroup } from "@spicycorner/shared";

export function InternalLinksSection({
  groups,
  title = "Related pages",
  intro,
  currentPath = "",
}: {
  groups: SeoLinkGroup[];
  title?: string;
  intro?: string;
  currentPath?: string;
}) {
  const links = flattenInternalLinks(groups, currentPath);
  if (links.length === 0) return null;

  return (
    <nav className="mt-10 pt-8 border-t border-[#e6d5bc]" aria-labelledby="internal-links-heading">
      <h2 id="internal-links-heading" className="text-lg sm:text-xl font-bold text-primary mb-2">
        {title}
      </h2>
      {intro ? <p className="text-sm text-muted mb-4 max-w-3xl">{intro}</p> : <div className="mb-4" />}
      <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-x-6">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-nav font-semibold hover:underline underline-offset-2">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
