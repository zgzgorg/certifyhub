# 证书颁发功能

## 概述

证书颁发功能允许已验证的组织直接将证书发布到数据库，而不仅仅是生成PDF文件。此功能仅对状态为"已批准"的组织可用，但对所有用户可见，以鼓励组织注册并展示平台功能。

## 功能特性

### 1. 证书颁发模式切换

- **位置**: 批量生成模态框
- **可用性**: 所有用户可见，但仅对已验证组织（状态：已批准）有效
- **描述**: 启用证书颁发模式的切换开关
- **非组织用户**: 可以看到功能但被禁用，显示注册组织的号召性用语

### 2. 接收者邮箱字段

启用证书颁发模式时：
- 批量生成表格中出现新的"接收者邮箱"列
- 此字段对所有行都是**必需的**（对于已验证组织）
- 强制执行邮箱验证
- 字段标记为红色"必需"标签
- **非组织用户**: 字段可见但被禁用，显示组织要求的占位符文本

**Excel导入支持:**
- Excel文件可以包含"接收者邮箱"列
- 列标题必须完全是"接收者邮箱"
- 此字段在Excel中是可选的 - 如果未提供，用户可以手动填写
- 粘贴和文件上传方法都支持此字段

### 3. 颁发证书按钮

- **外观**: 带有验证图标的绿色按钮
- **文本**: "颁发证书"（而不是"批量导出PDF (ZIP)"）
- **功能**: 在数据库中创建证书记录并生成PDF文件
- **PDF生成**: 自动生成PDF证书并存储在Supabase Storage中
- **非组织用户**: 按钮可见但被禁用，显示组织要求的工具提示

### 4. 验证

颁发证书前：
- 所有字段必须填写（无空值）
- 接收者邮箱必须有效
- 必须选择模板

### 5. 重复检测

系统自动基于以下条件检测重复证书：
- 模板ID
- 发布者ID
- 接收者邮箱
- 元数据值

### 6. 重复处理

检测到重复时：
- 对话框显示重复证书列表
- 用户可以选择：
  - **更新重复**: 用新数据替换现有证书
  - **跳过重复**: 保持现有证书不变
  - **取消**: 中止操作

### 7. 成功消息

成功颁发后：
- 显示颁发的证书数量
- 提示用户查看"证书"页面
- 提供重复处理的反馈

## 数据库集成

### 证书存储

证书存储在`certificates`表中，包含：
- 唯一证书密钥（SHA256哈希）
- 内容哈希用于完整性验证
- 水印数据用于离线验证
- PDF URL链接到Supabase Storage中生成的PDF文件

### PDF生成和存储

颁发证书时：
1. **PDF生成**: 使用与批量导出相同的模板渲染创建专业PDF证书
2. **模板渲染**: 使用CertificatePreview组件和html2canvas、jsPDF进行高质量输出
3. **内容**: 包含所有模板字段、元数据值和正确格式
4. **存储**: 将PDF上传到名为'certificates'的Supabase Storage桶
5. **命名**: PDF使用证书密钥命名（例如`{certificateKey}.pdf`）
6. **访问**: PDF通过存储的URL公开访问
7. **更新**: 更新证书时，生成新PDF并替换旧PDF
8. **一致性**: 生成的PDF与模板预览和批量导出格式完全匹配

### 证书验证

- 公共验证页面: `/verify/[certificateKey]`
- 显示证书详情和状态
- 验证证书真实性

## 用户界面

### 导航
- 证书页面显示颁发的证书列表
- 每个证书显示状态、颁发日期和验证链接
- 支持搜索和筛选功能

### 批量操作
- 选择多个证书进行批量操作
- 批量邮件通知
- 批量状态更新

## 实现细节

### 组件结构
```typescript
// 批量生成模态框
<BulkGenerationModal>
  <CertificateIssueToggle />
  <RecipientEmailField />
  <IssueCertificatesButton />
</BulkGenerationModal>

// 证书列表
<CertificatesList>
  <CertificateItem />
  <CertificateActions />
</CertificatesList>
```

### API路由
```typescript
// 颁发证书API
POST /api/issue-certificates
{
  templateId: string,
  certificates: Array<{
    recipientEmail: string,
    metadataValues: object
  }>
}

// 响应
{
  success: boolean,
  issuedCount: number,
  duplicates: Array<Certificate>,
  errors: Array<Error>
}
```

### 状态管理
```typescript
// 证书颁发状态
interface CertificateIssuanceState {
  isIssuing: boolean;
  issuedCount: number;
  duplicates: Certificate[];
  errors: Error[];
}
```

## 安全考虑

### 权限控制
- 仅已验证组织可以颁发证书
- 组织只能颁发自己的证书
- 管理员可以查看所有证书

### 数据验证
- 邮箱格式验证
- 必填字段检查
- 模板有效性验证

### 防重复机制
- 基于多个字段的唯一性检查
- 用户确认重复处理
- 审计日志记录

## 性能优化

### 批量处理
- 批量数据库插入
- 异步PDF生成
- 进度跟踪和反馈

### 缓存策略
- 模板缓存减少渲染时间
- PDF缓存避免重复生成
- 验证结果缓存

### 错误处理
- 优雅的错误处理
- 部分成功处理
- 详细的错误报告

## 监控和分析

### 使用统计
- 颁发的证书数量
- 成功率统计
- 用户行为分析

### 性能监控
- 颁发时间统计
- 错误率监控
- 资源使用情况

### 审计日志
```typescript
// 颁发日志
const logCertificateIssuance = (data) => {
  console.log('Certificate issued:', {
    templateId: data.templateId,
    publisherId: data.publisherId,
    recipientCount: data.recipients.length,
    timestamp: new Date().toISOString()
  });
};
```

## 故障排除

### 常见问题

1. **颁发失败**
   - 检查组织状态是否为"已批准"
   - 验证所有必填字段
   - 检查邮箱格式

2. **PDF生成失败**
   - 检查模板有效性
   - 验证存储权限
   - 检查网络连接

3. **重复检测问题**
   - 检查重复检测逻辑
   - 验证唯一性约束
   - 查看数据库索引

## 相关文档

- [证书系统架构](./04-CERTIFICATE-ARCHITECTURE.md)
- [PDF生成系统](./07-PDF-GENERATION.md)
- [模板管理系统](./06-TEMPLATE-SYSTEM.md)
- [邮件通知系统](./08-EMAIL-SYSTEM.md) 