-- ===================================================================
-- CertifyHub Storage Setup
-- ===================================================================
-- This file sets up Supabase Storage buckets and policies
-- Run this after 01-schema.sql and 02-functions.sql
-- ===================================================================

-- ===================================================================
-- Create Storage Buckets
-- ===================================================================

-- Create templates bucket for storing certificate templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Create certificates bucket for storing generated PDF files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- Create Storage Policies for Templates Bucket
-- ===================================================================

-- Allow public read access to templates
CREATE POLICY "Templates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates');

-- Allow authenticated users to upload templates
CREATE POLICY "Authenticated users can upload templates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'templates' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own templates
CREATE POLICY "Users can update their own templates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'templates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own templates
CREATE POLICY "Users can delete their own templates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'templates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===================================================================
-- Create Storage Policies for Certificates Bucket
-- ===================================================================

-- Allow public read access to certificates
CREATE POLICY "Certificates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

-- Allow authenticated users to upload certificates
CREATE POLICY "Authenticated users can upload certificates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'certificates' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own certificates
CREATE POLICY "Users can update their own certificates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'certificates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own certificates
CREATE POLICY "Users can delete their own certificates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'certificates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===================================================================
-- Verification
-- ===================================================================

-- Verify buckets are created successfully
SELECT 
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets 
WHERE id IN ('templates', 'certificates')
ORDER BY id;

-- ===================================================================
-- Completion
-- ===================================================================
SELECT 'Storage setup completed successfully!' as result;
SELECT 'Buckets created: templates, certificates' as info; 