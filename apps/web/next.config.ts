import path from "path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@spicycorner/shared"],
  staticPageGenerationTimeout: 120,
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "*": [
      "./data/**/*",
      "../../data/products.json",
      "../../data/spices.json",
      "../../data/recipes.json",
      "../../data/comparisons.json",
      "../../scripts/data/spicycenter-catalog.json",
    ],
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async redirects() {
    return [
      { source: "/just", destination: "/", permanent: true },
      { source: "/spice-guide/compare/:slug", destination: "/spice-guide/comparisons/:slug", permanent: true },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
  },
};

export default nextConfig;
