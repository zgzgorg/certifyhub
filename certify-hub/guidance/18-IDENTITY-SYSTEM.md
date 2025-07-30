# 身份系统 (Identity System)

## 概述

CertifyHub 实现了一个多身份系统，允许用户在不同的身份之间切换，每个身份具有不同的权限和功能。

## 身份类型

### 1. 个人身份 (Personal Identity)
- **定义**: 用户作为个人用户的基本身份
- **权限**: 
  - ✅ 分享模板
  - ✅ 生成证书
  - ✅ 查看收到的证书
  - ❌ 无法发布证书给他人
- **数据范围**: 只能访问自己创建的模板和收到的证书

### 2. 组织身份 (Organization Identity)
- **定义**: 用户作为组织管理员或所有者的身份
- **权限**:
  - ✅ 分享模板
  - ✅ 生成证书
  - ✅ 发布证书给他人
  - ✅ 管理组织模板
  - ✅ 查看组织发布的证书
- **数据范围**: 可以访问组织创建的模板和发布的证书

## 系统架构

### 核心组件

#### 1. IdentityContext (`src/contexts/IdentityContext.tsx`)
```typescript
interface UserIdentity {
  type: 'personal' | 'organization';
  id: string;
  name: string;
  role?: string;
  organization?: Organization;
}
```

**主要功能**:
- 管理当前活跃身份
- 构建可用身份列表
- 处理身份切换
- 持久化身份选择到 localStorage

#### 2. IdentitySelector (`src/components/IdentitySelector.tsx`)
**功能**: 提供身份切换的下拉选择器
- 显示当前身份
- 列出所有可用身份
- 支持身份切换

#### 3. 数据服务层
- **templateService**: 支持身份相关的模板查询
- **certificateService**: 支持身份相关的证书查询
- **organizationService**: 组织管理服务

## 页面行为

### 1. 导航栏 (NavigationBar)
- **身份选择器**: 显示当前身份，支持切换
- **不受影响**: Dashboard 和 Organizations 页面

### 2. 模板页面 (`/certificate/templates/`)
**行为**: 只显示当前身份拥有的模板
```typescript
// 个人身份: 显示 user_id 匹配且 organization_id 为 null 的模板
// 组织身份: 显示 organization_id 匹配的模板
```

**UI 显示**:
- 显示当前身份名称和角色
- 明确标注"只显示您拥有的模板"
- 模板创建时自动关联到当前身份

### 3. 证书生成页面 (`/certificate/generate/`)
**行为**: 显示当前身份拥有的模板 + 所有公共模板
```typescript
// 个人身份: 个人模板 + 公共模板
// 组织身份: 组织模板 + 公共模板
```

**UI 显示**:
- 显示当前身份信息
- 说明可见的模板类型
- 支持证书发布（仅组织身份）

### 4. 证书页面 (`/certificates/`)
**行为**: 根据身份类型显示不同内容

**个人身份**:
- 标题: "My Received Certificates"
- 显示: 收到的证书列表
- 操作: 仅查看和下载
- 列: 显示"Issuing Organization"

**组织身份**:
- 标题: "Certificates Issued by [组织名]"
- 显示: 发布的证书列表
- 操作: 编辑、删除、邮件发送
- 列: 显示"Recipient Email"

## 数据库设计

### 模板表 (templates)
```sql
ALTER TABLE templates
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
```

**字段说明**:
- `user_id`: 创建者用户ID
- `organization_id`: 关联的组织ID（NULL表示个人模板）
- `is_public`: 是否为公共模板

### 身份数据流
```typescript
// 个人身份模板查询
query.eq('user_id', identity.id).is('organization_id', null)

// 组织身份模板查询  
query.eq('organization_id', identity.id)

// 包含公共模板
query.or(`user_id.eq.${identity.id},is_public.eq.true`)
```

## 权限控制

### 模板权限
| 操作 | 个人身份 | 组织身份 |
|------|----------|----------|
| 查看自己的模板 | ✅ | ✅ |
| 查看组织模板 | ❌ | ✅ |
| 查看公共模板 | ✅ | ✅ |
| 创建模板 | ✅ | ✅ |
| 删除自己的模板 | ✅ | ✅ |
| 删除组织模板 | ❌ | ✅ |

### 证书权限
| 操作 | 个人身份 | 组织身份 |
|------|----------|----------|
| 生成证书 | ✅ | ✅ |
| 发布证书 | ❌ | ✅ |
| 查看收到的证书 | ✅ | ❌ |
| 查看发布的证书 | ❌ | ✅ |
| 编辑证书 | ❌ | ✅ |
| 删除证书 | ❌ | ✅ |

## 数据迁移

### 现有模板迁移
提供了多个迁移脚本选项：

1. **自动迁移** (`06-migrate-templates-to-organizations.sql`)
   - 自动将用户模板移动到其拥有的组织
   - 将无法移动的模板设为公共

2. **手动迁移** (`09-template-organization-migration.sql`)
   - 分步骤执行
   - 可预览迁移结果
   - 更安全的迁移方式

### 迁移步骤
```sql
-- 1. 查看当前状态
SELECT COUNT(*) FROM templates WHERE organization_id IS NULL;

-- 2. 预览迁移
SELECT t.name, o.name as org_name 
FROM templates t 
JOIN organizations o ON o.owner_id = t.user_id 
WHERE t.organization_id IS NULL;

-- 3. 执行迁移
UPDATE templates 
SET organization_id = (SELECT o.id FROM organizations o WHERE o.owner_id = templates.user_id LIMIT 1)
WHERE organization_id IS NULL 
AND EXISTS (SELECT 1 FROM organizations o WHERE o.owner_id = templates.user_id);
```

## 调试功能

### 调试日志
```typescript
// 启用身份调试
debug.identity('Current identity:', currentIdentity);
debug.identity('Available identities:', availableIdentities);
```

### 调试配置
```typescript
// 在 debug.ts 中启用
debugConfig.identity = true;
```

## 最佳实践

### 1. 身份切换
- 用户可以在任何时候切换身份
- 切换后立即更新相关页面数据
- 身份选择持久化到 localStorage

### 2. 数据隔离
- 严格按身份过滤数据
- 个人身份只能访问个人数据
- 组织身份只能访问组织数据

### 3. 权限验证
- 前端显示基于身份权限
- 后端API需要验证身份权限
- 防止越权访问

### 4. 用户体验
- 清晰的身份指示器
- 明确的功能权限说明
- 平滑的身份切换体验

## 故障排除

### 常见问题

1. **身份不显示**
   - 检查用户是否有关联的组织
   - 验证组织成员关系
   - 检查 localStorage 中的身份数据

2. **模板不显示**
   - 确认当前身份类型
   - 检查模板的 organization_id 设置
   - 验证用户权限

3. **证书权限错误**
   - 确认身份类型（个人/组织）
   - 检查证书的发布者信息
   - 验证用户角色权限

### 调试步骤
```typescript
// 1. 检查当前身份
console.log('Current identity:', currentIdentity);

// 2. 检查可用身份
console.log('Available identities:', availableIdentities);

// 3. 检查模板查询
console.log('Template query filters:', queryFilters);

// 4. 检查权限
console.log('User permissions:', userPermissions);
```

## 未来扩展

### 计划功能
1. **多组织成员**: 用户可以在多个组织中拥有不同角色
2. **角色权限**: 更细粒度的权限控制
3. **身份审计**: 记录身份切换和操作历史
4. **批量操作**: 支持跨身份的批量操作

### 技术改进
1. **缓存优化**: 身份相关的数据缓存策略
2. **性能优化**: 减少不必要的重新渲染
3. **错误处理**: 更完善的错误恢复机制
4. **测试覆盖**: 身份系统的完整测试套件

---

*最后更新: 2024年* 