import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HubBreadcrumbs } from "@/components/HubBreadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { SOURCING_GUIDES } from "@/lib/sourcing-guides";

export const metadata: Metadata = pageMetadata({
  title: "Spice Import & Sourcing Guides",
  description:
    "Helpful information for importers, distributors and businesses sourcing spices, masalas and food ingredients from India.",
  path: "/guides",
});

const GUIDE_ICONS = {
  "bulk-sourcing": "globe",
  packaging: "package",
  "import-documentation": "clipboard",
  "whole-versus-ground": "mortar",
  "gcc-import": "ship",
  "africa-import": "africa",
  "latam-import": "latam",
} as const;

type GuideIconName = (typeof GUIDE_ICONS)[keyof typeof GUIDE_ICONS] | "chat";

function GuideIcon({ name }: { name: GuideIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 md:h-[1.35rem] md:w-[1.35rem] text-nav shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {name === "globe" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M3 12h18" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
        </>
      ) : null}
      {name === "package" ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.5 12 3.5 3 8.5l9 5 9-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5v7l9 5 9-5v-7" />
          <path strokeLinecap="round" d="M12 13.5v7" />
        </>
      ) : null}
      {name === "clipboard" ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 4.5h8A1.5 1.5 0 0 1 17.5 6v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V6A1.5 1.5 0 0 1 8 4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5V3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V4.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 13 2 2 4-4.5" />
        </>
      ) : null}
      {name === "mortar" ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13.5c0 3.6 3.1 6.5 7 6.5s7-2.9 7-6.5H5z" />
          <path strokeLinecap="round" d="M4.5 13.5h15" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 4.5 11 13" />
        </>
      ) : null}
      {name === "ship" ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 15.5 12 13l8 2.5v2.2c-2.4 1.6-5.1 2.3-8 2.3s-5.6-.7-8-2.3v-2.2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 13.2V8.5h6.5l2 2.8V13" />
          <path strokeLinecap="round" d="M11 8.5V6" />
        </>
      ) : null}
      {name === "africa" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.2 4.8c1.3-.9 3.2-1.3 4.6-.4 1.1.7 1.4 2 2.6 2.5 1.2.5 2.4-.2 3.4.6.8.7.7 2 .2 2.9-.6 1.1-2 1.6-2.4 2.8-.3 1 .4 2.1.1 3.1-.4 1.3-1.9 2-3.3 1.8-1.1-.2-2 .6-3.1.7-1.3.1-2.6-.8-2.8-2.1-.2-1.2.7-2.2.6-3.4 0-1.2-1.2-2.1-1.1-3.3.1-1.3 1.3-2.3 1.2-3.2z"
        />
      ) : null}
      {name === "latam" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.8 3.8c1.3.6 1.8 2.1 1.4 3.4-.3 1.1.4 2.3 1.5 2.7 1 .4 1.5 1.6 1 2.6-.4.8-1.3 1.2-2.2 1.2-1 0-1.7.8-2 1.7-.4 1.3-1.6 2.3-3 2.4-1.1.1-1.9 1.1-1.8 2.2.1 1.1-.7 2.1-1.8 2.2-1 .1-1.9-.7-2-1.7-.2-1.3.7-2.4 1.8-3 .9-.5 1.4-1.5 1.2-2.5-.2-1.2.5-2.4 1.6-2.9.9-.4 1.5-1.3 1.5-2.3 0-1.2.8-2.3 2-2.8.3-.1.5-.2.8-.2z"
        />
      ) : null}
      {name === "chat" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.5 6.5h13A1.5 1.5 0 0 1 20 8v7.5a1.5 1.5 0 0 1-1.5 1.5H11l-4 3v-3H5.5A1.5 1.5 0 0 1 4 15.5V8a1.5 1.5 0 0 1 1.5-1.5z"
        />
      ) : null}
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-nav shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function GuidesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 md:pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">
      <HubBreadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]} />

      <section className="relative overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-3 md:gap-5">
          <div className="relative z-10 min-w-0 py-1">
            <p className="spice-kicker tracking-[0.14em] sm:tracking-[0.16em] flex items-center gap-3">
              Sourcing Guides
              <span className="hidden sm:block h-px w-10 bg-nav" aria-hidden="true" />
            </p>
            <h1 className="spice-heading text-[1.45rem] sm:text-[1.65rem] md:text-[2.05rem] mt-2 leading-snug">
              Spice Import & Sourcing Guides
            </h1>
            <p className="mt-2.5 max-w-xl text-[0.9rem] md:text-[0.98rem] leading-[1.5] md:leading-relaxed text-primary">
              Helpful information for importers, distributors and businesses sourcing spices, masalas and food ingredients from India.
            </p>
          </div>
          <div className="relative h-[7.25rem] sm:h-[8.5rem] md:h-[11.5rem] overflow-hidden">
            <Image
              src="/images/tell-us-what-you-need-spices.png"
              alt=""
              fill
              className="object-cover object-[90%_40%] md:object-[92%_38%]"
              sizes="(max-width: 768px) 42vw, 32vw"
            />
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-gradient-to-r from-[#f6efe3] via-[#f6efe3]/75 to-transparent md:w-[28%]"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      <ul className="mt-5 md:mt-6 space-y-2.5 md:space-y-3">
        {SOURCING_GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}`}
              className="card-spice flex items-center gap-3 md:gap-4 px-3.5 py-3 sm:px-4 sm:py-3.5 md:px-5 md:py-4"
            >
              <span className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center">
                <GuideIcon name={GUIDE_ICONS[guide.slug as keyof typeof GUIDE_ICONS]} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-[1.02rem] sm:text-[1.12rem] md:text-[1.25rem] text-primary leading-snug">
                  {guide.listingTitle}
                </span>
                <span className="block mt-1 text-[0.8rem] sm:text-[0.85rem] md:text-[0.92rem] text-muted leading-snug">
                  {guide.listingDescription}
                </span>
              </span>
              <ChevronIcon />
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/enquiry"
            className="card-spice spice-panel flex items-center gap-3 md:gap-4 px-3.5 py-3.5 sm:px-4 sm:py-4 md:px-5 md:py-4.5 border-nav/25"
          >
            <span className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center">
              <GuideIcon name="chat" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[1.02rem] sm:text-[1.12rem] md:text-[1.25rem] text-primary leading-snug">
                Have Specific Requirements?
              </span>
              <span className="block mt-1 text-[0.8rem] sm:text-[0.85rem] md:text-[0.92rem] text-muted leading-snug">
                Share your requirements through our enquiry form and our team will get back to you with suitable options and details.
              </span>
              <span className="btn-primary mt-2.5 !w-auto px-4 py-2 text-sm font-semibold">Enquire Now</span>
            </span>
            <ChevronIcon />
          </Link>
        </li>
      </ul>
    </div>
  );
}
