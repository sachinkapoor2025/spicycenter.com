import Link from "next/link";
import type { Product } from "@spicycorner/shared";
import { getSpiceBySlug } from "@/lib/spice-data";
import { packUniqueBlurb, parseProductSpiceTag } from "@/lib/content/spice-display";
import { recipesForSpice } from "@/lib/recipes";

export function ProductSpiceStory({ product }: { product: Product }) {
  const { spiceId, form, pack } = parseProductSpiceTag(product.tags);
  const spice = spiceId ? getSpiceBySlug(spiceId) : undefined;
  if (!spice) return null;
  const recipes = recipesForSpice(spice.id).slice(0, 5);
  const pairings = spice.relatedSpiceIds
    .map((id) => getSpiceBySlug(id))
    .filter(Boolean)
    .slice(0, 6);
  const applyingGrades = spice.grades.filter((g) => g.applies);

  return (
    <section className="max-w-6xl mx-auto px-4 pb-8">
      <div className="border border-[#eadfce] rounded-xl p-6 bg-[#fffaf3] space-y-6">
        <div>
          <h2 className="font-serif text-2xl text-primary">How to use this pack</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{packUniqueBlurb(product.name, pack, form)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Shared facts for {spice.canonicalName} live on the{" "}
            <Link className="text-nav font-semibold" href={`/spice-guide/${spice.slug}`}>
              {spice.canonicalName} guide
            </Link>
            . This product page is for the {pack ?? "listed"} {form ?? "form"} SKU so pack-size URLs are not duplicate
            copies of each other.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-primary">Origin and lot notes</h3>
          <p className="mt-1 text-sm leading-relaxed">
            Typical origin story: {spice.origin}
            {spice.originRegion ? ` (${spice.originRegion})` : ""}. Growing regions associated with this spice:{" "}
            {spice.growingRegions.join(", ") || "see guide"}. Country of origin printed on your bag must match this lot —
            a region page is not a certificate.
          </p>
        </div>
        {applyingGrades.length > 0 && (
          <div>
            <h3 className="font-semibold text-primary">Grade</h3>
            <p className="mt-1 text-sm text-slate-600">
              We print a grade only if it belongs to this spice. These are templates until the lot is verified:
            </p>
            <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
              {applyingGrades.slice(0, 4).map((g) => (
                <li key={g.gradeName}>
                  <strong>{g.gradeName}:</strong> {g.description}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-primary">Usage suggestions</h3>
          <p className="mt-1 text-sm leading-relaxed">{spice.flavourProfile}</p>
          <ul className="mt-2 text-sm list-disc pl-5">
            {spice.culinaryUses.slice(0, 6).map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
        {pairings.length > 0 && (
          <div>
            <h3 className="font-semibold text-primary">Pairs well with</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {pairings.map((s) => (
                <Link key={s!.id} href={`/spice-guide/${s!.slug}`} className="rounded-full border px-3 py-1 text-sm">
                  {s!.canonicalName}
                </Link>
              ))}
            </div>
          </div>
        )}
        {recipes.length > 0 && (
          <div>
            <h3 className="font-semibold text-primary">Cook it in</h3>
            <ul className="mt-2 text-sm space-y-1">
              {recipes.map((r) => (
                <li key={r.slug}>
                  <Link className="text-nav" href={`/recipes/${r.slug}`}>
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
