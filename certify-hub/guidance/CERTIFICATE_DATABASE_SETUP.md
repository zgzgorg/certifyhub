# 证书存储系统数据库设置指南

## 概述

本指南将帮助您在 Supabase 中设置证书存储系统的数据库结构。

## 前置条件

1. 确保您已经有一个 Supabase 项目
2. 确保已经运行了基础的数据库设置脚本 (`database-schema.sql`)
3. 确保 `organizations` 和 `templates` 表已经存在

## 部署步骤

### 1. 运行数据库设置脚本

1. 打开您的 Supabase 项目
2. 进入 **SQL Editor**
3. 复制 `create-certificates-table.sql` 文件的全部内容
4. 粘贴到 SQL Editor 中
5. 点击 **Run** 执行脚本

### 2. 验证设置

执行完成后，您应该看到以下验证结果：

#### 表创建验证
```sql
-- 检查表是否创建成功
SELECT 
  'certificates' as table_name,
  COUNT(*) as row_count
FROM certificates
UNION ALL
SELECT 
  'certificate_verifications' as table_name,
  COUNT(*) as row_count
FROM certificate_verifications;
```

#### Storage Bucket 验证
```sql
-- 检查 storage bucket 是否创建成功
SELECT 
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets 
WHERE id = 'certificates';
```

#### 索引验证
```sql
-- 检查索引是否创建成功
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN ('certificates', 'certificate_verifications')
ORDER BY tablename, indexname;
```

### 3. 预期结果

执行成功后，您应该看到：

1. **两个新表**：
   - `certificates` - 存储证书信息
   - `certificate_verifications` - 存储验证记录

2. **多个索引**：用于提高查询性能

3. **一个 Storage Bucket**：
   - `certificates` - 用于存储PDF文件

4. **RLS 策略**：确保数据安全

## 数据库结构说明

### certificates 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| template_id | UUID | 模板ID（外键） |
| publisher_id | UUID | 发布者ID（外键） |
| recipient_email | VARCHAR(255) | 接收者邮箱（必填） |
| metadata_values | JSONB | 证书内容数据 |
| content_hash | VARCHAR(255) | 内容完整性hash |
| certificate_key | VARCHAR(255) | 唯一标识 |
| watermark_data | JSONB | 数字水印数据 |
| pdf_url | TEXT | PDF文件URL |
| issued_at | TIMESTAMP | 发布时间 |
| expires_at | TIMESTAMP | 过期时间（可选） |
| status | VARCHAR(20) | 状态（active/revoked/expired） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### certificate_verifications 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| certificate_key | VARCHAR(255) | 证书Key |
| verified_at | TIMESTAMP | 验证时间 |
| ip_address | INET | 验证者IP |
| user_agent | TEXT | 用户代理 |
| verification_result | VARCHAR(20) | 验证结果 |
| verification_type | VARCHAR(20) | 验证类型 |
| created_at | TIMESTAMP | 创建时间 |

## 安全特性

### 行级安全 (RLS)
- 组织只能访问自己发布的证书
- 任何人都可以查看有效的证书（用于公开验证）
- 验证记录只有管理员可以查看

### 唯一约束
- 防止同一组织为同一邮箱生成相同内容的证书

### 索引优化
- 为常用查询字段创建索引
- 提高查询性能

## 存储配置

### Supabase Storage
- **Bucket名称**: `certificates`
- **文件大小限制**: 50MB
- **允许的文件类型**: PDF
- **访问权限**: 公开读取，认证用户上传

### 文件路径格式
```
{publisherId}/{certificateKey}.pdf
```

## 辅助函数

### get_organization_certificate_count(org_id)
获取组织发布的证书数量

### get_certificate_verification_count(cert_key)
获取证书的验证次数

## 故障排除

### 常见问题

1. **外键约束错误**
   - 确保 `organizations` 和 `templates` 表已存在
   - 检查外键引用的数据是否存在

2. **权限错误**
   - 确保您有足够的权限创建表和索引
   - 检查 RLS 策略是否正确

3. **Storage Bucket 创建失败**
   - 检查是否已存在同名的 bucket
   - 确保有足够的存储配额

### 验证命令

```sql
-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('certificates', 'certificate_verifications');

-- 检查索引是否存在
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('certificates', 'certificate_verifications');

-- 检查 RLS 是否启用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('certificates', 'certificate_verifications');
```

## 下一步

数据库设置完成后，您可以：

1. 实现证书生成功能
2. 实现PDF生成和上传
3. 实现证书验证功能
4. 创建前端界面

## 注意事项

- 在生产环境中，请确保定期备份数据库
- 监控存储使用量，避免超出配额
- 定期清理过期的验证记录
- 考虑设置证书的自动过期机制 