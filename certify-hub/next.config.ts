import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimized for Vercel deployment
  trailingSlash: true,
  images: {
    // Enable image optimization for Vercel
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
  },
  // Enable experimental features for better performance
  experimental: {
    // optimizeCss: true, // Disabled due to critters module issue
  },
  // Disable font optimization to avoid preload warnings
  optimizeFonts: false,
};

export default nextConfig;
