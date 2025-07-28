import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimized for Vercel deployment
  trailingSlash: true,
  images: {
    // Enable image optimization for Vercel
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
    // Security: Restrict image domains
    domains: ['mgwhyyydiudpwufipnyl.supabase.co'],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable experimental features for better performance
  experimental: {
    // optimizeCss: true, // Disabled due to critters module issue
  },
  // Security headers (production only)
  async headers() {
    const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';
    
    if (!isProduction) {
      // Development: minimal security headers
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
          ],
        },
      ];
    }

    // Production: full security headers
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mgwhyyydiudpwufipnyl.supabase.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://mgwhyyydiudpwufipnyl.supabase.co",
              "connect-src 'self' https://mgwhyyydiudpwufipnyl.supabase.co wss://mgwhyyydiudpwufipnyl.supabase.co",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Strict Transport Security (HTTPS only)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
      // Additional security for API routes
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, nosnippet, noarchive',
          },
        ],
      },
    ];
  },
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
