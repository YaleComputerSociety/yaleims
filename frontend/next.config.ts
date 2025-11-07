import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Using unoptimized images means they’re served directly; rely on cache headers below
    unoptimized: true,
  },
  experimental: {},
  compress: true,
  poweredByHeader: false,

  // Cache policy for static assets and common public files
  async headers() {
    return [
      // Long-term cache for build output with content-hashed filenames
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=7776000, immutable", // 3 months
          },
        ],
      },

      // Image Optimization route (kept for completeness even if images.unoptimized=true)
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=7776000, stale-while-revalidate=59", // 3 months at the CDN
          },
        ],
      },

      // Cache fonts aggressively (file names rarely change)
      {
        source: "/:all*.(woff|woff2|ttf|otf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=7776000, immutable", // 3 months
          },
        ],
      },

      // Cache common image types from /public
      {
        source: "/:all*.(png|jpg|jpeg|gif|svg|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=7776000, immutable", // 3 months
          },
        ],
      },

      // Example: manifest files – cache but allow updates within a day
      {
        source: "/:all*(manifest).json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },

      // By default, don’t cache API responses globally unless explicitly handled per route
      // This prevents sensitive data from being cached inadvertently.
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;