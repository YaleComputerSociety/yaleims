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
            value: "public, max-age=31536000, immutable",
          },
        ],
      },

      // Image Optimization route (kept for completeness even if images.unoptimized=true)
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=59",
          },
        ],
      },

      // Cache fonts aggressively (file names rarely change)
      {
        source: "/:all*.(woff|woff2|ttf|otf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },

      // Cache common image types from /public
      {
        source: "/:all*.(png|jpg|jpeg|gif|svg|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
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