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
      "../../scripts/data/spicycenter-catalog.json",
    ],
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    return [{ source: "/just", destination: "/", permanent: true }];
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
