// Debug utility for centralized logging control

interface DebugConfig {
  enabled: boolean;
  auth: boolean;
  api: boolean;
  supabase: boolean;
  supabaseVerbose: boolean;
}

// Parse environment variables for debug configuration
const parseDebugEnv = (): DebugConfig => {
  // Check if debug mode is explicitly set
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE;
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';
  
  // Force disable debug in production unless explicitly overridden
  const defaultEnabled = isProduction 
    ? debugMode === 'true' // Only enable if explicitly set to true in production
    : (debugMode ? debugMode === 'true' : process.env.NODE_ENV === 'development');
  
  return {
    enabled: defaultEnabled,
    auth: process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true' || defaultEnabled,
    api: process.env.NEXT_PUBLIC_DEBUG_API === 'true' || defaultEnabled,
    supabase: process.env.NEXT_PUBLIC_DEBUG_SUPABASE === 'true' || defaultEnabled,
    supabaseVerbose: process.env.NEXT_PUBLIC_DEBUG_SUPABASE_VERBOSE === 'true' // Only when explicitly enabled
  };
};

const debugConfig = parseDebugEnv();

/**
 * Debug logger with category-based filtering
 */
export const debug = {
  /**
   * General debug logging (always respects main debug flag)
   */
  log: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.log(`🐛 ${message}`, ...args);
    }
  },

  /**
   * Authentication-related debug logging
   */
  auth: (message: string, ...args: any[]) => {
    if (debugConfig.auth) {
      console.log(`🔐 ${message}`, ...args);
    }
  },

  /**
   * API-related debug logging
   */
  api: (message: string, ...args: any[]) => {
    if (debugConfig.api) {
      console.log(`🌐 ${message}`, ...args);
    }
  },

  /**
   * Supabase-related debug logging
   */
  supabase: (message: string, ...args: any[]) => {
    if (debugConfig.supabase) {
      console.log(`📦 ${message}`, ...args);
    }
  },

  /**
   * Warning messages (always shown when debug is enabled)
   */
  warn: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },

  /**
   * Error messages (always shown when debug is enabled)
   */
  error: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.error(`❌ ${message}`, ...args);
    }
  },

  /**
   * Success messages (always shown when debug is enabled)
   */
  success: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.log(`✅ ${message}`, ...args);
    }
  },

  /**
   * Info messages (always shown when debug is enabled)
   */
  info: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  },

  /**
   * Get current debug configuration
   */
  getConfig: () => debugConfig,

  /**
   * Check if debug mode is enabled
   */
  isEnabled: () => debugConfig.enabled,

  /**
   * Check if specific category is enabled
   */
  isAuthEnabled: () => debugConfig.auth,
  isApiEnabled: () => debugConfig.api,
  isSupabaseEnabled: () => debugConfig.supabase,
  isSupabaseVerboseEnabled: () => debugConfig.supabaseVerbose
};

// Export individual debug functions for convenience
export const { log, warn, error, success, info } = debug;