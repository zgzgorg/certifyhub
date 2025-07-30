# 系统管理员权限设置指南

## 概述

本指南介绍如何在CertifyHub中设置和管理系统管理员权限。系统管理员拥有特殊的系统级权限，可以管理整个平台。

## 权限层级

### 1. 超级管理员 (Super Admin)
- **权限**: 拥有所有系统权限
- **功能**: 
  - 管理其他系统管理员
  - 查看和管理所有组织
  - 系统设置配置
  - 查看系统日志和统计

### 2. 管理员 (Admin)
- **权限**: 拥有大部分管理权限
- **功能**:
  - 管理组织审批
  - 查看系统统计
  - 管理用户
  - 管理模板和证书

### 3. 版主 (Moderator)
- **权限**: 有限的审核权限
- **功能**:
  - 审核组织申请
  - 查看基本统计
  - 管理内容

## 设置步骤

### 步骤1: 运行数据库脚本

在Supabase SQL Editor中执行以下脚本：

```sql
-- 运行 create-system-admin-fixed.sql 文件中的所有内容
-- 这将创建系统管理员表和相关的权限函数
-- 注意：使用修复版本以避免参数默认值错误
```

### 步骤2: 创建第一个超级管理员

在Supabase SQL Editor中执行：

```sql
-- 替换 'your-admin-user-id' 为实际的用户ID
INSERT INTO system_admins (user_id, role, created_by) 
VALUES ('your-admin-user-id', 'super_admin', 'your-admin-user-id');
```

### 步骤3: 验证设置

1. 登录到系统
2. 访问 `/admin` 页面
3. 确认可以看到管理员仪表板

## 权限管理

### 添加系统管理员

1. 访问 `/admin/system-admins` 页面
2. 点击 "Add System Admin" 按钮
3. 输入用户邮箱地址
4. 选择角色和权限
5. 点击 "Add System Administrator"

### 移除系统管理员

1. 在系统管理员列表中找到要移除的用户
2. 点击 "Remove" 按钮
3. 确认操作

## 权限常量

系统定义了以下权限常量：

```typescript
export const SYSTEM_PERMISSIONS = {
  MANAGE_ORGANIZATIONS: 'manage_organizations',
  MANAGE_USERS: 'manage_users',
  MANAGE_SYSTEM_ADMINS: 'manage_system_admins',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_TEMPLATES: 'manage_templates',
  MANAGE_CERTIFICATES: 'manage_certificates',
  VIEW_LOGS: 'view_logs',
  SYSTEM_SETTINGS: 'system_settings'
}
```

## 页面保护

### 使用 SystemAdminGuard 组件

```tsx
import SystemAdminGuard from '../../components/SystemAdminGuard';

export default function AdminPage() {
  return (
    <SystemAdminGuard requiredRole="admin" requiredPermission="manage_organizations">
      {/* 页面内容 */}
    </SystemAdminGuard>
  );
}
```

### 权限检查选项

- `requiredRole`: 'system_admin' | 'admin' | 'super_admin'
- `requiredPermission`: 特定权限字符串
- `redirectTo`: 重定向路径
- `fallback`: 自定义拒绝访问组件

## 数据库函数

### 权限检查函数

```sql
-- 检查用户是否是系统管理员
SELECT is_system_admin('user-id');

-- 检查用户是否是超级管理员
SELECT is_super_admin('user-id');

-- 检查用户是否是管理员或超级管理员
SELECT is_admin_or_super('user-id');

-- 获取用户的系统管理员角色
SELECT get_system_admin_role('user-id');

-- 检查特定权限
SELECT has_system_permission('user-id', 'manage_organizations');
```

### 管理函数

```sql
-- 添加系统管理员
SELECT add_system_admin('user-id', 'admin', '{"manage_organizations": true}');

-- 移除系统管理员
SELECT remove_system_admin('user-id');
```

## 安全注意事项

### 1. 权限最小化
- 只给用户必要的权限
- 定期审查权限分配
- 使用细粒度权限控制

### 2. 访问控制
- 所有管理员页面都使用 SystemAdminGuard 保护
- 在API层面也进行权限验证
- 记录所有管理员操作

### 3. 审计日志
- 记录权限变更
- 记录管理员操作
- 定期审查日志

## 故障排除

### 常见问题

1. **无法访问管理员页面**
   - 检查用户是否在 system_admins 表中
   - 确认角色和权限设置正确
   - 检查 RLS 策略是否正确

2. **权限检查失败**
   - 确认数据库函数存在
   - 检查用户ID是否正确
   - 验证权限字符串格式

3. **无法添加系统管理员**
   - 确认当前用户是超级管理员
   - 检查目标用户是否存在
   - 验证权限参数格式

### 调试步骤

1. 检查用户认证状态
2. 验证数据库连接
3. 测试权限检查函数
4. 查看浏览器控制台错误
5. 检查Supabase日志

## 最佳实践

### 1. 权限设计
- 使用角色和权限的组合
- 实现最小权限原则
- 定期审查权限分配

### 2. 用户管理
- 及时移除离职管理员
- 定期更新管理员信息
- 实施多因素认证

### 3. 监控和审计
- 记录所有管理员操作
- 定期审查访问日志
- 实施异常检测

## 扩展功能

### 1. 自定义权限
可以添加新的权限常量：

```typescript
export const CUSTOM_PERMISSIONS = {
  MANAGE_BILLING: 'manage_billing',
  EXPORT_DATA: 'export_data',
  // ... 更多权限
};
```

### 2. 权限组
可以创建权限组来简化管理：

```typescript
export const PERMISSION_GROUPS = {
  BASIC_ADMIN: ['manage_organizations', 'view_analytics'],
  FULL_ADMIN: ['manage_organizations', 'manage_users', 'manage_system_admins'],
  // ... 更多权限组
};
```

### 3. 动态权限
可以实现基于条件的动态权限：

```typescript
// 根据组织状态动态调整权限
const getDynamicPermissions = (organization: Organization) => {
  if (organization.status === 'approved') {
    return ['manage_certificates', 'manage_templates'];
  }
  return ['view_analytics'];
};
```

## 总结

系统管理员权限系统提供了灵活且安全的权限管理机制。通过合理的权限设计和严格的访问控制，可以确保系统的安全性和可维护性。

记住：
- 定期审查权限分配
- 记录所有管理员操作
- 实施最小权限原则
- 保持权限系统的简洁性 