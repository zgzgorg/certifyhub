'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Organization, RegularUser } from '../types/user';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  regularUser: RegularUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [regularUser, setRegularUser] = useState<RegularUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取初始用户状态
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await fetchUserData(user.id);
      }
      
      setLoading(false);
    };

    getUser();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setOrganization(null);
          setRegularUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // 获取用户元数据
      const { data: { user } } = await supabase.auth.getUser();
      const userRole = user?.user_metadata?.role;

      if (userRole === 'organization') {
        // 获取机构信息
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        setOrganization(orgData);
        setRegularUser(null);
      } else if (userRole === 'regular') {
        // 获取普通用户信息
        const { data: userData } = await supabase
          .from('regular_users')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        setRegularUser(userData);
        setOrganization(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

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
    signOut
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