'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signOutSafely } from '../lib/supabaseClient';
import { Organization, RegularUser } from '../types/user';
import { debug } from '../utils/debug';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  regularUser: RegularUser | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
  resetAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [regularUser, setRegularUser] = useState<RegularUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Simplified refs for race condition prevention
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetAuthState = useCallback(() => {
    debug.auth('Resetting auth state...');
    
    // Cancel any ongoing fetch operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setUser(null);
    setOrganization(null);
    setRegularUser(null);
    setLoading(false);
    setError(null);
    isFetchingRef.current = false;
  }, []);

  const fetchUserData = useCallback(async (userId: string): Promise<void> => {
    // Prevent concurrent requests
    if (isFetchingRef.current) {
      debug.warn('fetchUserData already in progress, skipping...');
      return;
    }
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    debug.auth(`Starting fetchUserData for user: ${userId?.substring(0, 8)}...`);
    
    isFetchingRef.current = true;
    
    try {
      setError(null);
      
      // Check if request was aborted
      if (signal.aborted) return;
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        debug.error('Session error:', sessionError.message);
        throw sessionError;
      }
      
      if (!session?.user) {
        debug.warn('No active session found');
        setOrganization(null);
        setRegularUser(null);
        return;
      }
      
      // Verify user ID matches
      if (session.user.id !== userId) {
        debug.warn('Session user ID mismatch');
        return;
      }
      
      if (signal.aborted) return;
      
      const user = session.user;
      const userRole = user?.user_metadata?.role;
      
      debug.auth(`User role: ${userRole}`);

      // Fetch additional user data based on role
      if (userRole === 'organization') {
        debug.auth('Fetching organization data...');
        
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', userId)
          .abortSignal(signal)
          .single();
        
        if (signal.aborted) return;
        
        if (orgError && orgError.code !== 'PGRST116') {
          debug.warn('Organization data fetch error:', orgError.message);
        }
        
        setOrganization(orgData || null);
        setRegularUser(null);
      } else if (userRole === 'regular') {
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Fetching regular user data...');
        }
        
        const { data: userData, error: userError } = await supabase
          .from('regular_users')
          .select('*')
          .eq('user_id', userId)
          .abortSignal(signal)
          .single();
        
        if (signal.aborted) return;
        
        if (userError && userError.code !== 'PGRST116') {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Regular user data fetch error:', userError.message);
          }
        }
        
        setRegularUser(userData || null);
        setOrganization(null);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Basic user without additional profile');
        }
        setOrganization(null);
        setRegularUser(null);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ fetchUserData completed successfully');
      }
      
    } catch (error: unknown) {
      if (signal.aborted) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 Request was aborted');
        }
        return;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error fetching user data:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      setError('Failed to load user data');
      setOrganization(null);
      setRegularUser(null);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        isFetchingRef.current = false;
        abortControllerRef.current = null;
      }
    }
  }, []);

  // Debounced version to prevent rapid successive calls
  const debouncedFetchUserData = useCallback(
    debounce((userId: string) => fetchUserData(userId), 300),
    [fetchUserData]
  );

  useEffect(() => {
    let isMounted = true;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 AuthProvider useEffect started');
    }
    
    const initializeAuth = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Getting initial user session...');
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Session error:', error.message);
          }
          throw error;
        }
        
        if (!isMounted) return;
        
        const user = session?.user || null;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('👤 Initial user:', user ? `${user.id.substring(0, 8)}...` : 'null');
        }
        
        setUser(user);
        
        if (user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Fetching user data for initial user...');
          }
          await debouncedFetchUserData(user.id);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('👤 No initial user, setting loading to false');
          }
          setLoading(false);
        }
      } catch (error: unknown) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Error getting user:', error instanceof Error ? error.message : 'Unknown error');
        }
        if (isMounted) {
          setError('Failed to load user');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    if (process.env.NODE_ENV === 'development') {
      console.log('👂 Setting up auth state change listener...');
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Auth state change:', event, session?.user ? `${session.user.id.substring(0, 8)}...` : 'null');
        }
        
        // Skip initial session to avoid duplicate data fetching
        if (event === 'INITIAL_SESSION') {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Skipping INITIAL_SESSION');
          }
          return;
        }
        
        setUser(session?.user ?? null);
        
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Fetching user data after auth state change...');
          }
          debouncedFetchUserData(session.user.id);
        } else if (!session?.user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('👤 No session user, clearing user data...');
          }
          resetAuthState();
        }
      }
    );

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Cleaning up AuthProvider useEffect');
      }
      isMounted = false;
      subscription.unsubscribe();
      debouncedFetchUserData.cancel();
      resetAuthState();
    };
  }, [debouncedFetchUserData, resetAuthState]);

  const retry = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Retry function called');
    }
    if (user) {
      setLoading(true);
      setError(null);
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  const signOut = useCallback(async () => {
    debug.auth('Sign out function called');
    
    try {
      debouncedFetchUserData.cancel();
      
      // Use the safer sign out method
      const result = await signOutSafely();
      
      if (result.error) {
        debug.warn('Sign out completed with warnings:', result.error);
      } else {
        debug.success('Sign out completed successfully');
      }
      
    } catch (error) {
      debug.error('Sign out error:', error instanceof Error ? error.message : 'Unknown error');
      // Continue to clear local state even if there was an error
    } finally {
      // Always clear local state regardless of server response
      resetAuthState();
    }
  }, [debouncedFetchUserData, resetAuthState]);

  const value = {
    user,
    organization,
    regularUser,
    loading,
    error,
    signOut,
    retry,
    resetAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 