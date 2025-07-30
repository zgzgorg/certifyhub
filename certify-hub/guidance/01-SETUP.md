# 项目设置指南

## 概述

本指南将帮助您快速设置和配置 CertifyHub 项目，包括环境配置、数据库设置和基本功能。

## 前置条件

- Node.js 18+ 
- npm 或 yarn
- Supabase 账户
- Git

## 1. 项目初始化

### 克隆项目
```bash
git clone <repository-url>
cd certifyhub/certify-hub
npm install
```

### 环境变量配置
创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Supabase 设置

### 创建项目
1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 获取项目 URL 和匿名密钥

### 数据库架构设置
运行以下 SQL 脚本：
- `database-schema.sql` - 基础表结构
- `create-certificates-table.sql` - 证书表
- `create-system-admin.sql` - 系统管理员

## 3. 功能模块

### 用户注册系统

#### 组织注册 (`/register/organization`)
- 完整的组织信息表单
- 邮箱验证
- 管理员审批流程
- 状态跟踪（待审核/已批准/已拒绝）

#### 普通用户注册 (`/register/user`)
- 简单用户注册
- 邮箱验证
- 即时激活

#### 登录系统 (`/login`)
- 邮箱/密码认证
- 支持组织和普通用户
- 自动角色检测

### 管理员面板

#### 组织管理 (`/admin/organizations`)
- 查看所有组织注册
- 批准/拒绝待审核组织
- 状态跟踪和管理

### 导航系统
- 动态导航栏显示用户状态
- 组织状态指示器
- 登录/登出功能

## 4. 用户角色

### 匿名用户
- 无需注册即可生成证书
- 模板访问受限

### 普通用户
- 完整姓名和邮箱注册
- 访问更多证书模板
- 个人仪表板（未来功能）

### 组织
- 完整的组织档案
- 需要管理员审批
- 证书颁发和验证功能（未来功能）

### 管理员
- 可以批准/拒绝组织注册
- 完整系统访问权限

## 5. 安全特性

- 行级安全 (RLS) 启用
- 用户特定数据访问策略
- 邮箱验证要求
- 基于密码的认证
- 基于角色的访问控制

## 6. 开发命令

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start
```

## 7. 下一步

1. **证书管理**
   - 组织证书模板
   - 证书颁发工作流
   - 证书验证系统

2. **用户仪表板**
   - 个人证书历史
   - 组织管理面板
   - 模板自定义

3. **邮件通知**
   - 管理员审批通知
   - 证书状态更新
   - 欢迎邮件

## 8. 故障排除

### 常见问题

1. **环境变量未设置**
   - 确保 `.env.local` 文件存在
   - 检查变量名称是否正确

2. **数据库连接失败**
   - 验证 Supabase URL 和密钥
   - 检查网络连接

3. **构建错误**
   - 清除 node_modules 并重新安装
   - 检查 Node.js 版本兼容性

## 9. 相关文档

- [数据库初始化](./02-DATABASE-SETUP.md)
- [部署指南](./03-DEPLOYMENT.md)
- [OAuth认证系统](./10-OAUTH-AUTHENTICATION.md) 