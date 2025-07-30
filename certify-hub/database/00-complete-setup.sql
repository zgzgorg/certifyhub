-- ===================================================================
-- CertifyHub Complete Database Setup
-- ===================================================================
-- This file runs all database setup scripts in the correct order
-- Run this in your Supabase SQL Editor to set up the complete database
-- ===================================================================

-- ===================================================================
-- SECTION 1: Core Schema
-- ===================================================================

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS certificate_verifications CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS template_metadata CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS system_admins CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Create core tables
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  website VARCHAR(500),
  contact_person VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  owner_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organization_members (
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

CREATE TABLE system_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
  permissions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  share_url TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE template_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  user_id UUID NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id, is_default)
);

CREATE TABLE certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  publisher_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  metadata_values JSONB NOT NULL,
  content_hash VARCHAR(255) NOT NULL,
  certificate_key VARCHAR(255) UNIQUE NOT NULL,
  watermark_data JSONB NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE certificate_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_key VARCHAR(255) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  verification_result VARCHAR(20) NOT NULL CHECK (verification_result IN ('valid', 'invalid', 'expired', 'revoked', 'not_found')),
  verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('online', 'offline', 'pdf')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- SECTION 2: Indexes
-- ===================================================================

-- Organizations indexes
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_email ON organizations(email);

-- Organization members indexes
CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);

-- System admins indexes
CREATE INDEX idx_system_admins_user_id ON system_admins(user_id);
CREATE INDEX idx_system_admins_role ON system_admins(role);

-- Templates indexes
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_is_public ON templates(is_public);
CREATE INDEX idx_templates_share_url ON templates(share_url);

-- Template metadata indexes
CREATE INDEX idx_template_metadata_template_id ON template_metadata(template_id);
CREATE INDEX idx_template_metadata_user_id ON template_metadata(user_id);
CREATE INDEX idx_template_metadata_is_default ON template_metadata(is_default);
CREATE INDEX idx_template_metadata_template_user_default ON template_metadata(template_id, user_id, is_default);

-- Certificates indexes
CREATE INDEX idx_certificates_template_id ON certificates(template_id);
CREATE INDEX idx_certificates_publisher_id ON certificates(publisher_id);
CREATE INDEX idx_certificates_certificate_key ON certificates(certificate_key);
CREATE INDEX idx_certificates_content_hash ON certificates(content_hash);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_issued_at ON certificates(issued_at);
CREATE INDEX idx_certificates_recipient_email ON certificates(recipient_email);
CREATE INDEX idx_certificates_publisher_status ON certificates(publisher_id, status);
CREATE INDEX idx_certificates_template_status ON certificates(template_id, status);

-- Certificate verifications indexes
CREATE INDEX idx_certificate_verifications_certificate_key ON certificate_verifications(certificate_key);
CREATE INDEX idx_certificate_verifications_verified_at ON certificate_verifications(verified_at);
CREATE INDEX idx_certificate_verifications_result ON certificate_verifications(verification_result);

-- ===================================================================
-- SECTION 3: Constraints
-- ===================================================================

-- Prevent duplicate certificate content
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_certificate_content'
    ) THEN
        ALTER TABLE certificates 
        ADD CONSTRAINT unique_certificate_content 
        UNIQUE(template_id, publisher_id, recipient_email, metadata_values);
    END IF;
END $$;

-- ===================================================================
-- SECTION 4: Triggers
-- ===================================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at 
  BEFORE UPDATE ON organization_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_admins_updated_at 
  BEFORE UPDATE ON system_admins 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at 
  BEFORE UPDATE ON templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_metadata_updated_at 
  BEFORE UPDATE ON template_metadata 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at 
  BEFORE UPDATE ON certificates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- SECTION 5: Functions
-- ===================================================================

-- System Admin Functions
CREATE OR REPLACE FUNCTION is_system_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_super(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_admins 
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_system_admin_role(p_user_id UUID DEFAULT auth.uid())
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN (
    SELECT role FROM system_admins 
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_system_permission(
  p_user_id UUID DEFAULT auth.uid(),
  p_permission VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_role VARCHAR(20);
  admin_permissions JSONB;
BEGIN
  IF p_permission IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT role, permissions INTO admin_role, admin_permissions
  FROM system_admins 
  WHERE user_id = p_user_id;
  
  IF admin_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  IF admin_permissions IS NOT NULL AND admin_permissions ? p_permission THEN
    RETURN (admin_permissions->>p_permission)::BOOLEAN;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organization Functions
CREATE OR REPLACE FUNCTION get_user_role_in_organization(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS VARCHAR(20) AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND owner_id = p_user_id) THEN
    RETURN 'owner';
  END IF;
  
  RETURN (
    SELECT role 
    FROM organization_members 
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_organization_owner(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role_in_organization(p_user_id, p_organization_id) = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Certificate Functions
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
-- SECTION 6: Views
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
-- SECTION 7: Storage Setup
-- ===================================================================

-- Create templates bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Create certificates bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for templates
CREATE POLICY "Templates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates');

CREATE POLICY "Authenticated users can upload templates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'templates' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own templates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'templates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own templates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'templates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for certificates
CREATE POLICY "Certificates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

CREATE POLICY "Authenticated users can upload certificates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'certificates' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own certificates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'certificates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own certificates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'certificates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===================================================================
-- SECTION 8: RLS Setup
-- ===================================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (development-friendly)
CREATE POLICY "allow_authenticated_organizations" ON organizations
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_organization_members" ON organization_members
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_system_admins" ON system_admins
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_templates" ON templates
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_template_metadata" ON template_metadata
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_certificates" ON certificates
FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_certificate_verifications" ON certificate_verifications
FOR ALL USING (auth.uid() IS NOT NULL);

-- ===================================================================
-- SECTION 9: Completion
-- ===================================================================
SELECT 'CertifyHub database setup completed successfully!' as result;
SELECT 'Tables created: organizations, organization_members, system_admins, templates, template_metadata, certificates, certificate_verifications' as info;
SELECT 'Functions created: is_system_admin, is_super_admin, is_admin_or_super, get_system_admin_role, has_system_permission, get_user_role_in_organization, is_organization_owner, is_organization_admin, get_organization_certificate_count, get_certificate_verification_count' as functions;
SELECT 'Storage buckets created: templates, certificates' as storage;
SELECT 'Basic RLS policies applied for development' as policies; 