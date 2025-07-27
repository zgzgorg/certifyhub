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
  // Webpack configuration to handle html2canvas issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle html2canvas module loading issues
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Ensure html2canvas is properly bundled
      config.module.rules.push({
        test: /html2canvas/,
        type: 'javascript/auto',
      });
    }
    return config;
  },
};

export default nextConfig;
