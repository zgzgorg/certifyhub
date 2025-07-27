-- =====================================================
-- CertifyHub 证书存储系统数据库设置
-- =====================================================
-- 这个脚本创建证书存储所需的所有数据库表和配置
-- 在 Supabase SQL Editor 中运行这个脚本

-- =====================================================
-- 1. 创建 certificates 表
-- =====================================================

CREATE TABLE IF NOT EXISTS certificates (
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

-- =====================================================
-- 2. 创建索引以提高查询性能
-- =====================================================

-- 模板ID索引
CREATE INDEX IF NOT EXISTS idx_certificates_template_id ON certificates(template_id);

-- 发布者ID索引
CREATE INDEX IF NOT EXISTS idx_certificates_publisher_id ON certificates(publisher_id);

-- 证书Key索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_key ON certificates(certificate_key);

-- 内容Hash索引（用于重复检测）
CREATE INDEX IF NOT EXISTS idx_certificates_content_hash ON certificates(content_hash);

-- 状态索引（用于筛选有效证书）
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);

-- 发布时间索引（用于排序）
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON certificates(issued_at);

-- 邮箱索引（用于查找特定用户的证书）
CREATE INDEX IF NOT EXISTS idx_certificates_recipient_email ON certificates(recipient_email);

-- 复合索引（用于高效查询）
CREATE INDEX IF NOT EXISTS idx_certificates_publisher_status ON certificates(publisher_id, status);
CREATE INDEX IF NOT EXISTS idx_certificates_template_status ON certificates(template_id, status);

-- =====================================================
-- 3. 创建唯一约束防止重复生成
-- =====================================================

-- 防止同一组织为同一邮箱生成相同内容的证书
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

-- =====================================================
-- 4. 创建触发器自动更新 updated_at
-- =====================================================

-- 确保 update_updated_at_column 函数存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 certificates 表创建触发器
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_certificates_updated_at'
    ) THEN
        CREATE TRIGGER update_certificates_updated_at 
          BEFORE UPDATE ON certificates 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- 5. 启用行级安全 (RLS)
-- =====================================================

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. 创建 RLS 策略
-- =====================================================

-- 组织可以查看自己发布的证书
CREATE POLICY "Organizations can view their own certificates" ON certificates
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organizations WHERE id = certificates.publisher_id
    )
  );

-- 组织可以插入自己的证书
CREATE POLICY "Organizations can insert their own certificates" ON certificates
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organizations WHERE id = certificates.publisher_id
    )
  );

-- 组织可以更新自己的证书
CREATE POLICY "Organizations can update their own certificates" ON certificates
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM organizations WHERE id = certificates.publisher_id
    )
  );

-- 组织可以删除自己的证书
CREATE POLICY "Organizations can delete their own certificates" ON certificates
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM organizations WHERE id = certificates.publisher_id
    )
  );

-- 任何人都可以查看有效的证书（用于公开验证）
CREATE POLICY "Public can view active certificates" ON certificates
  FOR SELECT USING (status = 'active');

-- =====================================================
-- 7. 创建证书验证记录表（可选）
-- =====================================================

CREATE TABLE IF NOT EXISTS certificate_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_key VARCHAR(255) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  verification_result VARCHAR(20) NOT NULL CHECK (verification_result IN ('valid', 'invalid', 'expired', 'revoked', 'not_found')),
  verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('online', 'offline', 'pdf')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为验证记录创建索引
CREATE INDEX IF NOT EXISTS idx_certificate_verifications_certificate_key ON certificate_verifications(certificate_key);
CREATE INDEX IF NOT EXISTS idx_certificate_verifications_verified_at ON certificate_verifications(verified_at);
CREATE INDEX IF NOT EXISTS idx_certificate_verifications_result ON certificate_verifications(verification_result);

-- 启用验证记录的RLS
ALTER TABLE certificate_verifications ENABLE ROW LEVEL SECURITY;

-- 任何人都可以插入验证记录（用于统计）
CREATE POLICY "Anyone can insert verification records" ON certificate_verifications
  FOR INSERT WITH CHECK (true);

-- 只有管理员可以查看验证记录
CREATE POLICY "Admins can view verification records" ON certificate_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- =====================================================
-- 8. 创建 Supabase Storage bucket
-- =====================================================

-- 创建 certificates bucket 用于存储生成的PDF文件
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. 创建 Storage 策略
-- =====================================================

-- 允许公开读取证书PDF
CREATE POLICY "Certificates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

-- 允许认证用户上传证书PDF
CREATE POLICY "Authenticated users can upload certificates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'certificates' 
    AND auth.role() = 'authenticated'
  );

-- 允许用户更新自己的证书PDF
CREATE POLICY "Users can update their own certificates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'certificates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 允许用户删除自己的证书PDF
CREATE POLICY "Users can delete their own certificates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'certificates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- 10. 创建辅助函数
-- =====================================================

-- 获取组织发布的证书数量
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

-- 获取证书的验证次数
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

-- =====================================================
-- 11. 验证设置
-- =====================================================

-- 验证表是否创建成功
SELECT 
  'certificates' as table_name,
  COUNT(*) as row_count
FROM certificates
UNION ALL
SELECT 
  'certificate_verifications' as table_name,
  COUNT(*) as row_count
FROM certificate_verifications;

-- 验证bucket是否创建成功
SELECT 
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets 
WHERE id = 'certificates';

-- 验证索引是否创建成功
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN ('certificates', 'certificate_verifications')
ORDER BY tablename, indexname;

-- =====================================================
-- 完成！
-- =====================================================
-- 数据库设置已完成，现在可以开始实现证书生成和验证功能了。 