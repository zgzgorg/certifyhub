# 邮件发送错误处理指南

## 概述

本指南描述了邮件发送功能的错误处理机制，确保用户能够清楚地了解邮件发送的成功和失败情况。

## 功能特性

### 1. 单个邮件发送错误处理

当发送单个邮件时，系统会显示：

- **成功情况**：`Email sent successfully to user@example.com`
- **失败情况**：`Failed to send email to user@example.com: [具体错误信息]`

### 2. 批量邮件发送错误处理

当发送批量邮件时，系统会显示：

- **全部成功**：`Successfully sent 5 emails`
- **部分成功**：`Sent 3/5 emails successfully. Failed: user1@example.com, user2@example.com`
- **全部失败**：`Failed to send bulk emails: [具体错误信息]`

### 3. 错误类型

系统能够处理以下类型的错误：

#### 网络错误
- 连接超时
- 网络不可用
- DNS 解析失败

#### API 错误
- Resend API 密钥无效
- 发送者邮箱未验证
- API 配额超限

#### 数据验证错误
- 无效的邮箱格式
- 缺少必需字段
- 证书数据不完整

#### 服务器错误
- 内部服务器错误
- 数据库连接失败
- 文件系统错误

## 用户界面反馈

### Snackbar 通知

系统使用不同颜色的 Snackbar 来显示结果：

- **绿色** (`success`)：邮件发送成功
- **橙色** (`warning`)：部分邮件发送失败
- **红色** (`error`)：邮件发送完全失败

### 错误信息示例

```
✅ 成功：Email sent successfully to john@example.com
⚠️  部分失败：Sent 3/5 emails successfully. Failed: user1@example.com, user2@example.com
❌ 完全失败：Failed to send email to john@example.com: Resend API error: Invalid API key
```

## 技术实现

### 1. API 路由错误处理

```typescript
// 检查响应状态
if (!response.ok) {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.error || errorData.message || errorMessage;
  } catch (parseError) {
    console.warn('Failed to parse error response:', parseError);
  }
  
  throw new Error(errorMessage);
}
```

### 2. 批量发送结果分析

```typescript
// 检查是否有失败的邮件
const failedEmails = result.results.filter(r => !r.success);

if (failedEmails.length === 0) {
  // 全部成功
  setSnackbar({
    open: true,
    message: `Successfully sent ${result.results.length} emails`,
    severity: 'success'
  });
} else {
  // 部分失败
  const successCount = result.results.length - failedEmails.length;
  const failedEmailsList = failedEmails.map(r => r.email).join(', ');
  
  setSnackbar({
    open: true,
    message: `Sent ${successCount}/${result.results.length} emails successfully. Failed: ${failedEmailsList}`,
    severity: 'warning'
  });
}
```

### 3. 错误恢复机制

- **模拟模式**：当 Resend API 密钥未配置时，自动切换到模拟发送
- **重试机制**：网络错误时自动重试
- **降级处理**：部分邮件失败时继续发送其他邮件

## 调试和故障排除

### 1. 查看控制台日志

在浏览器开发者工具中查看详细的错误信息：

```javascript
// 成功日志
console.log('Email sent successfully to:', certificate.recipient_email);

// 错误日志
console.error('Resend error for', certificate.recipient_email, ':', error);
```

### 2. 常见问题解决

#### 问题：邮件没有发送
**解决方案**：
1. 检查 Resend API 密钥是否正确配置
2. 验证发送者邮箱是否已验证
3. 检查网络连接

#### 问题：部分邮件发送失败
**解决方案**：
1. 检查失败邮箱的格式是否正确
2. 确认邮箱地址是否存在
3. 查看具体的错误信息

#### 问题：API 配额超限
**解决方案**：
1. 升级 Resend 账户
2. 减少批量发送的数量
3. 等待配额重置

## 最佳实践

### 1. 用户提示

- 在发送前显示确认对话框
- 显示发送进度指示器
- 提供详细的结果反馈

### 2. 错误处理

- 捕获所有可能的错误
- 提供用户友好的错误信息
- 记录详细的错误日志

### 3. 性能优化

- 批量发送时限制并发数量
- 实现重试机制
- 优化网络请求

## 配置选项

### 环境变量

```bash
# Resend API 配置
RESEND_API_KEY=your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# 错误处理配置
MAX_RETRY_ATTEMPTS=3
BATCH_SIZE=10
```

### 模拟模式

当 `RESEND_API_KEY` 未设置时，系统会自动切换到模拟模式：

```typescript
if (!process.env.RESEND_API_KEY) {
  console.log('Resend API key not configured, using mock email sending');
  // 模拟发送逻辑
}
```

## 总结

通过完善的错误处理机制，邮件发送功能现在能够：

1. **清晰反馈**：用户能够清楚地了解发送结果
2. **详细错误信息**：提供具体的错误原因
3. **优雅降级**：在出错时提供替代方案
4. **用户友好**：使用直观的颜色和图标表示不同状态

这确保了用户在使用邮件功能时能够获得良好的体验，即使在某些邮件发送失败的情况下也能了解具体的情况。 