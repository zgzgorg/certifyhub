-- ===================================================================
-- CertifyHub Data Migration Script
-- ===================================================================
-- This file handles data migration for existing databases
-- Run this after 01-schema.sql, 02-functions.sql, 03-storage.sql, and 04-production-policies.sql
-- ===================================================================

-- ===================================================================
-- Data Migration for Organizations
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
-- Clean up legacy columns (optional)
-- ===================================================================

-- Remove legacy user_id column from organizations if it exists and is no longer needed
-- ALTER TABLE organizations DROP COLUMN IF EXISTS user_id;

-- ===================================================================
-- Verification Queries
-- ===================================================================

-- Check organization members data
SELECT 
  'Organization Members Count' as info,
  COUNT(*) as count
FROM organization_members
UNION ALL
SELECT 
  'Organizations with Owners' as info,
  COUNT(*) as count
FROM organizations 
WHERE owner_id IS NOT NULL
UNION ALL
SELECT 
  'Organizations without Owners' as info,
  COUNT(*) as count
FROM organizations 
WHERE owner_id IS NULL;

-- Check for any orphaned data
SELECT 
  'Orphaned Organization Members' as info,
  COUNT(*) as count
FROM organization_members om
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE o.id IS NULL
UNION ALL
SELECT 
  'Orphaned Certificates' as info,
  COUNT(*) as count
FROM certificates c
LEFT JOIN organizations o ON c.publisher_id = o.id
WHERE o.id IS NULL;

-- ===================================================================
-- Completion
-- ===================================================================
SELECT 'Data migration completed successfully!' as result; 

-- Migration: Add organization_id to templates table
-- This migration adds support for organization-based templates

-- Add organization_id column to templates table
ALTER TABLE templates 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON templates(organization_id);

-- Update existing templates to have null organization_id (personal templates)
-- This ensures existing templates are treated as personal templates
UPDATE templates 
SET organization_id = NULL 
WHERE organization_id IS NULL;

-- Add comment to document the change
COMMENT ON COLUMN templates.organization_id IS 'References the organization that created this template. NULL for personal templates.'; 