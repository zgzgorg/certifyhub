-- ===================================================================
-- CertifyHub Database Functions
-- ===================================================================
-- This file contains all helper functions for the CertifyHub database
-- Run this after 01-schema.sql
-- ===================================================================

-- ===================================================================
-- System Admin Functions
-- ===================================================================

-- Check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin or super admin
CREATE OR REPLACE FUNCTION is_admin_or_super(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's system admin role
CREATE OR REPLACE FUNCTION get_system_admin_role(p_user_id UUID DEFAULT auth.uid())
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN (
    SELECT role FROM system_admins 
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific system permission
CREATE OR REPLACE FUNCTION has_system_permission(
  p_user_id UUID DEFAULT auth.uid(),
  p_permission VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_role VARCHAR(20);
  admin_permissions JSONB;
BEGIN
  -- If no permission parameter provided, return false
  IF p_permission IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get system admin role and permissions
  SELECT role, permissions INTO admin_role, admin_permissions
  FROM system_admins 
  WHERE user_id = p_user_id;
  
  -- Super admin has all permissions
  IF admin_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission
  IF admin_permissions IS NOT NULL AND admin_permissions ? p_permission THEN
    RETURN (admin_permissions->>p_permission)::BOOLEAN;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add system admin (only super admins can execute)
CREATE OR REPLACE FUNCTION add_system_admin(
  p_user_id UUID,
  p_role VARCHAR(20) DEFAULT 'admin',
  p_permissions JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can add system admins';
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  -- Insert system admin record
  INSERT INTO system_admins (user_id, role, permissions, created_by)
  VALUES (p_user_id, p_role, p_permissions, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove system admin (only super admins can execute)
CREATE OR REPLACE FUNCTION remove_system_admin(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can remove system admins';
  END IF;
  
  -- If no user ID provided, return false
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Cannot remove yourself
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;
  
  -- Delete system admin record
  DELETE FROM system_admins WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- Organization Functions
-- ===================================================================

-- Get user role in organization
CREATE OR REPLACE FUNCTION get_user_role_in_organization(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS VARCHAR(20) AS $$
BEGIN
  -- Check if user owns the organization
  IF EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND owner_id = p_user_id) THEN
    RETURN 'owner';
  END IF;
  
  -- Check organization membership
  RETURN (
    SELECT role 
    FROM organization_members 
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is organization owner
CREATE OR REPLACE FUNCTION is_organization_owner(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role_in_organization(p_user_id, p_organization_id) = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is organization admin or owner
CREATE OR REPLACE FUNCTION is_organization_admin(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(20);
BEGIN
  user_role := get_user_role_in_organization(p_user_id, p_organization_id);
  RETURN user_role IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- Certificate Functions
-- ===================================================================

-- Get organization certificate count
CREATE OR REPLACE FUNCTION get_organization_certificate_count(org_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM certificates 
    WHERE publisher_id = org_id AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get certificate verification count
CREATE OR REPLACE FUNCTION get_certificate_verification_count(cert_key VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM certificate_verifications 
    WHERE certificate_key = cert_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- System Admin Views
-- ===================================================================

-- Create system admin info view
CREATE OR REPLACE VIEW system_admin_info AS
SELECT 
  sa.id,
  sa.user_id,
  sa.role,
  sa.permissions,
  sa.created_at,
  sa.updated_at,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email) as user_name,
  au.created_at as user_created_at
FROM system_admins sa
JOIN auth.users au ON sa.user_id = au.id;

-- ===================================================================
-- Completion
-- ===================================================================
SELECT 'Database functions created successfully!' as result;
SELECT 'Functions created: is_system_admin, is_super_admin, is_admin_or_super, get_system_admin_role, has_system_permission, add_system_admin, remove_system_admin, get_user_role_in_organization, is_organization_owner, is_organization_admin, get_organization_certificate_count, get_certificate_verification_count' as info; 