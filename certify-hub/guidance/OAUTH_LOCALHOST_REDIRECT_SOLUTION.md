# Google OAuth Localhost Redirect Issue - Complete Solution

## 🎯 Problem
When using Google OAuth with Supabase, after setting the Supabase Site URL to production domain, both production AND localhost development environments redirect to the production domain after authentication, breaking local development.

## 🔍 Root Cause
The **Supabase Site URL** setting acts as a default fallback for OAuth redirects. When set to production (`https://your-domain.com`), ALL OAuth flows redirect there, including local development.

## ✅ Complete Solution

### 1. Supabase Dashboard Configuration

**Navigate to:** Supabase Dashboard → Authentication → URL Configuration

**Set Site URL:**
```
https://your-production-domain.com
```

**Add ALL these Redirect URLs (one per line):**
```
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://your-production-domain.com/auth/callback
https://your-production-domain.vercel.app/auth/callback
```

### 2. Google Cloud Console Configuration

**Navigate to:** Google Cloud Console → APIs & Credentials → OAuth 2.0 Client IDs

**Add the same URLs to "Authorized redirect URIs":**
```
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://your-production-domain.com/auth/callback
https://your-production-domain.vercel.app/auth/callback
```

### 3. Code Implementation

The application uses environment-aware OAuth redirect handling:

```javascript
// src/utils/oauthRedirect.ts
export const getOAuthCallbackUrl = (): string => {
  const callbackUrl = `${window.location.origin}/auth/callback`;
  return callbackUrl;
};

// src/components/GoogleLoginButton.tsx
const callbackUrl = getOAuthCallbackUrl();

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: callbackUrl  // Explicit redirect overrides Site URL
  }
});
```

## 🚀 How It Works

### Development Environment
- User runs: `npm run dev`
- `window.location.origin` = `http://localhost:3000`
- Callback URL = `http://localhost:3000/auth/callback`
- **Result:** Redirects back to localhost ✅

### Production Environment
- User visits: `https://your-domain.com`
- `window.location.origin` = `https://your-domain.com`
- Callback URL = `https://your-domain.com/auth/callback`
- **Result:** Redirects back to production ✅

## 🔧 Key Technical Details

### Why This Fixes The Issue
1. **Explicit `redirectTo` parameter** overrides Supabase Site URL setting
2. **Dynamic origin detection** (`window.location.origin`) automatically adapts to environment
3. **Multiple allowed URLs** in both Supabase and Google Console permit both environments
4. **Environment validation** prevents common configuration errors

### Security Considerations
- Only pre-approved URLs can be used for OAuth redirects
- HTTPS enforced for production environments
- Localhost only allowed for development ports (3000, 3001)

## ✅ Testing

### Development Test
```bash
npm run dev
# Visit http://localhost:3000
# Click "Continue with Google" 
# Should redirect: Google → localhost → Dashboard
```

### Production Test  
```bash
# Visit https://your-domain.com
# Click "Continue with Google"
# Should redirect: Google → production → Dashboard
```

## 🔥 Common Issues & Solutions

### Issue: Still redirects to localhost in production
**Cause:** Testing locally with production environment variables
**Solution:** Deploy to actual production URL and test there

### Issue: "redirect_uri_mismatch" error
**Cause:** Missing URL in Google Console authorized redirect URIs
**Solution:** Add the exact callback URL to Google Console

### Issue: "Invalid redirect URL" from Supabase
**Cause:** Missing URL in Supabase redirect URLs list  
**Solution:** Add the callback URL to Supabase Dashboard

## 📝 Configuration Checklist

- [ ] Supabase Site URL set to production domain
- [ ] All callback URLs added to Supabase redirect URLs
- [ ] Same URLs added to Google Console authorized redirect URIs
- [ ] Environment variables properly configured in hosting platform
- [ ] Code deployed and tested in actual environments (not localhost for production)

## 🎯 Files Modified

- `src/components/GoogleLoginButton.tsx` - Enhanced OAuth handling
- `src/utils/oauthRedirect.ts` - Environment-aware callback URL utility
- `src/app/auth/callback/page.tsx` - OAuth callback processor (existing)

## 🚀 Result

✅ **Development:** Google OAuth → localhost callback → localhost dashboard  
✅ **Production:** Google OAuth → production callback → production dashboard  
✅ **Security:** Only authorized URLs accepted for redirects  
✅ **Maintenance:** Single codebase works for all environments