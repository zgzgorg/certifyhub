export const authConfig = {
  // OAuth providers configuration
  oauth: {
    google: {
      enabled: true,
      // 使用Supabase的默认callback，不需要自定义redirectUrl
    },
  },
  
  // Auth settings
  settings: {
    // Session settings
    session: {
      lifetime: 60 * 60 * 24 * 7, // 7 days
      refreshThreshold: 60 * 60 * 24, // 1 day
    },
    
    // Password settings
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
  },
  
  // URLs
  urls: {
    login: '/login',
    register: '/register',
    dashboard: '/dashboard',
    resetPassword: '/reset-password',
  },
};

// Helper function to check if OAuth provider is enabled
export const isOAuthProviderEnabled = (provider: keyof typeof authConfig.oauth) => {
  return authConfig.oauth[provider]?.enabled === true;
};
