-- =====================================================
-- Update Template Metadata RLS Policies
-- =====================================================
-- Run this script in your Supabase SQL Editor to enable public access to metadata

-- Drop the simplified development policy
DROP POLICY IF EXISTS "Enable all operations for template_metadata" ON template_metadata;

-- Create more specific policies for production use

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

-- Allow authenticated users to read their own metadata
CREATE POLICY "Users can read their own metadata" ON template_metadata
  FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own metadata
CREATE POLICY "Users can insert their own metadata" ON template_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own metadata
CREATE POLICY "Users can update their own metadata" ON template_metadata
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow authenticated users to delete their own metadata
CREATE POLICY "Users can delete their own metadata" ON template_metadata
  FOR DELETE USING (auth.uid() = user_id);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'template_metadata'; 