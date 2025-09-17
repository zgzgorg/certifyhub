import DOMPurify from 'isomorphic-dompurify';

// Production security configuration
const PRODUCTION_MODE = process.env.NEXT_PUBLIC_APP_ENV === 'production';

// Enhanced email validation with security checks
export const isValidEmail = (email: string): boolean => {
  if (typeof email !== 'string' || !email.trim()) return false;
  
  // Basic format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email) || email.length > 254) return false;
  
  // Security checks for malicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload|onerror|onclick/i,
    /\.\./,
    /[<>'"]/
  ];
  
  return !suspiciousPatterns.some(pattern => pattern.test(email));
};

// Sanitize HTML content to prevent XSS
export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Extra strict sanitization for production
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    SANITIZE_DOM: true,
    SANITIZE_NAMED_PROPS: true,
    KEEP_CONTENT: false
  });
};

// Sanitize general text input
export const sanitizeText = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/[<>'"&]/g, '') // Remove potential HTML and XSS chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, PRODUCTION_MODE ? 500 : 1000); // Stricter limits in production
};

// Enhanced path traversal detection
export const isSecurePath = (path: string): boolean => {
  if (typeof path !== 'string') return false;
  
  const dangerousPatterns = [
    /\.\./,
    /\/\.\./,
    /\.\.\\/,
    /\/etc\/passwd/,
    /\/etc\/shadow/,
    /\/proc\//,
    /\/sys\//,
    /\\windows\\system32/i,
    /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\/i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(path));
};

// Validate and sanitize certificate metadata
export const sanitizeMetadata = (metadata: Record<string, unknown>): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Validate key
    const cleanKey = sanitizeText(key);
    if (cleanKey.length === 0 || cleanKey.length > 50) continue;
    
    // Validate and sanitize value
    const cleanValue = sanitizeText(String(value));
    if (cleanValue.length === 0 || cleanValue.length > 500) continue;
    
    sanitized[cleanKey] = cleanValue;
  }
  
  return sanitized;
};

// Validate file types for uploads
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  csv: ['text/csv', 'application/csv', 'text/plain'],
  document: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/csv', 'application/csv']
} as const;

export const isValidFileType = (
  file: File, 
  category: keyof typeof ALLOWED_FILE_TYPES
): boolean => {
  const allowedTypes = ALLOWED_FILE_TYPES[category] as readonly string[];
  return allowedTypes.includes(file.type);
};

// File size limits (in bytes) - stricter in production
export const FILE_SIZE_LIMITS = {
  image: PRODUCTION_MODE ? 2 * 1024 * 1024 : 5 * 1024 * 1024, // 2MB prod, 5MB dev
  pdf: PRODUCTION_MODE ? 5 * 1024 * 1024 : 10 * 1024 * 1024,  // 5MB prod, 10MB dev
  csv: PRODUCTION_MODE ? 2 * 1024 * 1024 : 5 * 1024 * 1024,   // 2MB prod, 5MB dev
  document: PRODUCTION_MODE ? 5 * 1024 * 1024 : 10 * 1024 * 1024 // 5MB prod, 10MB dev
} as const;

export const isValidFileSize = (
  file: File, 
  category: keyof typeof FILE_SIZE_LIMITS
): boolean => {
  return file.size <= FILE_SIZE_LIMITS[category];
};

// Validate certificate status
export const VALID_CERTIFICATE_STATUSES = ['active', 'revoked', 'expired'] as const;
export type CertificateStatus = typeof VALID_CERTIFICATE_STATUSES[number];

export const isValidCertificateStatus = (status: string): status is CertificateStatus => {
  return VALID_CERTIFICATE_STATUSES.includes(status as CertificateStatus);
};

// Enhanced rate limiting helper with security features
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private blockedIPs = new Set<string>();
  private suspiciousActivity = new Map<string, number>();
  
  constructor(
    private maxRequests: number = PRODUCTION_MODE ? 5 : 10,
    private windowMs: number = 60000, // 1 minute
    private blockThreshold: number = PRODUCTION_MODE ? 3 : 5 // Violations before blocking
  ) {}
  
  isAllowed(identifier: string): boolean {
    // Check if IP is blocked
    if (this.blockedIPs.has(identifier)) {
      return false;
    }
    
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const existing = this.requests.get(identifier) || [];
    
    // Filter out requests outside the window
    const validRequests = existing.filter(time => time > windowStart);
    
    // Check if within limit
    if (validRequests.length >= this.maxRequests) {
      // Track suspicious activity
      const violations = this.suspiciousActivity.get(identifier) || 0;
      this.suspiciousActivity.set(identifier, violations + 1);
      
      // Block IP if too many violations
      if (violations + 1 >= this.blockThreshold) {
        this.blockedIPs.add(identifier);
        console.warn(`[Security] IP blocked for excessive rate limiting violations: ${identifier}`);
      }
      
      return false;
    }
    
    // Reset violations on successful request
    this.suspiciousActivity.delete(identifier);
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  isBlocked(identifier: string): boolean {
    return this.blockedIPs.has(identifier);
  }
  
  unblock(identifier: string): void {
    this.blockedIPs.delete(identifier);
    this.suspiciousActivity.delete(identifier);
  }
  
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Create global rate limiter instances with production security
export const authRateLimiter = new RateLimiter(
  PRODUCTION_MODE ? 3 : 5, // 3 auth attempts per minute in prod
  60000, // 1 minute window
  PRODUCTION_MODE ? 2 : 3 // Block after 2 violations in prod
);

export const apiRateLimiter = new RateLimiter(
  PRODUCTION_MODE ? 20 : 30, // 20 API calls per minute in prod
  60000, // 1 minute window
  PRODUCTION_MODE ? 3 : 5 // Block after 3 violations in prod
);

// Cleanup rate limiters periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    authRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  }, 60000); // Cleanup every minute
}