import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — Shop spices to USA Online`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: site.primaryColor,
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: site.logoSrc,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
