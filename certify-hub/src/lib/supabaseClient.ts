import { createClient } from '@supabase/supabase-js';

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
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
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
        console.warn('Fetch error:', error);
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
      console.warn('Session error:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.warn('Failed to get session:', error);
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
      console.warn('User fetch error:', error.message);
      return null;
    }
    return user;
  } catch (error) {
    console.warn('Failed to get user:', error);
    return null;
  }
};
