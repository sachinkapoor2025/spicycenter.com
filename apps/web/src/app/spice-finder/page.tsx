import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { SpiceFinder } from "@/components/SpiceFinder";

export const metadata: Metadata = pageMetadata({
  title: "Spice Finder — which Indian spice should I use?",
  description: "Choose a dish and see recommended Indian spices with flavour notes and retail or bulk links.",
  path: "/spice-finder",
});

export default function SpiceFinderPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="spice-heading text-4xl">Spice Finder</h1>
      <p className="mt-3 text-muted">Like asking the person behind the spice counter what you need for dinner.</p>
      <div className="mt-8">
        <SpiceFinder />
      </div>
    </div>
  );
}
