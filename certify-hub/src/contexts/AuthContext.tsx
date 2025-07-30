'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signOutSafely } from '../lib/supabaseClient';
import { Organization, OrganizationMember } from '../types/user';
import { debug } from '../utils/debug';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  organizationMembers: OrganizationMember[];
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
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Simplified refs for race condition prevention
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedFetchUserDataRef = useRef<((userId: string) => void) & { cancel: () => void } | null>(null);

  const resetAuthState = useCallback(() => {
    debug.auth('Resetting auth state...');
    
    // Cancel any ongoing fetch operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setUser(null);
    setOrganization(null);
    setOrganizationMembers([]);
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
        setOrganizationMembers([]);
        return;
      }
      
      // Verify user ID matches
      if (session.user.id !== userId) {
        debug.warn('Session user ID mismatch');
        return;
      }
      
      if (signal.aborted) return;
      
      const user = session.user;
      
      debug.auth(`User authenticated: ${user.id.substring(0, 8)}...`);

      // Fetch user's organization memberships
      debug.auth('Fetching organization memberships...');
      
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select(`
          *,
          organizations (*)
        `)
        .eq('user_id', userId)
        .abortSignal(signal);
      
      if (signal.aborted) return;
      
      if (membershipsError) {
        debug.warn('Organization memberships fetch error:', membershipsError.message);
      }
      
      // Also fetch organizations owned by this user
      const { data: ownedOrgs, error: ownedOrgsError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', userId)
        .abortSignal(signal);
        
      if (signal.aborted) return;
      
      if (ownedOrgsError) {
        debug.warn('Owned organizations fetch error:', ownedOrgsError.message);
      }
      
      setOrganizationMembers(memberships || []);
      
      // Set primary organization (first owned org, or first membership org, or null)
      const primaryOrg = ownedOrgs?.[0] || memberships?.[0]?.organizations || null;
      setOrganization(primaryOrg);
      
      debug.auth(`Found ${memberships?.length || 0} organization memberships and ${ownedOrgs?.length || 0} owned organizations`);
      
    } catch (error: unknown) {
      if (signal.aborted) return;
      
      debug.error('fetchUserData error:', error instanceof Error ? error.message : 'Unknown error');
      setError('Failed to load user data');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const debouncedFetchUserData = debounce(fetchUserData, 300);
    debouncedFetchUserDataRef.current = debouncedFetchUserData;
    
    debug.auth('AuthProvider useEffect started');
    
    const initializeAuth = async () => {
      try {
        debug.auth('Getting initial user session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          debug.error('Session error:', error.message);
          throw error;
        }
        
        if (!isMounted) return;
        
        const user = session?.user || null;
        
        debug.auth(`Initial user: ${user ? `${user.id.substring(0, 8)}...` : 'null'}`);
        
        setUser(user);
        
        if (user) {
          debug.auth('Fetching user data for initial user...');
          await debouncedFetchUserData(user.id);
        } else {
          debug.auth('No initial user, setting loading to false');
          setLoading(false);
        }
      } catch (error: unknown) {
        debug.error('Error getting user:', error instanceof Error ? error.message : 'Unknown error');
        if (isMounted) {
          setError('Failed to load user');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    debug.auth('Setting up auth state change listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        debug.auth(`Auth state change: ${event}, ${session?.user ? `${session.user.id.substring(0, 8)}...` : 'null'}`);
        
        // Skip initial session to avoid duplicate data fetching
        if (event === 'INITIAL_SESSION') {
          debug.auth('Skipping INITIAL_SESSION');
          return;
        }
        
        setUser(session?.user ?? null);
        
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          debug.auth('Fetching user data after auth state change...');
          debouncedFetchUserData(session.user.id);
        } else if (!session?.user) {
          debug.auth('No session user, clearing user data...');
          // Clear state directly instead of calling resetAuthState
          setUser(null);
          setOrganization(null);
          setOrganizationMembers([]);
          setLoading(false);
          setError(null);
        }
      }
    );

    return () => {
      debug.auth('Cleaning up AuthProvider useEffect');
      isMounted = false;
      subscription.unsubscribe();
      debouncedFetchUserData.cancel();
      debouncedFetchUserDataRef.current = null;
      // Clear state directly instead of calling resetAuthState
      setUser(null);
      setOrganization(null);
      setOrganizationMembers([]);
      setLoading(false);
      setError(null);
    };
  }, [fetchUserData]);

  const retry = useCallback(async () => {
    debug.auth('Retry function called');
    if (user) {
      setLoading(true);
      setError(null);
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  const signOut = useCallback(async () => {
    debug.auth('Sign out function called');
    
    try {
      debouncedFetchUserDataRef.current?.cancel();
      
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
  }, []);

  const value = {
    user,
    organization,
    organizationMembers,
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