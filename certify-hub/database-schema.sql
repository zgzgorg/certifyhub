-- =====================================================
-- CertifyHub Database Schema
-- =====================================================
-- This file contains the complete database schema for CertifyHub
-- Run this in your Supabase SQL Editor to set up the database

-- =====================================================
-- Drop existing tables (if they exist)
-- =====================================================
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS regular_users CASCADE;
DROP TABLE IF EXISTS templates CASCADE;

-- =====================================================
-- Create tables
-- =====================================================

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID -- Foreign key will be added later for better development experience
);

-- Regular users table for individual users
CREATE TABLE regular_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID -- Foreign key will be added later for better development experience
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
  share_url TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Create triggers for automatic timestamp updates
-- =====================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for both tables
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regular_users_updated_at 
  BEFORE UPDATE ON regular_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at 
  BEFORE UPDATE ON templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regular_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS policies (simplified for development)
-- =====================================================

-- Organizations policies - allow all operations for development
CREATE POLICY "Enable all operations for organizations" ON organizations
  FOR ALL USING (true) WITH CHECK (true);

-- Regular users policies - allow all operations for development
CREATE POLICY "Enable all operations for regular users" ON regular_users
  FOR ALL USING (true) WITH CHECK (true);

-- Templates policies - allow all operations for development
CREATE POLICY "Enable all operations for templates" ON templates
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Create indexes for better performance
-- =====================================================
CREATE INDEX idx_organizations_user_id ON organizations(user_id);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_email ON organizations(email);
CREATE INDEX idx_regular_users_user_id ON regular_users(user_id);
CREATE INDEX idx_regular_users_email ON regular_users(email);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_is_public ON templates(is_public);
CREATE INDEX idx_templates_share_url ON templates(share_url);

-- =====================================================
-- Optional: Add foreign key constraints (uncomment when ready)
-- =====================================================
-- Note: Uncomment these lines when the system is stable and you want
-- to enforce referential integrity with auth.users table

-- ALTER TABLE organizations ADD CONSTRAINT fk_organizations_user_id 
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- 
-- ALTER TABLE regular_users ADD CONSTRAINT fk_regular_users_user_id 
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =====================================================
-- Production-ready RLS policies (uncomment when ready)
-- =====================================================
-- Note: Uncomment these lines when you want to implement proper security

-- -- Drop simplified policies
-- DROP POLICY IF EXISTS "Enable all operations for organizations" ON organizations;
-- DROP POLICY IF EXISTS "Enable all operations for regular users" ON regular_users;

-- -- Organizations policies
-- CREATE POLICY "Organizations are viewable by owner" ON organizations
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Organizations are insertable by authenticated users" ON organizations
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Organizations are updatable by owner" ON organizations
--   FOR UPDATE USING (auth.uid() = user_id);

-- -- Regular users policies
-- CREATE POLICY "Regular users are viewable by owner" ON regular_users
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Regular users are insertable by authenticated users" ON regular_users
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Regular users are updatable by owner" ON regular_users
--   FOR UPDATE USING (auth.uid() = user_id);

-- -- Admin policies
-- CREATE POLICY "Admin can view all organizations" ON organizations
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM auth.users 
--       WHERE auth.users.id = auth.uid() 
--       AND auth.users.raw_user_meta_data->>'role' = 'admin'
--     )
--   );
-- CREATE POLICY "Admin can update all organizations" ON organizations
--   FOR UPDATE USING (
--     EXISTS (
--       SELECT 1 FROM auth.users 
--       WHERE auth.users.id = auth.uid() 
--       AND auth.users.raw_user_meta_data->>'role' = 'admin'
--     )
--   ); 