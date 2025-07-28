// Production Security Utilities

import { createHash, randomBytes } from 'crypto';

// Security configuration
const PRODUCTION_MODE = process.env.NEXT_PUBLIC_APP_ENV === 'production';

/**
 * Generate secure random tokens
 */
export const generateSecureToken = (length: number = 32): string => {
  return randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data (for logging, tracking, etc.)
 */
export const hashSensitiveData = (data: string): string => {
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
};

/**
 * Validate and sanitize file names
 */
export const sanitizeFileName = (fileName: string): string => {
  if (typeof fileName !== 'string') return '';
  
  return fileName
    .replace(/[^\w\s.-]/g, '') // Only allow alphanumeric, spaces, dots, dashes
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^[.-]/, '') // Remove leading dots or dashes
    .substring(0, 100); // Limit length
};

/**
 * Content Security Policy violation handler
 */
export const handleCSPViolation = (report: any) => {
  if (PRODUCTION_MODE) {
    console.error('[Security] CSP Violation:', {
      blockedURI: report['blocked-uri'],
      violatedDirective: report['violated-directive'],
      originalPolicy: report['original-policy'],
      timestamp: new Date().toISOString()
    });
    
    // In production, you might want to send this to a security monitoring service
    // sendToSecurityService(report);
  }
};

/**
 * Detect and prevent timing attacks
 */
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

/**
 * Secure session configuration
 */
export const getSecureSessionConfig = () => ({
  secure: PRODUCTION_MODE, // Only secure cookies in production
  httpOnly: true,
  sameSite: 'strict' as const,
  maxAge: PRODUCTION_MODE ? 3600 : 86400, // 1 hour in prod, 24 hours in dev
  path: '/',
});

/**
 * Input sanitization for SQL-like queries (even though we use Supabase)
 */
export const sanitizeDatabaseInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove SQL injection patterns
  return input
    .replace(/(['";]|--|\*|\||&)/g, '')
    .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|script|eval)\b/gi, '')
    .trim()
    .substring(0, PRODUCTION_MODE ? 200 : 500);
};

/**
 * Generate nonce for CSP
 */
export const generateNonce = (): string => {
  return randomBytes(16).toString('base64');
};

/**
 * Validate origin for CORS
 */
export const isValidOrigin = (origin: string): boolean => {
  const allowedOrigins = [
    'https://your-domain.com',
    'https://www.your-domain.com',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : [])
  ];
  
  return allowedOrigins.includes(origin);
};

/**
 * Security headers for API responses
 */
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
});

/**
 * Log security events
 */
export const logSecurityEvent = (event: string, details: any, severity: 'low' | 'medium' | 'high' = 'medium') => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details: PRODUCTION_MODE ? hashSensitiveData(JSON.stringify(details)) : details,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };
  
  if (PRODUCTION_MODE) {
    // In production, send to monitoring service
    console.error(`[Security-${severity.toUpperCase()}]`, logEntry);
  } else {
    console.warn(`[Security-${severity.toUpperCase()}]`, logEntry);
  }
};

/**
 * Validate JWT tokens (basic validation)
 */
export const isValidJWTFormat = (token: string): boolean => {
  if (typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Basic format validation
    parts.forEach(part => {
      if (!part.match(/^[A-Za-z0-9_-]+$/)) {
        throw new Error('Invalid JWT format');
      }
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Honeypot field validation (trap for bots)
 */
export const validateHoneypot = (honeypotValue: string | undefined): boolean => {
  // Honeypot field should always be empty for legitimate users
  return !honeypotValue || honeypotValue.trim() === '';
};

/**
 * Rate limit key generation
 */
export const generateRateLimitKey = (identifier: string, action: string): string => {
  return `${hashSensitiveData(identifier)}:${action}`;
};

/**
 * Secure URL validation
 */
export const isSecureURL = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS in production
    if (PRODUCTION_MODE && parsed.protocol !== 'https:') {
      return false;
    }
    
    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
    if (dangerousProtocols.includes(parsed.protocol)) {
      return false;
    }
    
    // Block localhost and private IPs in production
    if (PRODUCTION_MODE) {
      const hostname = parsed.hostname;
      if (
        hostname === 'localhost' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.') ||
        hostname === '127.0.0.1'
      ) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
};

export default {
  generateSecureToken,
  hashSensitiveData,
  sanitizeFileName,
  handleCSPViolation,
  constantTimeCompare,
  getSecureSessionConfig,
  sanitizeDatabaseInput,
  generateNonce,
  isValidOrigin,
  getSecurityHeaders,
  logSecurityEvent,
  isValidJWTFormat,
  validateHoneypot,
  generateRateLimitKey,
  isSecureURL,
};