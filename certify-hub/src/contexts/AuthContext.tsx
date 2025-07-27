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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [regularUser, setRegularUser] = useState<RegularUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  
  // 防重复调用和竞态条件控制
  const isFetchingRef = useRef(false);
  const lastFetchUserIdRef = useRef<string | null>(null);
  const lastFetchTimestampRef = useRef<number>(0);
  const authStateChangeRef = useRef<string | null>(null);

  // 重置认证状态的函数
  const resetAuthState = useCallback(() => {
    console.log('🔄 Resetting auth state...');
    setUser(null);
    setOrganization(null);
    setRegularUser(null);
    setLoading(false);
    setError(null);
    retryCountRef.current = 0;
    isFetchingRef.current = false;
    lastFetchUserIdRef.current = null;
    lastFetchTimestampRef.current = 0;
    authStateChangeRef.current = null;
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
  }, []);

  // 策略1: 链式处理，确保操作按顺序执行
  const fetchUserData = useCallback(async (userId: string, retryCount = 0): Promise<void> => {
    // 防重复调用检查
    const now = Date.now();
    if (isFetchingRef.current) {
      console.log('⚠️ fetchUserData already in progress, skipping...');
      return;
    }
    
    // 如果同一个用户ID在1秒内被重复调用，跳过（减少时间窗口）
    if (lastFetchUserIdRef.current === userId && (now - lastFetchTimestampRef.current) < 1000) {
      console.log('⚠️ fetchUserData called too frequently for same user, skipping...');
      return;
    }
    
    console.log(`🔍 Starting fetchUserData for user: ${userId}, retry: ${retryCount}`);
    
    // 设置防重复调用标志
    isFetchingRef.current = true;
    lastFetchUserIdRef.current = userId;
    lastFetchTimestampRef.current = now;
    
    try {
      setError(null);
      
      // 策略4: 使用Session对象而非重新请求
      console.log('📋 Getting current session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw sessionError;
      }
      
      if (!session?.user) {
        console.warn('⚠️ No active session found, skipping user data fetch');
        setOrganization(null);
        setRegularUser(null);
        setLoading(false);
        return;
      }
      
      // 验证用户ID匹配
      if (session.user.id !== userId) {
        console.warn('⚠️ Session user ID mismatch, skipping user data fetch');
        setLoading(false);
        return;
      }
      
      const user = session.user;
      const userRole = user?.user_metadata?.role;
      console.log(`👤 User role from metadata: ${userRole}`);

      // 策略1: 链式处理，按顺序获取数据
      if (userRole === 'organization') {
        console.log('🏢 Fetching organization data...');
        try {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (orgError && orgError.code !== 'PGRST116') {
            console.warn('⚠️ Organization data fetch error:', orgError);
          }
          
          console.log('✅ Organization data fetched:', orgData);
          setOrganization(orgData || null);
          setRegularUser(null);
        } catch (orgFetchError) {
          console.warn('⚠️ Failed to fetch organization data:', orgFetchError);
          setOrganization(null);
          setRegularUser(null);
        }
      } else if (userRole === 'regular') {
        console.log('👤 Fetching regular user data...');
        try {
          const { data: userData, error: userError } = await supabase
            .from('regular_users')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (userError && userError.code !== 'PGRST116') {
            console.warn('⚠️ Regular user data fetch error:', userError);
          }
          
          console.log('✅ Regular user data fetched:', userData);
          setRegularUser(userData || null);
          setOrganization(null);
        } catch (userFetchError) {
          console.warn('⚠️ Failed to fetch regular user data:', userFetchError);
          setRegularUser(null);
          setOrganization(null);
        }
      } else {
        console.log('👤 User has no specific role or basic user - this is okay');
        setOrganization(null);
        setRegularUser(null);
      }
      
      retryCountRef.current = 0;
      console.log('✅ fetchUserData completed successfully');
      
    } catch (error: unknown) {
      console.error('❌ Error fetching user data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const isRetryableError = errorMessage.includes('timeout') || 
                              errorMessage.includes('network') ||
                              errorMessage.includes('fetch') ||
                              errorMessage.includes('abort') ||
                              (error as { status?: number })?.status === 0;
      
      if (retryCount < MAX_RETRIES && isRetryableError) {
        console.log(`🔄 Retrying user data fetch (${retryCount + 1}/${MAX_RETRIES})...`);
        retryCountRef.current = retryCount + 1;
        // 策略3: 适当延时，使用指数退避
        setTimeout(() => {
          fetchUserData(userId, retryCount + 1);
        }, Math.pow(2, retryCount) * 1000);
      } else {
        console.warn('⚠️ Cannot fetch additional user data, continuing with basic auth:', errorMessage);
        setOrganization(null);
        setRegularUser(null);
      }
    } finally {
      console.log('🏁 fetchUserData finally block - setting loading to false');
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [MAX_RETRIES]);

  useEffect(() => {
    let isMounted = true;
    
    console.log('🚀 AuthProvider useEffect started');
    
    // 策略1: 链式处理初始状态
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
          await fetchUserData(user.id);
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

    // 策略2: 监听Auth状态变化，避免重复处理
    console.log('👂 Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('🔄 Auth state change:', event, session?.user?.id);
        
        // 避免重复处理相同的事件
        if (authStateChangeRef.current === event) {
          console.log('⚠️ Duplicate auth state change event, skipping...');
          return;
        }
        
        authStateChangeRef.current = event;
        
        // 避免在INITIAL_SESSION时重复获取用户数据
        if (event === 'INITIAL_SESSION') {
          console.log('⚠️ Skipping INITIAL_SESSION as it should be handled by initial session check');
          setLoading(false);
          return;
        }
        
        setUser(session?.user ?? null);
        
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          console.log('🔄 Fetching user data after auth state change...');
          await fetchUserData(session.user.id);
        } else if (!session?.user) {
          console.log('👤 No session user, clearing user data...');
          setOrganization(null);
          setRegularUser(null);
          setLoading(false);
        }
        
        // 清除事件记录，允许下次相同事件
        setTimeout(() => {
          authStateChangeRef.current = null;
        }, 1000);
      }
    );

    return () => {
      console.log('🧹 Cleaning up AuthProvider useEffect');
      isMounted = false;
      subscription.unsubscribe();
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchUserData]); // 移除user依赖项，避免无限循环

  const retry = useCallback(async () => {
    console.log('🔄 Retry function called');
    if (user) {
      setLoading(true);
      setError(null);
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  const signOut = async () => {
    console.log('🚪 Sign out function called');
    try {
      await supabase.auth.signOut();
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      setUser(null);
      setOrganization(null);
      setRegularUser(null);
      setLoading(false);
      // 重置所有状态
      isFetchingRef.current = false;
      lastFetchUserIdRef.current = null;
      lastFetchTimestampRef.current = 0;
      authStateChangeRef.current = null;
    }
  };

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