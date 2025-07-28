# 🔒 Production Security Guide

This document outlines the comprehensive security measures implemented for production deployment.

## 🛡️ Security Features Implemented

### 1. **Environment-Aware Security**
- **Development Mode**: Minimal security headers, relaxed rate limits
- **Production Mode**: Full security headers, strict rate limits
- **Automatic Detection**: Based on `NEXT_PUBLIC_APP_ENV` environment variable

### 2. **Security Headers (Production Only)**
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables browser XSS protection
- **Content Security Policy (CSP)**: Restricts resource loading
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS
- **Referrer-Policy**: Controls referrer information leakage
- **Permissions-Policy**: Restricts browser features

### 3. **Adaptive Rate Limiting**
- **Development**: 200 requests/min (generous limits)
- **Production**: 60 requests/min (strict limits)
- **Endpoint-Specific**: Different limits for auth, API, verification
- **Auto-Blocking**: IP blocking after repeated violations

### 4. **Input Validation & Sanitization**
- **DOMPurify Integration**: XSS prevention
- **Path Traversal Protection**: File system security
- **SQL Injection Protection**: Input sanitization
- **File Upload Security**: Enhanced type and size validation

## 🚀 Environment Configuration

### **Development Setup (`.env.local`)**
```env
# Enables development-friendly settings
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEBUG_MODE=true
NODE_ENV=development

# Your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Development Features:**
- ✅ Minimal security headers (no HSTS, relaxed CSP)
- ✅ High rate limits (200 req/min vs 60 in prod)
- ✅ Debug logging enabled
- ✅ Localhost access allowed
- ✅ Looser file size limits

### **Production Setup (`.env.production`)**
```env
# Enables full security features
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_DEBUG_MODE=false

# Production Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

**Production Features:**
- 🔒 Full security headers with HSTS
- 🔒 Strict rate limits (60 req/min)
- 🔒 Debug logging disabled
- 🔒 HTTPS enforcement
- 🔒 Strict file size limits

## 🔧 Rate Limit Configuration

| Route | Development | Production |
|-------|-------------|------------|
| `/login` | 20/min | 5/min |
| `/register` | 10/min | 3/min |
| `/api/` | 100/min | 30/min |
| `/verify/` | 50/min | 10/min |
| Default | 200/min | 60/min |

## 🛠️ Troubleshooting Development Issues

### **"Site Not Secure" Error**
If you see security warnings in development:

1. **Check Environment**: Ensure `NEXT_PUBLIC_APP_ENV=development` in `.env.local`
2. **Restart Server**: Run `npm run dev` after changing environment variables
3. **Clear Browser Cache**: Clear site data for localhost:3000
4. **Check Console**: Look for CSP or security header errors

### **Rate Limiting in Development**
If you're hitting rate limits during development:

1. **Increase Limits**: Development limits are already generous (200/min)
2. **Check IP**: Rate limiting is per-IP, make sure you're not sharing an IP
3. **Clear Rate Limit**: Restart the dev server to reset rate limit counters

### **CORS Issues**
Development includes localhost in allowed origins automatically.

## 📋 Pre-Production Deployment Checklist

### **1. Update Domain Configuration**
```typescript
// In src/middleware.ts - Update ALLOWED_ORIGINS
const ALLOWED_ORIGINS = [
  'https://yourdomain.com',        // Add your domain
  'https://www.yourdomain.com',    // Add www variant
];
```

### **2. Update Supabase CSP**
```typescript
// In next.config.ts - Update CSP domains
"connect-src 'self' https://your-production-supabase.supabase.co"
```

### **3. Environment Variables**
- Set `NEXT_PUBLIC_APP_ENV=production`
- Update Supabase URLs to production instance
- Disable debug mode

### **4. Security Testing**
- Test with [SecurityHeaders.com](https://securityheaders.com)
- Verify rate limiting works
- Test CORS restrictions
- Validate CSP policies

## 🔍 Security Monitoring

### **Development Monitoring**
- Security events logged to browser console
- Debug information with emoji indicators 🔐🌐📦
- Detailed error messages for troubleshooting

### **Production Monitoring**
- Security events logged to server logs
- Sanitized error messages (no sensitive data)
- IP blocking notifications
- Rate limit violation tracking

## 📚 Security Architecture

### **Key Security Files**
- `next.config.ts` - Security headers and CSP
- `src/middleware.ts` - Request filtering and rate limiting
- `src/utils/security.ts` - Security utilities
- `src/utils/validation.ts` - Input validation
- `src/utils/debug.ts` - Environment-aware logging

### **Security Flow**
1. **Request arrives** → Middleware processes
2. **Environment check** → Apply appropriate security level
3. **Rate limiting** → Check and update counters
4. **Pattern detection** → Scan for suspicious content
5. **Response headers** → Add security headers
6. **Logging** → Record security events

## ⚠️ Important Notes

- **Development vs Production**: Security features automatically adjust based on environment
- **Localhost Support**: Development mode allows localhost connections
- **Hot Reload**: Changes to `.env.local` require server restart
- **Browser Cache**: Clear browser cache when switching environments
- **Rate Limits**: Development has generous limits, production is strict

---

**Your application now supports both secure production deployment AND comfortable local development!** 🚀🔒