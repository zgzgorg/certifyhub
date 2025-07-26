import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily disable static export for development
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
