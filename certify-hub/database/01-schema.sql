-- ===================================================================
-- CertifyHub Database Schema - Core Tables
-- ===================================================================
-- This file contains the complete database schema for CertifyHub
-- Run this in your Supabase SQL Editor to set up the database
-- ===================================================================

-- ===================================================================
-- Drop existing tables (if they exist)
-- ===================================================================
DROP TABLE IF EXISTS certificate_verifications CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS template_metadata CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS system_admins CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ===================================================================
-- Create core tables
-- ===================================================================

-- Organizations table for institutional users
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

-- Organization members table for managing user roles within organizations
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

-- System administrators table
CREATE TABLE system_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator')),
  permissions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table for certificate templates
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

-- Template metadata table for storing field information
CREATE TABLE template_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  user_id UUID NOT NULL,
  metadata JSONB NOT NULL, -- Flexible JSON structure for field definitions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id, is_default) -- Ensure only one default per user per template
);

-- Certificates table for storing issued certificates
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

-- Certificate verifications table for tracking verification attempts
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
-- Create indexes for better performance
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
-- Create unique constraints
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
-- Create triggers for automatic timestamp updates
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
-- Enable Row Level Security (RLS)
-- ===================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Create basic RLS policies (development-friendly)
-- ===================================================================

-- Organizations policies
CREATE POLICY "allow_authenticated_organizations" ON organizations
FOR ALL USING (auth.uid() IS NOT NULL);

-- Organization members policies
CREATE POLICY "allow_authenticated_organization_members" ON organizations
FOR ALL USING (auth.uid() IS NOT NULL);

-- System admins policies
CREATE POLICY "allow_authenticated_system_admins" ON system_admins
FOR ALL USING (auth.uid() IS NOT NULL);

-- Templates policies
CREATE POLICY "allow_authenticated_templates" ON templates
FOR ALL USING (auth.uid() IS NOT NULL);

-- Template metadata policies
CREATE POLICY "allow_authenticated_template_metadata" ON template_metadata
FOR ALL USING (auth.uid() IS NOT NULL);

-- Certificates policies
CREATE POLICY "allow_authenticated_certificates" ON certificates
FOR ALL USING (auth.uid() IS NOT NULL);

-- Certificate verifications policies
CREATE POLICY "allow_authenticated_certificate_verifications" ON certificate_verifications
FOR ALL USING (auth.uid() IS NOT NULL);

-- ===================================================================
-- Completion
-- ===================================================================
SELECT 'Core database schema created successfully!' as result;
SELECT 'Tables created: organizations, organization_members, system_admins, templates, template_metadata, certificates, certificate_verifications' as info; 