# CertifyHub 开发指南

## 📚 文档目录

### 🚀 快速开始
- [项目设置指南](./01-SETUP.md) - 完整的项目初始化和配置
- [数据库初始化](./02-DATABASE-SETUP.md) - 数据库架构和初始数据设置
- [部署指南](./03-DEPLOYMENT.md) - 生产环境部署说明

### 🏗️ 核心功能开发
- [证书系统架构](./04-CERTIFICATE-ARCHITECTURE.md) - 证书存储和验证系统设计
- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md) - 证书颁发流程和实现
- [模板管理系统](./06-TEMPLATE-SYSTEM.md) - 证书模板创建和管理
- [PDF生成系统](./07-PDF-GENERATION.md) - PDF证书生成和优化

### 📧 通知系统
- [邮件通知系统](./08-EMAIL-SYSTEM.md) - 邮件发送和批量通知功能
- [邮件错误处理](./09-EMAIL-ERROR-HANDLING.md) - 邮件发送异常处理和重试机制

### 🔐 认证与安全
- [OAuth认证系统](./10-OAUTH-AUTHENTICATION.md) - Google OAuth集成和认证流程
- [身份系统](./18-IDENTITY-SYSTEM.md) - 多身份切换和权限管理系统
- [系统安全配置](./11-SECURITY.md) - 安全策略和最佳实践
- [系统管理员设置](./12-SYSTEM-ADMIN.md) - 管理员权限和功能

### 🛠️ 开发工具
- [调试指南](./13-DEBUG.md) - 常见问题和调试技巧
- [数据库迁移](./14-DATABASE-MIGRATION.md) - 数据库结构变更和迁移

### 📋 功能特性
- [批量操作优化](./15-BULK-OPERATIONS.md) - 批量证书生成和邮件发送优化
- [证书详情页面](./16-CERTIFICATE-DETAILS.md) - 证书展示、验证和管理页面
- [模板元数据管理](./17-TEMPLATE-METADATA.md) - 模板元数据编辑、验证和应用

## 🎯 开发流程

### 新功能开发
1. 查看相关功能文档
2. 了解数据库结构
3. 实现功能代码
4. 测试和调试
5. 更新文档

### 问题排查
1. 查看 [调试指南](./13-DEBUG.md)
2. 检查相关功能文档
3. 查看错误处理文档
4. 联系开发团队

## 📝 文档维护

- 所有新功能必须更新相应文档
- 重大变更需要更新架构文档
- 定期检查和更新过时信息
- 保持文档结构的一致性

## 🔗 相关资源

- [项目主页](../README.md)
- [API文档](../src/app/api/)
- [组件文档](../src/components/)
- [类型定义](../src/types/) 