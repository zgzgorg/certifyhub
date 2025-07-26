-- 创建 templates bucket
-- 在 Supabase SQL Editor 中运行这个脚本

-- 删除已存在的 bucket（如果存在）
DELETE FROM storage.buckets WHERE id = 'templates';

-- 创建新的 templates bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- 创建存储策略
-- 允许公开读取
CREATE POLICY "Templates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates');

-- 允许认证用户上传
CREATE POLICY "Authenticated users can upload templates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'templates' 
    AND auth.role() = 'authenticated'
  );

-- 允许用户更新自己的文件
CREATE POLICY "Users can update their own templates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'templates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 允许用户删除自己的文件
CREATE POLICY "Users can delete their own templates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'templates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 验证 bucket 是否创建成功
SELECT * FROM storage.buckets WHERE id = 'templates'; 