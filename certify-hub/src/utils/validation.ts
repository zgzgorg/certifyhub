import DOMPurify from 'isomorphic-dompurify';

// Email validation with more robust patterns
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

// Sanitize HTML content to prevent XSS
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []
  });
};

// Sanitize general text input
export const sanitizeText = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/[<>]/g, '') // Remove potential HTML
    .substring(0, 1000); // Limit length
};

// Validate and sanitize certificate metadata
export const sanitizeMetadata = (metadata: Record<string, any>): Record<string, string> => {
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

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  pdf: 10 * 1024 * 1024,  // 10MB
  csv: 5 * 1024 * 1024,   // 5MB for CSV files
  document: 10 * 1024 * 1024 // 10MB
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

// Rate limiting helper
export class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const existing = this.requests.get(identifier) || [];
    
    // Filter out requests outside the window
    const validRequests = existing.filter(time => time > windowStart);
    
    // Check if within limit
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
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

// Create global rate limiter instances
export const authRateLimiter = new RateLimiter(5, 60000); // 5 auth attempts per minute
export const apiRateLimiter = new RateLimiter(30, 60000); // 30 API calls per minute

// Cleanup rate limiters periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    authRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  }, 60000); // Cleanup every minute
}