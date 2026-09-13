import Link from "next/link";
import type { SeoLinkGroup } from "@spicycorner/shared";

export function InternalLinksSection({
  groups,
  title = "Explore SpicyCorner",
  intro,
}: {
  groups: SeoLinkGroup[];
  title?: string;
  intro?: string;
}) {
  if (groups.length === 0) return null;

  return (
    <nav className="mt-10 pt-8 border-t border-slate-200" aria-labelledby="internal-links-heading">
      <h2 id="internal-links-heading" className="text-lg sm:text-xl font-bold text-primary mb-2">
        {title}
      </h2>
      {intro ? <p className="text-sm text-slate-600 mb-6 max-w-3xl">{intro}</p> : <div className="mb-6" />}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {groups.map((group) => (
          <section key={group.heading}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary mb-3">{group.heading}</h3>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-700 hover:text-nav hover:underline underline-offset-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
