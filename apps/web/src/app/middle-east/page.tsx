import type { Metadata } from "next";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { SuppliedPageCopy } from "@/components/SuppliedPageCopy";
import { MIDDLE_EAST_SUPPLIED_H1, MIDDLE_EAST_SUPPLIED_INTRO, MIDDLE_EAST_SUPPLIED_SECTIONS } from "@/lib/content/supplied-pages";
import { pageMetadata, withAbsoluteSocialTitle } from "@/lib/seo";

const MIDDLE_EAST_META_TITLE = "Indian Spices for Middle Eastern Markets | SpicyCenter";

export const metadata: Metadata = withAbsoluteSocialTitle(
  pageMetadata({
    title: MIDDLE_EAST_META_TITLE,
    description:
      "Indian spices for importers, distributors and food businesses in the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman and the wider Middle East.",
    path: "/middle-east",
    absoluteTitle: true,
  }),
  MIDDLE_EAST_META_TITLE,
);

export default function MiddleEastPage() {
  return (
    <div className="w-full px-4 py-10">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Middle East", path: "/middle-east" }]} />
      <p className="spice-kicker">B2B sourcing</p>
      <h1 className="spice-heading text-3xl sm:text-4xl mt-2">{MIDDLE_EAST_SUPPLIED_H1}</h1>
      {MIDDLE_EAST_SUPPLIED_INTRO.map((paragraph) => (
        <p key={paragraph} className="mt-4 max-w-3xl text-muted leading-relaxed">
          {paragraph}
        </p>
      ))}
      <SuppliedPageCopy sections={MIDDLE_EAST_SUPPLIED_SECTIONS} className="mt-10" />
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/enquiry" className="btn-primary inline-flex !w-auto px-5 py-2.5 text-sm font-semibold">
          Send an enquiry
        </Link>
        <Link href="/markets" className="text-nav font-semibold self-center">
          Export markets
        </Link>
        <Link href="/spices" className="text-nav font-semibold self-center">
          Spice catalogue
        </Link>
      </div>
    </div>
  );
}
