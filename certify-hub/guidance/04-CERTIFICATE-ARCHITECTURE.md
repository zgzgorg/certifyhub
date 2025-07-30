# 证书系统架构

## 概述

CertifyHub 的证书系统采用现代化的架构设计，支持证书的创建、存储、验证和管理。系统基于 Supabase 构建，提供高可用性和可扩展性。

## 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   Supabase      │    │   存储系统      │
│   (Next.js)     │◄──►│   (PostgreSQL)  │◄──►│   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户界面      │    │   数据库层       │    │   PDF文件       │
│   - 证书生成    │    │   - 证书表      │    │   - 证书PDF     │
│   - 证书验证    │    │   - 模板表      │    │   - 水印数据    │
│   - 批量操作    │    │   - 验证记录    │    │   - 元数据      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 核心组件

### 1. 数据库设计

#### 证书表 (certificates)
```sql
CREATE TABLE certificates (
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
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 验证记录表 (certificate_verifications)
```sql
CREATE TABLE certificate_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_key VARCHAR(255) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  verification_result JSONB
);
```

### 2. 存储系统

#### Supabase Storage
- **Bucket**: `certificates`
- **访问权限**: 公开读取，认证用户上传
- **文件命名**: `{certificateKey}.pdf`
- **文件大小限制**: 50MB

#### 存储策略
```sql
-- 公开访问
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'certificates');

-- 认证用户上传
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'certificates' 
  AND auth.role() = 'authenticated'
);
```

### 3. 证书生成流程

#### 证书密钥生成
```typescript
// 生成唯一的证书密钥
const certificateKey = generateCertificateKey({
  templateId,
  publisherId,
  recipientEmail,
  metadataValues
});

// 生成内容哈希
const contentHash = generateContentHash(metadataValues);
```

#### PDF 生成
```typescript
// 使用 html2canvas 和 jsPDF
const generatePDF = async (certificateData) => {
  const canvas = await html2canvas(certificateElement);
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
  return pdf;
};
```

### 4. 验证系统

#### 在线验证
- **URL**: `/verify/[certificateKey]`
- **验证内容**: 证书真实性、状态、有效期
- **记录**: 验证历史、IP地址、用户代理

#### 离线验证
- **数字水印**: 嵌入证书数据
- **二维码**: 包含验证链接
- **防篡改**: 内容哈希验证

## 安全机制

### 1. 行级安全 (RLS)
```sql
-- 发布者只能查看自己的证书
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
```

### 2. 数据完整性
- **内容哈希**: 防止数据篡改
- **证书密钥**: 唯一标识符
- **数字水印**: 离线验证支持

### 3. 访问控制
- **基于角色**: 用户、组织、管理员
- **基于组织**: 组织只能访问自己的证书
- **基于状态**: 证书状态控制访问权限

## 性能优化

### 1. 数据库索引
```sql
-- 证书表索引
CREATE INDEX idx_certificates_template_id ON certificates(template_id);
CREATE INDEX idx_certificates_publisher_id ON certificates(publisher_id);
CREATE INDEX idx_certificates_recipient_email ON certificates(recipient_email);
CREATE INDEX idx_certificates_certificate_key ON certificates(certificate_key);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_issued_at ON certificates(issued_at);
```

### 2. 缓存策略
- **模板缓存**: 减少数据库查询
- **PDF缓存**: 避免重复生成
- **验证缓存**: 提高验证速度

### 3. 批量操作
- **批量生成**: 减少API调用
- **批量验证**: 提高处理效率
- **异步处理**: 非阻塞操作

## 扩展性设计

### 1. 水平扩展
- **数据库**: Supabase 自动扩展
- **存储**: 分布式存储系统
- **计算**: 无服务器函数

### 2. 功能扩展
- **插件系统**: 支持自定义模板
- **API扩展**: RESTful API 设计
- **集成能力**: 第三方系统集成

### 3. 数据迁移
- **版本控制**: 数据库结构版本管理
- **向后兼容**: 保持API兼容性
- **数据备份**: 自动备份策略

## 监控和日志

### 1. 性能监控
- **响应时间**: API响应时间监控
- **错误率**: 错误统计和分析
- **资源使用**: CPU、内存、存储使用情况

### 2. 业务监控
- **证书生成**: 生成数量和成功率
- **验证统计**: 验证次数和成功率
- **用户行为**: 用户操作分析

### 3. 日志记录
```typescript
// 证书生成日志
const logCertificateGeneration = (certificateData) => {
  console.log('Certificate generated:', {
    certificateKey: certificateData.certificateKey,
    templateId: certificateData.templateId,
    publisherId: certificateData.publisherId,
    timestamp: new Date().toISOString()
  });
};
```

## 故障恢复

### 1. 数据备份
- **自动备份**: 每日自动备份
- **增量备份**: 减少备份时间
- **异地备份**: 数据安全保护

### 2. 灾难恢复
- **快速恢复**: 从备份恢复数据
- **服务降级**: 核心功能优先恢复
- **数据一致性**: 确保数据完整性

### 3. 错误处理
```typescript
// 错误处理策略
const handleCertificateError = (error) => {
  if (error.code === 'DUPLICATE_CERTIFICATE') {
    return handleDuplicateCertificate(error);
  }
  if (error.code === 'INVALID_TEMPLATE') {
    return handleInvalidTemplate(error);
  }
  return handleGenericError(error);
};
```

## 相关文档

- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md)
- [PDF生成系统](./07-PDF-GENERATION.md)
- [模板管理系统](./06-TEMPLATE-SYSTEM.md)
- [数据库初始化](./02-DATABASE-SETUP.md) 