# Google OAuth Production Fix Guide

## Problem
Google OAuth redirects to localhost instead of production domain after authentication.

## Root Causes & Solutions

### 1. Google Cloud Console Configuration
**Most Common Issue**: Google OAuth authorized redirect URIs only include localhost.

**Fix Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Credentials > Credentials
3. Find your OAuth 2.0 Client ID: `YOUR_GOOGLE_CLIENT_ID`
4. Click Edit (pencil icon)
5. In "Authorized redirect URIs" section, add your production URLs:
   ```
   https://your-production-domain.com/auth/callback
   https://your-production-domain.vercel.app/auth/callback
   ```
6. Keep the localhost URLs for development:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   ```
7. Click "Save"

### 2. Supabase Dashboard Configuration
**Check**: OAuth provider settings in Supabase dashboard.

**Fix Steps:**
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Click on Google provider
4. Verify the "Site URL" is set to your production domain
5. Add your production domain to "Redirect URLs":
   ```
   https://your-production-domain.com/auth/callback
   ```

### 3. Environment Variables Fix
**Issue**: Missing or incorrect production environment variables.

**Current Status:**
- ✅ Code uses `window.location.origin` (dynamic, works correctly)
- ⚠️  Production environment file needs actual values

**Fix Steps:**
1. Update `.env.production` with real values:
   ```env
   # Replace with actual production values
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
   
   # Google OAuth (same as development - client ID is domain-agnostic)
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NEXT_PUBLIC_GOOGLE_REDIRECT_URL=/auth/callback
   ```

### 4. Deployment Environment Variables
**Ensure your hosting platform (Vercel/Netlify/etc.) has:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Testing Steps

1. **Development Test:**
   ```bash
   npm run dev
   # Test login at http://localhost:3001
   ```

2. **Production Test:**
   ```bash
   npm run build && npm start
   # Test login at your production URL
   ```

3. **Verify Callback:**
   - After Google auth, should redirect to: `https://your-domain.com/auth/callback`
   - Then automatically redirect to: `https://your-domain.com/dashboard`

## Quick Diagnostic

**Check Current Configuration:**
1. Open browser dev tools
2. Attempt Google login
3. Check Network tab for redirect URLs
4. Verify the `redirectTo` parameter in the OAuth request

**Expected Flow:**
```
1. User clicks "Continue with Google"
2. Redirected to: accounts.google.com/oauth/authorize?...&redirect_uri=https://PRODUCTION-DOMAIN/auth/callback
3. After auth: redirected to https://PRODUCTION-DOMAIN/auth/callback
4. Callback page processes auth and redirects to /dashboard
```

## Code Analysis ✅

The application code is already configured correctly:
- ✅ Uses `window.location.origin` for dynamic redirect URL
- ✅ Auth callback page handles OAuth responses properly  
- ✅ No hardcoded localhost URLs in OAuth flow
- ✅ Environment-aware security configurations

**The issue is most likely in external configurations (Google Console or Supabase dashboard), not the code.**