// OAuth Redirect Utility - Environment-aware callback URL handling

export const getOAuthCallbackUrl = (): string => {
  if (typeof window === 'undefined') {
    throw new Error('getOAuthCallbackUrl can only be called on the client side');
  }

  const callbackUrl = `${window.location.origin}/auth/callback`;
  console.log('OAuth callback URL:', callbackUrl);
  
  return callbackUrl;
};

export const validateOAuthEnvironment = (): { 
  valid: boolean; 
  warnings: string[]; 
} => {
  if (typeof window === 'undefined') {
    return {
      valid: false,
      warnings: ['Server-side execution detected']
    };
  }

  const warnings: string[] = [];

  // Check for missing environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    warnings.push('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    warnings.push('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable');
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
};

