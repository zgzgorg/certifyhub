# 模板上传故障排除指南

## 常见错误及解决方案

### 1. "Bucket not found" 错误

**错误信息**: `{statusCode: '404', error: 'Bucket not found', message: 'Bucket not found'}`

**原因**: Supabase Storage 中没有名为 `templates` 的 bucket

**解决方案**:
1. 登录 Supabase 控制台
2. 进入 Storage 页面
3. 点击 "New bucket"
4. 输入名称: `templates`
5. 设置为 Public
6. 点击 "Create bucket"

或者运行 SQL 脚本:
```sql
-- 在 Supabase SQL Editor 中运行
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;
```

### 2. "Upload error: {}" 错误

**错误信息**: 空对象错误

**原因**: 可能是权限问题或 bucket 配置错误

**解决方案**:
1. 确保用户已登录
2. 检查 bucket 是否存在
3. 验证存储策略是否正确

### 3. 权限错误

**错误信息**: `permission denied` 或 `unauthorized`

**解决方案**:
1. 确保用户已通过 Supabase Auth 认证
2. 检查 RLS (Row Level Security) 策略
3. 验证存储策略是否正确配置

## 测试步骤

### 步骤 1: 验证 Supabase 连接
访问 `/test-connection` 页面检查基本连接

### 步骤 2: 测试 Storage
访问 `/test-storage` 页面运行存储测试

### 步骤 3: 检查数据库表
确保 `templates` 表已创建:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'templates';
```

### 步骤 4: 检查 bucket
确保 `templates` bucket 存在:
```sql
SELECT * FROM storage.buckets 
WHERE id = 'templates';
```

## 调试技巧

### 1. 启用详细日志
在浏览器控制台中查看详细的错误信息

### 2. 检查网络请求
在浏览器开发者工具的 Network 标签中查看失败的请求

### 3. 验证环境变量
确保 `.env.local` 文件中的 Supabase 配置正确:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 测试认证状态
确保用户已正确登录:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```

## 常见配置问题

### 1. 存储策略配置
确保以下策略已创建:
```sql
-- 公开读取
CREATE POLICY "Templates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates');

-- 认证用户上传
CREATE POLICY "Authenticated users can upload templates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'templates' 
    AND auth.role() = 'authenticated'
  );
```

### 2. 文件大小限制
确保 bucket 的文件大小限制足够:
```sql
UPDATE storage.buckets 
SET file_size_limit = 10485760 
WHERE id = 'templates';
```

### 3. 允许的文件类型
确保 bucket 允许上传的文件类型:
```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] 
WHERE id = 'templates';
```

## 联系支持

如果问题仍然存在，请提供以下信息:
1. 错误信息的完整截图
2. 浏览器控制台的错误日志
3. Supabase 项目的 URL
4. 测试页面的结果 