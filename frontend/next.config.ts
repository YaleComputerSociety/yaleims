import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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