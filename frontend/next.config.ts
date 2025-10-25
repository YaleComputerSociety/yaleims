import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, 
  },
  experimental: {},
  compress: true,
  poweredByHeader: false
};

export default nextConfig;