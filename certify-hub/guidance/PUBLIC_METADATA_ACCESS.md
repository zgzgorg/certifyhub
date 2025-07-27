# Public Template Metadata Access

## 问题描述

未登录用户无法访问public模板的元数据，导致在证书生成页面无法正确加载模板的字段配置信息。

## 问题原因

1. **认证要求**：`loadTemplateMetadata` 函数要求用户必须登录才能查询元数据
2. **RLS策略限制**：数据库的Row Level Security策略可能阻止未认证用户访问元数据
3. **Hook限制**：`useTemplateMetadata` hook 要求用户认证才能执行查询

## 解决方案

### 1. 更新数据库RLS策略

运行以下SQL脚本来更新 `template_metadata` 表的访问策略：

```sql
-- 在 Supabase SQL Editor 中运行 update-metadata-policies.sql
```

这个脚本会：
- 删除简化的开发策略
- 创建允许未登录用户访问public模板默认元数据的策略
- 保持认证用户对自己元数据的完全控制

### 2. 修改前端代码

#### A. 更新 useTemplateMetadata Hook

添加了两个新函数：
- `getPublicTemplateMetadata()`: 获取public模板的元数据（无需认证）
- `getUserDefaultMetadata()`: 获取用户的默认元数据（需要认证）

#### B. 更新证书生成页面

修改了 `loadTemplateMetadata` 函数：
- 移除了用户认证要求
- 优先使用用户的默认元数据（如果已登录）
- 回退到public模板的默认元数据
- 最后使用系统默认字段

### 3. 测试验证

访问 `/test-public-metadata` 页面来验证：
- 未登录用户是否可以访问public模板
- 未登录用户是否可以访问public模板的元数据
- 数据是否正确加载

## 实现细节

### 数据库策略

```sql
-- 允许未登录用户读取public模板的默认元数据
CREATE POLICY "Public can read default metadata for public templates" ON template_metadata
  FOR SELECT USING (
    is_default = true AND
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_metadata.template_id 
      AND templates.is_public = true
    )
  );
```

### 前端逻辑

```typescript
// 1. 如果用户已登录，尝试获取用户的默认元数据
if (user) {
  const userMetadata = await getUserDefaultMetadata(templateId);
  if (userMetadata) {
    // 使用用户的元数据
    return;
  }
}

// 2. 尝试获取public模板的默认元数据
const publicMetadata = await getPublicTemplateMetadata(templateId);
if (publicMetadata) {
  // 使用public元数据
  return;
}

// 3. 使用系统默认字段
```

## 安全考虑

1. **只读访问**：未登录用户只能读取元数据，不能修改
2. **范围限制**：只能访问public模板的默认元数据
3. **用户隔离**：认证用户只能访问自己的元数据
4. **数据完整性**：保持现有的用户权限控制

## 部署步骤

1. **更新数据库策略**：
   ```bash
   # 在 Supabase SQL Editor 中运行
   \i update-metadata-policies.sql
   ```

2. **部署前端代码**：
   ```bash
   npm run build
   npm run deploy
   ```

3. **测试功能**：
   - 访问 `/test-public-metadata` 验证数据库访问
   - 访问 `/certificate/generate` 验证功能正常
   - 测试未登录用户使用public模板

## 故障排除

### 如果仍然无法访问元数据

1. **检查RLS策略**：
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'template_metadata';
   ```

2. **检查模板状态**：
   ```sql
   SELECT id, name, is_public FROM templates WHERE is_public = true;
   ```

3. **检查元数据存在**：
   ```sql
   SELECT tm.*, t.name as template_name 
   FROM template_metadata tm 
   JOIN templates t ON tm.template_id = t.id 
   WHERE t.is_public = true AND tm.is_default = true;
   ```

### 常见错误

- **PGRST116**: 没有找到数据 - 检查模板是否为public且有默认元数据
- **PGRST403**: 权限被拒绝 - 检查RLS策略是否正确应用
- **网络错误**: 检查Supabase连接配置

## 后续优化

1. **缓存机制**：为public元数据添加客户端缓存
2. **批量加载**：优化多个模板的元数据加载
3. **错误处理**：改进错误提示和回退机制
4. **性能监控**：添加访问统计和性能指标 