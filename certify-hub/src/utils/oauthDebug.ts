// OAuth Debug Utility
// Use this to troubleshoot OAuth issues in production

export const debugOAuthEnvironment = () => {
  if (typeof window === 'undefined') return null;
  
  const debug = {
    currentOrigin: window.location.origin,
    currentHost: window.location.host,
    currentHostname: window.location.hostname,
    expectedCallbackUrl: `${window.location.origin}/auth/callback`,
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    isProduction: process.env.NODE_ENV === 'production',
    isLocalhost: window.location.hostname === 'localhost',
    protocol: window.location.protocol,
    port: window.location.port
  };
  
  console.group('🔍 OAuth Environment Debug');
  console.table(debug);
  console.groupEnd();
  
  return debug;
};

export const validateOAuthConfiguration = () => {
  const issues: string[] = [];
  
  if (typeof window === 'undefined') {
    return { valid: false, issues: ['Running on server side'] };
  }
  
  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    issues.push('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID');
  }
  
  // Check protocol in production
  if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
    issues.push('Production should use HTTPS');
  }
  
  // Check if running on localhost in production
  if (process.env.NODE_ENV === 'production' && window.location.hostname === 'localhost') {
    issues.push('Production detected but running on localhost');
  }
  
  const result = {
    valid: issues.length === 0,
    issues,
    callbackUrl: `${window.location.origin}/auth/callback`,
    environment: process.env.NODE_ENV,
    origin: window.location.origin
  };
  
  if (issues.length > 0) {
    console.group('⚠️ OAuth Configuration Issues');
    issues.forEach(issue => console.warn(issue));
    console.groupEnd();
  } else {
    console.log('✅ OAuth configuration appears valid');
  }
  
  return result;
};