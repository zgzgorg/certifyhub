import { createClient } from '@supabase/supabase-js';
import { debug } from '../utils/debug';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'certifyhub-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    debug: debug.isSupabaseVerboseEnabled() // Only enable verbose logs when explicitly requested
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'certifyhub-web'
    },
    fetch: (url, options = {}) => {
      try {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000), // 10 second timeout for all requests
        });
      } catch (error) {
        debug.warn('Fetch error:', error);
        throw error;
      }
    }
  },
  realtime: {
    timeout: 20000
  }
});

// Helper function to safely get session
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      debug.warn('Session error:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    debug.warn('Failed to get session:', error);
    return null;
  }
};

// Helper function to safely get user
export const getUser = async () => {
  try {
    const session = await getSession();
    if (!session?.user) {
      return null;
    }
    
    // Only call getUser if we have a valid session
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      debug.warn('User fetch error:', error.message);
      return null;
    }
    return user;
  } catch (error) {
    debug.warn('Failed to get user:', error);
    return null;
  }
};

// Helper function to safely sign out
export const signOutSafely = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // Try local sign out first (fastest, no server round trip)
    const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
    
    if (!localError) {
      return { success: true };
    }
    
    // If local sign out fails, try without scope parameter
    const { error: globalError } = await supabase.auth.signOut();
    
    if (!globalError) {
      return { success: true };
    }
    
    // If both methods fail, still consider it successful for UX
    // but log the error for debugging
    debug.warn('Sign out server error (proceeding with local cleanup):', globalError.message);
    return { success: true, error: globalError.message };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    debug.warn('Sign out failed (proceeding with local cleanup):', errorMessage);
    return { success: true, error: errorMessage };
  } finally {
    // Always clear local storage regardless of server response
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('certifyhub-auth-token');
        // Clear any other auth-related items
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        debug.warn('Could not clear localStorage:', storageError);
      }
    }
  }
};
