import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in-memory for simplicity, use Redis in production cluster)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

// Configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';

const RATE_LIMITS = {
  '/api/': isProduction ? 30 : 100, // API routes: 30 prod, 100 dev
  '/login': isProduction ? 5 : 20,  // Login attempts: 5 prod, 20 dev
  '/register': isProduction ? 3 : 10, // Registration: 3 prod, 10 dev
  '/verify/': isProduction ? 10 : 50, // Certificate verification: 10 prod, 50 dev
  default: isProduction ? 60 : 200 // Default: 60 prod, 200 dev
};

// Security patterns
const SUSPICIOUS_PATTERNS = [
  /(?:union|select|insert|update|delete|drop|create|alter|exec|script)/i,
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /javascript:/i,
  /vbscript:/i,
  /onload|onerror|onclick/i,
  /\.\.\/|\.\.\\|\/etc\/passwd|\/etc\/shadow/i,
];

// Blocked user agents (bots, scanners)
const BLOCKED_USER_AGENTS = [
  /bot|crawler|spider|scraper/i,
  /nmap|nikto|sqlmap|dirb|gobuster/i,
  /masscan|zmap|zgrab/i,
];

// Allowed origins (CORS)
const ALLOWED_ORIGINS = [
  'https://certhub.zgzg.io', // Your actual domain
  'https://www.certhub.zgzg.io',
  'https://zgzg.io',
  'https://www.zgzg.io',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : [])
];

function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  // Fallback to a deterministic identifier
  return 'unknown';
}

function getRateLimitKey(ip: string, pathname: string): string {
  return `${ip}:${pathname}`;
}

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimit.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= limit) {
    return false;
  }
  
  entry.count++;
  return true;
}

function detectSuspiciousContent(url: string, headers: Headers): boolean {
  // Check URL for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }
  
  // Check User-Agent
  const userAgent = headers.get('user-agent') || '';
  for (const pattern of BLOCKED_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }
  
  return false;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add additional runtime security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Remove server fingerprinting headers
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Skip most security checks in development
  if (isDevelopment) {
    // Only basic security headers in development
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }
  
  // Log security events in production
  if (isProduction) {
    console.log(`[Security] ${request.method} ${pathname} - IP: ${ip} - UA: ${userAgent.substring(0, 100)}`);
  }
  
  // 1. CORS Check for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`[Security] Blocked CORS request from origin: ${origin}`);
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  
  // 2. Suspicious content detection
  if (detectSuspiciousContent(request.url, request.headers)) {
    console.warn(`[Security] Suspicious request detected: ${pathname} from ${ip}`);
    return new NextResponse('Bad Request', { status: 400 });
  }
  
  // 3. Rate limiting
  let limit = RATE_LIMITS.default;
  for (const [path, pathLimit] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      limit = pathLimit;
      break;
    }
  }
  
  const rateLimitKey = getRateLimitKey(ip, pathname);
  if (!checkRateLimit(rateLimitKey, limit)) {
    console.warn(`[Security] Rate limit exceeded: ${ip} on ${pathname}`);
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.floor((Date.now() + RATE_LIMIT_WINDOW) / 1000).toString(),
      }
    });
  }
  
  // 4. Block known bad IPs (you can extend this with a database/service)
  const BLOCKED_IPS: string[] = [
    // Add known malicious IPs here
    // '192.168.1.100',
  ];
  
  if (BLOCKED_IPS.includes(ip)) {
    console.warn(`[Security] Blocked IP: ${ip}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // 5. Enforce HTTPS in production
  if (process.env.NEXT_PUBLIC_APP_ENV === 'production' && request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(`https://${request.headers.get('host')}${request.nextUrl.pathname}${request.nextUrl.search}`);
  }
  
  // 6. Add security headers to response
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};