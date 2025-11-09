import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Using unoptimized images means they’re served directly; rely on cache headers below
    unoptimized: true,
  }
};

export default nextConfig;