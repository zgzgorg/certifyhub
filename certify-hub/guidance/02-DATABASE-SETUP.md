# 数据库初始化指南

## 概述

本指南将帮助您在 Supabase 中设置 CertifyHub 的完整数据库架构，包括所有必要的表、索引、存储桶和安全策略。

## 前置条件

1. 确保您已经有一个 Supabase 项目
2. 确保您有项目的管理员权限
3. 准备好运行 SQL 脚本

## 1. 基础数据库架构

### 运行基础架构脚本

1. 打开您的 Supabase 项目
2. 进入 **SQL Editor**
3. 按顺序运行以下脚本：

#### 1.1 基础表结构 (`database-schema.sql`)
```sql
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建组织表
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  description TEXT,
  website TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建模板表
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL,
  css_content TEXT,
  metadata_schema JSONB,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.2 证书表结构 (`create-certificates-table.sql`)
```sql
-- 创建证书表
CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  publisher_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  metadata_values JSONB NOT NULL,
  content_hash VARCHAR(255) NOT NULL,
  certificate_key VARCHAR(255) UNIQUE NOT NULL,
  watermark_data JSONB,
  pdf_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建证书验证记录表
CREATE TABLE IF NOT EXISTS certificate_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_key VARCHAR(255) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  verification_result JSONB
);
```

#### 1.3 系统管理员设置 (`create-system-admin.sql`)
```sql
-- 创建系统管理员角色
CREATE TYPE user_role AS ENUM ('user', 'admin', 'system_admin');

-- 添加角色字段到用户表
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- 创建系统管理员函数
CREATE OR REPLACE FUNCTION create_system_admin(admin_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET role = 'system_admin' 
  WHERE email = admin_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## 2. 存储桶设置

### 创建证书存储桶
```sql
-- 创建证书存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('certificates', 'certificates', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 设置存储桶策略
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'certificates');

CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'certificates' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 3. 索引优化

### 性能索引
```sql
-- 证书表索引
CREATE INDEX IF NOT EXISTS idx_certificates_template_id ON certificates(template_id);
CREATE INDEX IF NOT EXISTS idx_certificates_publisher_id ON certificates(publisher_id);
CREATE INDEX IF NOT EXISTS idx_certificates_recipient_email ON certificates(recipient_email);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_key ON certificates(certificate_key);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON certificates(issued_at);

-- 验证记录索引
CREATE INDEX IF NOT EXISTS idx_certificate_verifications_certificate_key ON certificate_verifications(certificate_key);
CREATE INDEX IF NOT EXISTS idx_certificate_verifications_verified_at ON certificate_verifications(verified_at);

-- 模板表索引
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);

-- 组织表索引
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_admin_id ON organizations(admin_id);
```

## 4. 行级安全策略

### 用户表策略
```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的数据
CREATE POLICY "Users can view own profile" ON users
FOR SELECT USING (auth.uid() = id);

-- 用户只能更新自己的数据
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid() = id);
```

### 组织表策略
```sql
-- 启用 RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看已批准的组织
CREATE POLICY "Anyone can view approved organizations" ON organizations
FOR SELECT USING (status = 'approved');

-- 管理员可以查看所有组织
CREATE POLICY "Admins can view all organizations" ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'system_admin')
  )
);

-- 用户只能更新自己的组织
CREATE POLICY "Users can update own organization" ON organizations
FOR UPDATE USING (admin_id = auth.uid());
```

### 证书表策略
```sql
-- 启用 RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 发布者可以查看自己发布的证书
CREATE POLICY "Publishers can view own certificates" ON certificates
FOR SELECT USING (publisher_id IN (
  SELECT id FROM organizations WHERE admin_id = auth.uid()
));

-- 管理员可以查看所有证书
CREATE POLICY "Admins can view all certificates" ON certificates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'system_admin')
  )
);

-- 发布者可以创建证书
CREATE POLICY "Publishers can create certificates" ON certificates
FOR INSERT WITH CHECK (publisher_id IN (
  SELECT id FROM organizations WHERE admin_id = auth.uid()
));
```

## 5. 验证设置

### 检查表创建
```sql
-- 验证所有表都已创建
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 'organizations', 'templates', 
  'certificates', 'certificate_verifications'
)
ORDER BY table_name;
```

### 检查存储桶
```sql
-- 验证存储桶创建
SELECT 
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets 
WHERE id = 'certificates';
```

### 检查索引
```sql
-- 验证索引创建
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN ('certificates', 'certificate_verifications', 'templates', 'organizations')
ORDER BY tablename, indexname;
```

## 6. 初始数据设置

### 创建系统管理员
```sql
-- 替换为实际的邮箱地址
SELECT create_system_admin('admin@example.com');
```

### 创建示例模板
```sql
-- 插入示例模板
INSERT INTO templates (name, description, html_content, is_public, created_by)
VALUES (
  'Basic Certificate',
  'A simple certificate template',
  '<div class="certificate">...</div>',
  true,
  (SELECT id FROM users WHERE role = 'system_admin' LIMIT 1)
);
```

## 7. 故障排除

### 常见问题

1. **权限错误**
   - 确保使用正确的 Supabase 密钥
   - 检查 RLS 策略是否正确

2. **表创建失败**
   - 检查 SQL 语法
   - 确保没有重复的表名

3. **索引创建失败**
   - 检查表是否存在
   - 确保索引名称唯一

## 8. 性能优化

### 数据库配置优化
```sql
-- 设置连接池参数
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- 重新加载配置
SELECT pg_reload_conf();
```

### 查询优化
```sql
-- 创建复合索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_certificates_composite ON certificates(
  publisher_id, status, issued_at
);

CREATE INDEX IF NOT EXISTS idx_templates_composite ON templates(
  created_by, is_public, created_at
);

-- 创建部分索引
CREATE INDEX IF NOT EXISTS idx_certificates_active ON certificates(issued_at)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_organizations_pending ON organizations(created_at)
WHERE status = 'pending';
```

### 数据清理策略
```sql
-- 创建自动清理过期证书的函数
CREATE OR REPLACE FUNCTION cleanup_expired_certificates()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM certificates 
  WHERE expires_at < NOW() 
  AND status = 'active';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建清理旧验证记录的函数
CREATE OR REPLACE FUNCTION cleanup_old_verifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM certificate_verifications 
  WHERE verified_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

## 9. 监控和维护

### 数据库监控查询
```sql
-- 检查表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 检查索引使用情况
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- 检查慢查询
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE query LIKE '%certificates%'
ORDER BY total_time DESC
LIMIT 10;
```

### 备份策略
```sql
-- 创建备份函数
CREATE OR REPLACE FUNCTION create_backup()
RETURNS TEXT AS $$
DECLARE
  backup_file TEXT;
BEGIN
  backup_file := 'certifyhub_backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS') || '.sql';
  
  -- 这里应该调用 pg_dump 命令
  -- 实际实现需要根据部署环境调整
  
  RETURN backup_file;
END;
$$ LANGUAGE plpgsql;
```

## 10. 安全最佳实践

### 数据加密
```sql
-- 启用列级加密（如果使用 pgcrypto）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 加密敏感字段
ALTER TABLE users ADD COLUMN encrypted_phone BYTEA;

-- 创建加密函数
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- 创建解密函数
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql;
```

### 审计日志
```sql
-- 创建审计表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建审计触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, operation, record_id, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, operation, record_id, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, operation, record_id, old_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 为重要表添加审计触发器
CREATE TRIGGER audit_certificates_trigger
  AFTER INSERT OR UPDATE OR DELETE ON certificates
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_organizations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## 11. 故障排除

### 常见问题

1. **权限错误**
   - 确保使用正确的 Supabase 密钥
   - 检查 RLS 策略是否正确
   - 验证用户角色和权限

2. **表创建失败**
   - 检查 SQL 语法
   - 确保没有重复的表名
   - 验证数据类型兼容性

3. **索引创建失败**
   - 检查表是否存在
   - 确保索引名称唯一
   - 验证索引列的数据类型

4. **性能问题**
   - 检查查询执行计划
   - 优化索引使用
   - 监控数据库资源使用

5. **存储桶问题**
   - 验证存储桶权限
   - 检查文件上传限制
   - 确认存储策略配置

### 调试工具
```sql
-- 检查当前连接
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query
FROM pg_stat_activity 
WHERE state = 'active';

-- 检查锁等待
SELECT 
  l.pid,
  l.mode,
  l.granted,
  a.usename,
  a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;

-- 检查表统计信息
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;
```

## 12. 相关文档

- [项目设置指南](./01-SETUP.md)
- [证书系统架构](./04-CERTIFICATE-ARCHITECTURE.md)
- [系统管理员设置](./12-SYSTEM-ADMIN.md)
- [数据库迁移](./14-DATABASE-MIGRATION.md)
- [调试指南](./13-DEBUG.md) 