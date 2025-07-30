-- ===================================================================
-- CertifyHub Production Security Policies
-- ===================================================================
-- This file contains production-ready RLS policies for secure access control
-- Run this after 01-schema.sql, 02-functions.sql, and 03-storage.sql
-- WARNING: These policies are more restrictive than development policies
-- ===================================================================

-- ===================================================================
-- Drop Development Policies
-- ===================================================================

-- Drop simplified development policies
DROP POLICY IF EXISTS "allow_authenticated_organizations" ON organizations;
DROP POLICY IF EXISTS "allow_authenticated_organization_members" ON organization_members;
DROP POLICY IF EXISTS "allow_authenticated_system_admins" ON system_admins;
DROP POLICY IF EXISTS "allow_authenticated_templates" ON templates;
DROP POLICY IF EXISTS "allow_authenticated_template_metadata" ON template_metadata;
DROP POLICY IF EXISTS "allow_authenticated_certificates" ON certificates;
DROP POLICY IF EXISTS "allow_authenticated_certificate_verifications" ON certificate_verifications;

-- ===================================================================
-- Organizations Policies
-- ===================================================================

-- Users can view their own organizations
CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT USING (
  owner_id = auth.uid() 
  OR id IN (SELECT DISTINCT organization_id FROM organization_members WHERE user_id = auth.uid())
  OR is_system_admin() -- System admins can view all organizations
);

-- Organization owners can manage their organizations
CREATE POLICY "Owners can manage their organizations" ON organizations
FOR ALL USING (
  owner_id = auth.uid()
  OR is_system_admin() -- System admins can manage all organizations
);

-- ===================================================================
-- Organization Members Policies
-- ===================================================================

-- Users can view their own memberships
CREATE POLICY "Users can view their own memberships" ON organization_members
FOR SELECT USING (
  user_id = auth.uid()
  OR organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
  OR is_system_admin() -- System admins can view all memberships
);

-- Organization owners and admins can manage members
CREATE POLICY "Owners and admins can manage members" ON organization_members
FOR ALL USING (
  organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
  OR organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR is_system_admin() -- System admins can manage all memberships
);

-- ===================================================================
-- System Admins Policies
-- ===================================================================

-- Only super admins can view all system admins
CREATE POLICY "Super admins can view all system admins" ON system_admins
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Only super admins can manage system admins
CREATE POLICY "Super admins can manage system admins" ON system_admins
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- System admins can view their own record
CREATE POLICY "System admins can view own record" ON system_admins
FOR SELECT USING (user_id = auth.uid());

-- ===================================================================
-- Templates Policies
-- ===================================================================

-- Users can view their own templates
CREATE POLICY "Users can view their own templates" ON templates
FOR SELECT USING (
  user_id = auth.uid()
  OR is_public = true -- Public templates are viewable by everyone
  OR is_system_admin() -- System admins can view all templates
);

-- Users can create templates
CREATE POLICY "Users can create templates" ON templates
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR is_system_admin() -- System admins can create templates for any user
);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates" ON templates
FOR UPDATE USING (
  user_id = auth.uid()
  OR is_system_admin() -- System admins can update any template
);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates" ON templates
FOR DELETE USING (
  user_id = auth.uid()
  OR is_system_admin() -- System admins can delete any template
);

-- ===================================================================
-- Template Metadata Policies
-- ===================================================================

-- Allow public read access to default metadata for public templates
CREATE POLICY "Public can read default metadata for public templates" ON template_metadata
FOR SELECT USING (
  is_default = true AND
  EXISTS (
    SELECT 1 FROM templates 
    WHERE templates.id = template_metadata.template_id 
    AND templates.is_public = true
  )
);

-- Users can read their own metadata
CREATE POLICY "Users can read their own metadata" ON template_metadata
FOR SELECT USING (
  user_id = auth.uid()
  OR is_system_admin() -- System admins can read all metadata
);

-- Users can insert their own metadata
CREATE POLICY "Users can insert their own metadata" ON template_metadata
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR is_system_admin() -- System admins can insert metadata for any user
);

-- Users can update their own metadata
CREATE POLICY "Users can update their own metadata" ON template_metadata
FOR UPDATE USING (
  user_id = auth.uid()
  OR is_system_admin() -- System admins can update any metadata
);

-- Users can delete their own metadata
CREATE POLICY "Users can delete their own metadata" ON template_metadata
FOR DELETE USING (
  user_id = auth.uid()
  OR is_system_admin() -- System admins can delete any metadata
);

-- ===================================================================
-- Certificates Policies
-- ===================================================================

-- Organizations can view their own certificates
CREATE POLICY "Organizations can view their own certificates" ON certificates
FOR SELECT USING (
  publisher_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
  OR publisher_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR status = 'active' -- Active certificates are publicly viewable
  OR is_system_admin() -- System admins can view all certificates
);

-- Organizations can insert their own certificates
CREATE POLICY "Organizations can insert their own certificates" ON certificates
FOR INSERT WITH CHECK (
  publisher_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
  OR publisher_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR is_system_admin() -- System admins can insert certificates for any organization
);

-- Organizations can update their own certificates
CREATE POLICY "Organizations can update their own certificates" ON certificates
FOR UPDATE USING (
  publisher_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
  OR publisher_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR is_system_admin() -- System admins can update any certificate
);

-- Organizations can delete their own certificates
CREATE POLICY "Organizations can delete their own certificates" ON certificates
FOR DELETE USING (
  publisher_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  )
  OR publisher_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
  OR is_system_admin() -- System admins can delete any certificate
);

-- ===================================================================
-- Certificate Verifications Policies
-- ===================================================================

-- Anyone can insert verification records (for statistics)
CREATE POLICY "Anyone can insert verification records" ON certificate_verifications
FOR INSERT WITH CHECK (true);

-- Only system admins can view verification records
CREATE POLICY "System admins can view verification records" ON certificate_verifications
FOR SELECT USING (is_system_admin());

-- ===================================================================
-- Completion
-- ===================================================================
SELECT 'Production security policies applied successfully!' as result;
SELECT 'Policies created for: organizations, organization_members, system_admins, templates, template_metadata, certificates, certificate_verifications' as info; 