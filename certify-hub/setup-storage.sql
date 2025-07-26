-- =====================================================
-- Supabase Storage Setup for CertifyHub
-- =====================================================
-- Run this in your Supabase SQL Editor to set up storage buckets

-- Create templates bucket for storing certificate templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create storage policies for templates bucket
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