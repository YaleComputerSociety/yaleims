import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The integration tests (scripts/test-integration.mts) run a second dev
  // server next to yours, with its own build directory.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Using unoptimized images means they're served directly; rely on cache headers below
    unoptimized: true,
    localPatterns: [
      {
        pathname: '/college_flags/**',
        search: 'v',
      },
      {
        pathname: '/dev_images/**',
        search: 'v',
      },
      {
        pathname: '/mvp_images/**',
        search: 'v',
      },
      {
        pathname: '/loader_animations/**',
        search: 'v',
      },
      {
        pathname: '/*.png',
        search: 'v',
      },
      {
        pathname: '/*.ico',
        search: 'v',
      },
      {
        pathname: '/*.gif',
        search: 'v',
      },
    ],
  },
  async headers() {
    return [
      {
        // Security headers on every response. No script Content-Security-Policy:
        // Next's inline scripts would need per-request nonces, which make every
        // page dynamic. HSTS leaves out includeSubDomains/preload, which would
        // bind every yaleims.com subdomain.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
      {
        // Cache static images with version query parameter
        // e.g., /image.png?v=1.0.0
        source: "/(.*)\\.(png|jpg|jpeg|gif|svg|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            // Cache for 1 year if version param exists, otherwise 1 day
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Vary",
            value: "Accept-Encoding",
          },
        ],
      },
      {
        // Cache images in specific directories (college flags, dev images, etc.)
        source: "/college_flags/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/dev_images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/loader_animations/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/mvp_images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // API routes should not be cached
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;