-- ===================================================================
-- CertifyHub System Administrator Setup (Fixed Version)
-- ===================================================================
-- This file sets up the system administrator functionality
-- Fixed version that resolves parameter default value issues
-- Run this in your Supabase SQL Editor
-- ===================================================================

-- ===================================================================
-- 1. 创建系统管理员表
-- ===================================================================

-- 创建系统管理员表
CREATE TABLE IF NOT EXISTS system_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
  permissions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_admins_user_id ON system_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_system_admins_role ON system_admins(role);

-- 启用RLS
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 2. 创建RLS策略
-- ===================================================================

-- 只有超级管理员可以查看所有系统管理员
CREATE POLICY "Super admins can view all system admins" ON system_admins
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 只有超级管理员可以管理其他系统管理员
CREATE POLICY "Super admins can manage system admins" ON system_admins
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 系统管理员可以查看自己的记录
CREATE POLICY "System admins can view own record" ON system_admins
FOR SELECT USING (user_id = auth.uid());

-- ===================================================================
-- 3. 创建辅助函数
-- ===================================================================

-- 检查用户是否是系统管理员
CREATE OR REPLACE FUNCTION is_system_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否是超级管理员
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否是管理员或超级管理员
CREATE OR REPLACE FUNCTION is_admin_or_super(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户的系统管理员角色
CREATE OR REPLACE FUNCTION get_system_admin_role(p_user_id UUID DEFAULT auth.uid())
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN (
    SELECT role FROM system_admins 
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 4. 更新现有表的RLS策略以支持系统管理员
-- ===================================================================

-- 更新organizations表的策略，允许系统管理员查看所有组织
DROP POLICY IF EXISTS "temp_allow_all_organizations" ON organizations;

CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT USING (
  owner_id = auth.uid() 
  OR user_id = auth.uid() -- 兼容旧系统
  OR id IN (SELECT DISTINCT organization_id FROM organization_members WHERE user_id = auth.uid())
  OR is_system_admin() -- 系统管理员可以查看所有组织
);

-- 系统管理员可以管理所有组织
CREATE POLICY "System admins can manage all organizations" ON organizations
FOR ALL USING (is_system_admin());

-- 更新organization_members表的策略
DROP POLICY IF EXISTS "temp_allow_all_organization_members" ON organization_members;

CREATE POLICY "Users can view their memberships" ON organization_members
FOR SELECT USING (
  user_id = auth.uid()
  OR organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid() OR user_id = auth.uid()
  )
  OR is_system_admin() -- 系统管理员可以查看所有成员关系
);

-- 系统管理员可以管理所有成员关系
CREATE POLICY "System admins can manage all memberships" ON organization_members
FOR ALL USING (is_system_admin());

-- ===================================================================
-- 5. 创建系统管理员权限检查函数
-- ===================================================================

-- 检查用户是否有特定权限
CREATE OR REPLACE FUNCTION has_system_permission(
  p_user_id UUID DEFAULT auth.uid(),
  p_permission VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_role VARCHAR(20);
  admin_permissions JSONB;
BEGIN
  -- 如果没有提供权限参数，返回false
  IF p_permission IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 获取系统管理员角色和权限
  SELECT role, permissions INTO admin_role, admin_permissions
  FROM system_admins 
  WHERE user_id = p_user_id;
  
  -- 超级管理员拥有所有权限
  IF admin_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- 检查特定权限
  IF admin_permissions IS NOT NULL AND admin_permissions ? p_permission THEN
    RETURN (admin_permissions->>p_permission)::BOOLEAN;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 6. 创建系统管理员管理函数
-- ===================================================================

-- 添加系统管理员（只有超级管理员可以执行）
CREATE OR REPLACE FUNCTION add_system_admin(
  p_user_id UUID,
  p_role VARCHAR(20) DEFAULT 'admin',
  p_permissions JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 检查当前用户是否是超级管理员
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can add system admins';
  END IF;
  
  -- 检查用户是否存在
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  -- 插入系统管理员记录
  INSERT INTO system_admins (user_id, role, permissions, created_by)
  VALUES (p_user_id, p_role, p_permissions, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 移除系统管理员（只有超级管理员可以执行）
CREATE OR REPLACE FUNCTION remove_system_admin(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- 检查当前用户是否是超级管理员
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can remove system admins';
  END IF;
  
  -- 如果没有提供用户ID，返回false
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 不能移除自己
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;
  
  -- 删除系统管理员记录
  DELETE FROM system_admins WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 7. 创建系统管理员视图
-- ===================================================================

-- 创建系统管理员信息视图
CREATE OR REPLACE VIEW system_admin_info AS
SELECT 
  sa.id,
  sa.user_id,
  sa.role,
  sa.permissions,
  sa.created_at,
  sa.updated_at,
  au.email,
  au.raw_user_meta_data->>'name' as user_name,
  au.created_at as user_created_at
FROM system_admins sa
JOIN auth.users au ON sa.user_id = au.id;

-- ===================================================================
-- 8. 使用示例
-- ===================================================================

-- 检查当前用户是否是系统管理员
-- SELECT is_system_admin();

-- 检查当前用户是否是超级管理员
-- SELECT is_super_admin();

-- 获取当前用户的系统管理员角色
-- SELECT get_system_admin_role();

-- 检查特定权限
-- SELECT has_system_permission(auth.uid(), 'manage_organizations');

-- 查看所有系统管理员
-- SELECT * FROM system_admin_info;

-- ===================================================================
-- 9. 创建初始超级管理员（手动执行）
-- ===================================================================

-- 注意：请将 'your-admin-user-id' 替换为实际的用户ID
-- INSERT INTO system_admins (user_id, role, created_by) 
-- VALUES ('your-admin-user-id', 'super_admin', 'your-admin-user-id'); 