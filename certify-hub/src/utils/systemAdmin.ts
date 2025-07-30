import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export interface SystemAdmin {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
  email?: string;
  user_name?: string;
}

export interface SystemAdminInfo {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
  email: string;
  user_name: string;
  user_created_at: string;
}

/**
 * 检查用户是否是系统管理员
 */
export const isSystemAdmin = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { data, error } = await supabase
      .rpc('is_system_admin', { p_user_id: user.id });
    
    if (error) {
      console.error('Error checking system admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error checking system admin status:', error);
    return false;
  }
};

/**
 * 检查用户是否是超级管理员
 */
export const isSuperAdmin = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { data, error } = await supabase
      .rpc('is_super_admin', { p_user_id: user.id });
    
    if (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
};

/**
 * 检查用户是否是管理员或超级管理员
 */
export const isAdminOrSuper = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { data, error } = await supabase
      .rpc('is_admin_or_super', { p_user_id: user.id });
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * 获取用户的系统管理员角色
 */
export const getSystemAdminRole = async (user: User | null): Promise<string | null> => {
  if (!user) return null;
  
  try {
    const { data, error } = await supabase
      .rpc('get_system_admin_role', { p_user_id: user.id });
    
    if (error) {
      console.error('Error getting system admin role:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting system admin role:', error);
    return null;
  }
};

/**
 * 检查用户是否有特定权限
 */
export const hasSystemPermission = async (
  user: User | null, 
  permission: string
): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { data, error } = await supabase
      .rpc('has_system_permission', { 
        p_user_id: user.id, 
        p_permission: permission 
      });
    
    if (error) {
      console.error('Error checking system permission:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error checking system permission:', error);
    return false;
  }
};

/**
 * 获取所有系统管理员信息
 */
export const getAllSystemAdmins = async (): Promise<SystemAdminInfo[]> => {
  try {
    const { data, error } = await supabase
      .from('system_admin_info')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching system admins:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching system admins:', error);
    return [];
  }
};

/**
 * 添加系统管理员
 */
export const addSystemAdmin = async (
  userId: string,
  role: 'super_admin' | 'admin' | 'moderator',
  permissions: Record<string, boolean> = {}
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .rpc('add_system_admin', {
        p_user_id: userId,
        p_role: role,
        p_permissions: permissions
      });
    
    if (error) {
      console.error('Error adding system admin:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error adding system admin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * 移除系统管理员
 */
export const removeSystemAdmin = async (
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .rpc('remove_system_admin', { p_user_id: userId });
    
    if (error) {
      console.error('Error removing system admin:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error removing system admin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * 获取用户的完整系统管理员信息
 */
export const getSystemAdminInfo = async (user: User | null): Promise<SystemAdmin | null> => {
  if (!user) return null;
  
  try {
    const { data, error } = await supabase
      .from('system_admins')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user is not a system admin
        return null;
      }
      console.error('Error fetching system admin info:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching system admin info:', error);
    return null;
  }
};

/**
 * 权限常量
 */
export const SYSTEM_PERMISSIONS = {
  MANAGE_ORGANIZATIONS: 'manage_organizations',
  MANAGE_USERS: 'manage_users',
  MANAGE_SYSTEM_ADMINS: 'manage_system_admins',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_TEMPLATES: 'manage_templates',
  MANAGE_CERTIFICATES: 'manage_certificates',
  VIEW_LOGS: 'view_logs',
  SYSTEM_SETTINGS: 'system_settings'
} as const;

export type SystemPermission = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS]; 