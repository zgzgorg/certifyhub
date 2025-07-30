-- ===================================================================
-- CertifyHub Complete Database Setup
-- ===================================================================
-- Consolidated database management script for CertifyHub
-- Run sections as needed in your Supabase SQL Editor
-- ===================================================================

-- ===================================================================
-- SECTION 1: ORGANIZATION SYSTEM SETUP
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

-- Add columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at 
  BEFORE UPDATE ON organization_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- SECTION 2: SYSTEM ADMIN SETUP
-- ===================================================================

-- Create system_admins table
CREATE TABLE IF NOT EXISTS system_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System admin functions
CREATE OR REPLACE FUNCTION is_system_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM system_admins WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM system_admins WHERE user_id = p_user_id AND role = 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_super(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM system_admins WHERE user_id = p_user_id AND role IN ('admin', 'super_admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_system_admin_role(p_user_id UUID)
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN (SELECT role FROM system_admins WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_system_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_perms JSONB;
BEGIN
  SELECT permissions INTO admin_perms FROM system_admins WHERE user_id = p_user_id;
  IF admin_perms IS NULL THEN RETURN FALSE; END IF;
  RETURN COALESCE((admin_perms->>p_permission)::BOOLEAN, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- System admin view
CREATE OR REPLACE VIEW system_admin_info AS
SELECT 
  sa.id, sa.user_id, sa.role, sa.permissions, sa.created_at, sa.updated_at,
  u.email, COALESCE(u.raw_user_meta_data->>'name', u.email) as user_name,
  u.created_at as user_created_at
FROM system_admins sa
JOIN auth.users u ON sa.user_id = u.id;

-- ===================================================================
-- SECTION 3: DATA MIGRATION
-- ===================================================================

-- Migrate existing organizations
UPDATE organizations SET owner_id = user_id WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- Create owner relationships
INSERT INTO organization_members (organization_id, user_id, role)
SELECT id, owner_id, 'owner' FROM organizations WHERE owner_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role)
SELECT id, user_id, 'owner' FROM organizations WHERE user_id IS NOT NULL AND owner_id IS NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ===================================================================
-- SECTION 4: RLS POLICIES
-- ===================================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "allow_authenticated_organizations" ON organizations;
DROP POLICY IF EXISTS "allow_authenticated_organization_members" ON organization_members;
DROP POLICY IF EXISTS "temp_allow_all_system_admins" ON system_admins;

-- Create working policies
CREATE POLICY "allow_authenticated_organizations" ON organizations
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_organization_members" ON organization_members
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_system_admins" ON system_admins
FOR ALL USING (auth.uid() IS NOT NULL);

-- ===================================================================
-- COMPLETION
-- ===================================================================

SELECT 'Database setup completed successfully!' as result;
SELECT 'Tables created: organizations, organization_members, system_admins' as info;
SELECT 'Functions created: is_system_admin, is_super_admin, is_admin_or_super, get_system_admin_role, has_system_permission' as functions;
SELECT 'Policies applied: Authenticated user access for all tables' as policies;