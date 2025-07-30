# 数据库迁移指南：组织成员系统

## 概述

本指南记录了从原有的用户角色系统迁移到新的组织成员系统的完整步骤。新系统支持：
- 所有用户都是平等的（无全局角色）
- 用户可以在多个组织中拥有不同角色
- 一个组织有一个owner，多个admin
- 灵活的权限管理

## 迁移前准备

### 1. 备份数据
```sql
-- 在Supabase SQL Editor中执行以下查询来备份关键数据
SELECT * FROM organizations;
SELECT * FROM regular_users;
SELECT * FROM auth.users;
```

### 2. 确认当前状态
```sql
-- 检查现有数据
SELECT COUNT(*) as organization_count FROM organizations;
SELECT COUNT(*) as regular_user_count FROM regular_users;
```

## 迁移步骤

### 步骤1：创建组织成员表

```sql
-- 创建组织成员表
CREATE TABLE organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- 创建索引
CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);

-- 启用RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Members can view organization members" ON organization_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members om2
    WHERE om2.organization_id = organization_members.organization_id
    AND om2.user_id = auth.uid()
  )
);

CREATE POLICY "Owners and admins can manage members" ON organization_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om2
    WHERE om2.organization_id = organization_members.organization_id
    AND om2.user_id = auth.uid()
    AND om2.role IN ('owner', 'admin')
  )
);

-- 创建触发器
CREATE TRIGGER update_organization_members_updated_at 
  BEFORE UPDATE ON organization_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 步骤2：修改organizations表

```sql
-- 添加owner_id字段
ALTER TABLE organizations ADD COLUMN owner_id UUID REFERENCES auth.users(id);

-- 设置默认值（将现有的user_id设为owner_id）
UPDATE organizations 
SET owner_id = user_id 
WHERE owner_id IS NULL;

-- 添加created_by字段（可选，用于记录创建者）
ALTER TABLE organizations ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- 设置created_by默认值
UPDATE organizations 
SET created_by = user_id 
WHERE created_by IS NULL;
```

### 步骤3：迁移现有数据

```sql
-- 为现有组织创建owner关系
INSERT INTO organization_members (organization_id, user_id, role)
SELECT id, user_id, 'owner' FROM organizations
ON CONFLICT (organization_id, user_id) DO NOTHING;
```

### 步骤4：删除不再需要的表

```sql
-- 删除regular_users表（如果存在）
DROP TABLE IF EXISTS regular_users CASCADE;
```

### 步骤5：更新RLS策略

```sql
-- 删除旧的简化策略
DROP POLICY IF EXISTS "Enable all operations for organizations" ON organizations;
DROP POLICY IF EXISTS "Enable all operations for regular users" ON regular_users;

-- 创建新的organizations策略
CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage their organizations" ON organizations
FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Admins can view organization details" ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

### 步骤6：创建辅助函数

```sql
-- 获取用户在组织中的角色
CREATE OR REPLACE FUNCTION get_user_role_in_organization(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM organization_members 
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否是组织owner
CREATE OR REPLACE FUNCTION is_organization_owner(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role_in_organization(p_user_id, p_organization_id) = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否是组织admin或owner
CREATE OR REPLACE FUNCTION is_organization_admin(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(20);
BEGIN
  user_role := get_user_role_in_organization(p_user_id, p_organization_id);
  RETURN user_role IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 验证迁移结果

### 1. 检查组织成员数据
```sql
-- 检查组织成员数据
SELECT 
  o.name as organization_name,
  om.role,
  u.email as user_email
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN auth.users u ON om.user_id = u.id
ORDER BY o.name, om.role;
```

### 2. 检查是否有组织没有owner
```sql
-- 检查是否有组织没有owner
SELECT 
  id,
  name,
  owner_id
FROM organizations 
WHERE owner_id IS NULL;
```

### 3. 检查索引是否创建成功
```sql
-- 检查索引是否创建成功
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN ('organizations', 'organization_members')
ORDER BY tablename, indexname;
```

### 4. 测试辅助函数
```sql
-- 测试辅助函数（替换为实际的user_id和organization_id）
SELECT get_user_role_in_organization('your-user-id', 'your-org-id');
SELECT is_organization_owner('your-user-id', 'your-org-id');
SELECT is_organization_admin('your-user-id', 'your-org-id');
```

## 新系统特性

### 1. 用户角色
- **无全局角色**：所有用户都是平等的
- **组织内角色**：owner、admin、member

### 2. 权限层级
- **Owner**：可以删除组织、转让所有权、管理所有成员
- **Admin**：可以管理成员、发布证书、查看组织数据
- **Member**：可以查看组织信息、使用组织模板

### 3. 多组织支持
- 一个用户可以是多个组织的成员
- 在不同组织中可以有不同的角色
- 通过`organization_members`表管理关系

## 回滚计划

如果迁移出现问题，可以执行以下回滚操作：

```sql
-- 1. 恢复organizations表
ALTER TABLE organizations DROP COLUMN IF EXISTS owner_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS created_by;

-- 2. 删除organization_members表
DROP TABLE IF EXISTS organization_members CASCADE;

-- 3. 恢复regular_users表（如果有备份）
-- 从备份中恢复数据

-- 4. 恢复RLS策略
-- 重新运行database-schema.sql中的策略
```

## 注意事项

1. **备份重要**：迁移前必须备份所有数据
2. **测试环境**：建议先在测试环境执行
3. **停机时间**：迁移过程中可能需要短暂停机
4. **数据一致性**：确保所有外键关系正确
5. **权限验证**：迁移后测试所有权限功能

## 后续工作

1. **更新前端代码**：适配新的数据库结构
2. **测试功能**：验证所有组织管理功能
3. **用户培训**：更新用户界面和流程
4. **监控**：监控系统性能和错误日志 