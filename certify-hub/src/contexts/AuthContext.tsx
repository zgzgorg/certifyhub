'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Organization, RegularUser } from '../types/user';

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
    console.log('🔄 Resetting auth state...');
    
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
      console.log('⚠️ fetchUserData already in progress, skipping...');
      return;
    }
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    console.log(`🔍 Starting fetchUserData for user: ${userId}`);
    
    isFetchingRef.current = true;
    
    try {
      setError(null);
      
      // Check if request was aborted
      if (signal.aborted) return;
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw sessionError;
      }
      
      if (!session?.user) {
        console.warn('⚠️ No active session found');
        setOrganization(null);
        setRegularUser(null);
        return;
      }
      
      // Verify user ID matches
      if (session.user.id !== userId) {
        console.warn('⚠️ Session user ID mismatch');
        return;
      }
      
      if (signal.aborted) return;
      
      const user = session.user;
      const userRole = user?.user_metadata?.role;
      console.log(`👤 User role: ${userRole}`);

      // Fetch additional user data based on role
      if (userRole === 'organization') {
        console.log('🏢 Fetching organization data...');
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', userId)
          .abortSignal(signal)
          .single();
        
        if (signal.aborted) return;
        
        if (orgError && orgError.code !== 'PGRST116') {
          console.warn('⚠️ Organization data fetch error:', orgError);
        }
        
        setOrganization(orgData || null);
        setRegularUser(null);
      } else if (userRole === 'regular') {
        console.log('👤 Fetching regular user data...');
        const { data: userData, error: userError } = await supabase
          .from('regular_users')
          .select('*')
          .eq('user_id', userId)
          .abortSignal(signal)
          .single();
        
        if (signal.aborted) return;
        
        if (userError && userError.code !== 'PGRST116') {
          console.warn('⚠️ Regular user data fetch error:', userError);
        }
        
        setRegularUser(userData || null);
        setOrganization(null);
      } else {
        console.log('👤 Basic user without additional profile');
        setOrganization(null);
        setRegularUser(null);
      }
      
      console.log('✅ fetchUserData completed successfully');
      
    } catch (error: unknown) {
      if (signal.aborted) {
        console.log('🚫 Request was aborted');
        return;
      }
      
      console.error('❌ Error fetching user data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load user data: ${errorMessage}`);
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
    
    console.log('🚀 AuthProvider useEffect started');
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Getting initial user session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          throw error;
        }
        
        if (!isMounted) return;
        
        const user = session?.user || null;
        console.log('👤 Initial user:', user ? user.id : 'null');
        setUser(user);
        
        if (user) {
          console.log('🔄 Fetching user data for initial user...');
          await debouncedFetchUserData(user.id);
        } else {
          console.log('👤 No initial user, setting loading to false');
          setLoading(false);
        }
      } catch (error: unknown) {
        console.error('❌ Error getting user:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to load user');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    console.log('👂 Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('🔄 Auth state change:', event, session?.user?.id);
        
        // Skip initial session to avoid duplicate data fetching
        if (event === 'INITIAL_SESSION') {
          console.log('⚠️ Skipping INITIAL_SESSION');
          return;
        }
        
        setUser(session?.user ?? null);
        
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          console.log('🔄 Fetching user data after auth state change...');
          debouncedFetchUserData(session.user.id);
        } else if (!session?.user) {
          console.log('👤 No session user, clearing user data...');
          resetAuthState();
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up AuthProvider useEffect');
      isMounted = false;
      subscription.unsubscribe();
      debouncedFetchUserData.cancel();
      resetAuthState();
    };
  }, [debouncedFetchUserData, resetAuthState]);

  const retry = useCallback(async () => {
    console.log('🔄 Retry function called');
    if (user) {
      setLoading(true);
      setError(null);
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  const signOut = useCallback(async () => {
    console.log('🚪 Sign out function called');
    try {
      debouncedFetchUserData.cancel();
      await supabase.auth.signOut();
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
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