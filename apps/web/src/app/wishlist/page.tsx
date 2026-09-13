import type { Metadata } from "next";
import { WishlistPageClient } from "./WishlistPageClient";

export const metadata: Metadata = {
  title: "Wish List",
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}
