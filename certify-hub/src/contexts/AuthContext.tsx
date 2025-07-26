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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [regularUser, setRegularUser] = useState<RegularUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const fetchUserData = useCallback(async (userId: string, retryCount = 0): Promise<void> => {
    try {
      setError(null);
      
      // 获取用户元数据
      const { data: { user } } = await supabase.auth.getUser();
      const userRole = user?.user_metadata?.role;

      if (userRole === 'organization') {
        try {
          // 获取机构信息
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (orgError && orgError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.warn('Organization data fetch error:', orgError);
            // Don't throw error, just set to null and continue
          }
          
          setOrganization(orgData || null);
          setRegularUser(null);
        } catch (orgFetchError) {
          console.warn('Failed to fetch organization data:', orgFetchError);
          setOrganization(null);
          setRegularUser(null);
        }
      } else if (userRole === 'regular') {
        try {
          // 获取普通用户信息
          const { data: userData, error: userError } = await supabase
            .from('regular_users')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (userError && userError.code !== 'PGRST116') {
            console.warn('Regular user data fetch error:', userError);
            // Don't throw error, just set to null and continue
          }
          
          setRegularUser(userData || null);
          setOrganization(null);
        } catch (userFetchError) {
          console.warn('Failed to fetch regular user data:', userFetchError);
          setRegularUser(null);
          setOrganization(null);
        }
      } else {
        // User has no specific role or basic user - this is okay
        setOrganization(null);
        setRegularUser(null);
      }
      
      retryCountRef.current = 0; // Reset retry count on success
      
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      
      // Only retry on network/timeout errors, not on auth or schema errors
      const isRetryableError = error.message?.includes('timeout') || 
                              error.message?.includes('network') ||
                              error.message?.includes('fetch') ||
                              error.message?.includes('abort') ||
                              error.status === 0; // Network error
      
      if (retryCount < MAX_RETRIES && isRetryableError) {
        console.log(`Retrying user data fetch (${retryCount + 1}/${MAX_RETRIES})...`);
        retryCountRef.current = retryCount + 1;
        // Exponential backoff
        setTimeout(() => {
          fetchUserData(userId, retryCount + 1);
        }, Math.pow(2, retryCount) * 1000);
      } else {
        // For non-retryable errors or max retries reached, still allow basic auth to work
        console.warn('Cannot fetch additional user data, continuing with basic auth:', error.message);
        setOrganization(null);
        setRegularUser(null);
        // Don't set error state for these cases - user can still use basic features
      }
    }
  }, [MAX_RETRIES]);

  useEffect(() => {
    let isMounted = true;
    
    // 获取初始用户状态
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        if (!isMounted) return;
        
        setUser(user);
        
        if (user) {
          await fetchUserData(user.id);
        }
      } catch (error: any) {
        console.error('Error getting user:', error);
        if (isMounted) {
          setError(error.message || 'Failed to load user');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getUser();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        setUser(session?.user ?? null);
        
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          // Don't refetch on token refresh to avoid unnecessary DB calls
          await fetchUserData(session.user.id);
        } else if (!session?.user) {
          setOrganization(null);
          setRegularUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchUserData]);

  const retry = useCallback(async () => {
    if (user) {
      setLoading(true);
      setError(null);
      await fetchUserData(user.id);
      setLoading(false);
    }
  }, [user, fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    setRegularUser(null);
  };

  const value = {
    user,
    organization,
    regularUser,
    loading,
    error,
    signOut,
    retry
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