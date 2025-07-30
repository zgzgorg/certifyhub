-- ===================================================================
-- CertifyHub Database Management Script
-- ===================================================================
-- This file contains all database setup, migration, and maintenance
-- operations for the CertifyHub organization member system.
--
-- Run sections as needed in your Supabase SQL Editor
-- ===================================================================

-- ===================================================================
-- SECTION 1: INITIAL SETUP - Organization Members System
-- ===================================================================

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Add owner_id column to organizations table (if not exists)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create update trigger for organization_members
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at 
  BEFORE UPDATE ON organization_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- SECTION 2: DATA MIGRATION
-- ===================================================================

-- Migrate existing organizations to use owner_id (if they use user_id)
UPDATE organizations 
SET owner_id = user_id 
WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- Create owner relationships in organization_members table
INSERT INTO organization_members (organization_id, user_id, role)
SELECT id, owner_id, 'owner' 
FROM organizations 
WHERE owner_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Also create for legacy user_id field
INSERT INTO organization_members (organization_id, user_id, role)
SELECT id, user_id, 'owner' 
FROM organizations 
WHERE user_id IS NOT NULL AND owner_id IS NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ===================================================================
-- SECTION 3: RLS POLICIES - DEVELOPMENT (PERMISSIVE)
-- ===================================================================

-- Drop any existing problematic policies first
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can manage their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view organization details" ON organizations;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Members can view org members via organizations" ON organization_members;
DROP POLICY IF EXISTS "Admins can update organization details" ON organizations;
DROP POLICY IF EXISTS "Enable all operations for organizations" ON organizations;
DROP POLICY IF EXISTS "Enable all operations for regular users" ON regular_users;

-- Apply permissive policies for development
CREATE POLICY "temp_allow_all_organizations" ON organizations
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "temp_allow_all_organization_members" ON organization_members
FOR ALL USING (auth.uid() IS NOT NULL);

-- ===================================================================
-- SECTION 4: RLS POLICIES - PRODUCTION (SECURE)
-- ===================================================================
-- Uncomment and use these policies for production deployment
-- Make sure to drop the temporary policies above first

/*
-- Drop temporary policies
DROP POLICY IF EXISTS "temp_allow_all_organizations" ON organizations;
DROP POLICY IF EXISTS "temp_allow_all_organization_members" ON organization_members;

-- Organizations policies
CREATE POLICY "users_can_view_their_organizations" ON organizations
FOR SELECT USING (
  owner_id = auth.uid() 
  OR user_id = auth.uid() -- Legacy support
  OR id IN (SELECT DISTINCT organization_id FROM organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "owners_can_manage_organizations" ON organizations
FOR ALL USING (
  owner_id = auth.uid() 
  OR user_id = auth.uid() -- Legacy support
);

-- Organization members policies
CREATE POLICY "users_can_view_own_memberships" ON organization_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_view_org_members" ON organization_members
FOR SELECT USING (
  organization_id IN (
    SELECT DISTINCT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "owners_and_admins_can_manage_members" ON organization_members
FOR ALL USING (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid() OR user_id = auth.uid()
  )
  OR
  organization_id IN (
    SELECT DISTINCT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);
*/

-- ===================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ===================================================================

-- Get user role in organization
CREATE OR REPLACE FUNCTION get_user_role_in_organization(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS VARCHAR(20) AS $$
BEGIN
  -- Check if user owns the organization (new system)
  IF EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND owner_id = p_user_id) THEN
    RETURN 'owner';
  END IF;
  
  -- Check if user owns the organization (legacy system)
  IF EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND user_id = p_user_id) THEN
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
-- SECTION 6: MAINTENANCE QUERIES
-- ===================================================================

-- Check organization members data
-- SELECT 
--   o.name as organization_name,
--   om.role,
--   u.email as user_email
-- FROM organizations o
-- JOIN organization_members om ON o.id = om.organization_id
-- JOIN auth.users u ON om.user_id = u.id
-- ORDER BY o.name, om.role;

-- Check organizations without owners
-- SELECT 
--   id,
--   name,
--   owner_id,
--   user_id
-- FROM organizations 
-- WHERE owner_id IS NULL AND user_id IS NULL;

-- Test helper functions (replace with actual IDs)
-- SELECT get_user_role_in_organization('your-user-id', 'your-org-id');
-- SELECT is_organization_owner('your-user-id', 'your-org-id');
-- SELECT is_organization_admin('your-user-id', 'your-org-id');

-- ===================================================================
-- SECTION 7: TROUBLESHOOTING
-- ===================================================================

-- Fix infinite recursion in RLS policies
-- If you encounter "infinite recursion detected in policy" errors:

-- 1. Drop all problematic policies
/*
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can manage their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can view organization details" ON organizations;
*/

-- 2. Apply emergency fix (temporary permissive policies)
/*
CREATE POLICY "emergency_allow_all_organizations" ON organizations
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "emergency_allow_all_organization_members" ON organization_members
FOR ALL USING (auth.uid() IS NOT NULL);
*/

-- Check current policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('organizations', 'organization_members')
-- ORDER BY tablename, policyname;

-- ===================================================================
-- SECTION 8: CLEANUP (Use with caution)
-- ===================================================================

-- Remove old regular_users table if it exists
-- DROP TABLE IF EXISTS regular_users CASCADE;

-- Reset all policies (DANGEROUS - only for development)
-- DROP POLICY IF EXISTS "temp_allow_all_organizations" ON organizations;
-- DROP POLICY IF EXISTS "temp_allow_all_organization_members" ON organization_members;

-- ===================================================================
-- END OF FILE
-- ===================================================================