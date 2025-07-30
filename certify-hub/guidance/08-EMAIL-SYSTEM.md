# 邮件通知系统

## 概述

邮件通知系统允许组织向证书接收者发送邮件通知，包括个人和批量邮件发送功能。系统支持多种邮件服务提供商，提供可靠的邮件发送和错误处理机制。

## 功能特性

### 1. 个人邮件通知
- 向单个证书接收者发送邮件通知
- 包含证书详情、验证链接和PDF下载链接
- 通过证书表格中的邮件图标按钮访问

### 2. 批量邮件通知
- 同时向多个证书接收者发送邮件通知
- 批量选择功能，支持全选
- 进度跟踪和结果报告
- 通过主证书页面的"发送邮件通知"按钮访问

### 3. 邮件内容

每封邮件通知包含：
- 证书模板名称
- 颁发日期
- 证书ID和状态
- 证书验证URL
- PDF下载链接（如果可用）
- 组织品牌和联系信息

## 实现细节

### 组件结构
```typescript
// 邮件通知模态框
<EmailNotificationModal>
  <EmailTemplate />
  <RecipientList />
  <SendButton />
  <ProgressIndicator />
</EmailNotificationModal>

// 邮件服务钩子
const useEmailNotifications = () => {
  // 邮件发送逻辑
  const sendEmail = async (certificateId: string) => {
    // 发送单个邮件
  };
  
  const sendBulkEmails = async (certificateIds: string[]) => {
    // 批量发送邮件
  };
};
```

### API路由
```typescript
// 单个邮件发送
POST /api/send-certificate-email
{
  certificateId: string,
  recipientEmail: string
}

// 批量邮件发送
POST /api/send-bulk-certificate-emails
{
  certificateIds: string[],
  recipientEmails: string[]
}
```

### 邮件模板
邮件使用响应式HTML模板，包含：
- 专业样式的渐变标题
- 组织化的证书详情部分
- 验证和下载的操作按钮
- 重要信息部分
- 组织品牌

## 邮件服务集成

### 当前实现
系统目前使用模拟邮件发送。要集成真实邮件服务：

#### 1. SendGrid集成
```typescript
// 在 emailService.ts 中
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to: string, subject: string, html: string) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject,
    html
  };
  
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, error: error.message };
  }
};
```

#### 2. AWS SES集成
```typescript
// 在 emailService.ts 中
import AWS from 'aws-sdk';
const ses = new AWS.SES({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const sendEmail = async (to: string, subject: string, html: string) => {
  const params = {
    Source: process.env.FROM_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } }
    }
  };
  
  try {
    await ses.sendEmail(params).promise();
    return { success: true };
  } catch (error) {
    console.error('SES error:', error);
    return { success: false, error: error.message };
  }
};
```

#### 3. Nodemailer集成
```typescript
// 在 emailService.ts 中
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html
    });
    return { success: true };
  } catch (error) {
    console.error('Nodemailer error:', error);
    return { success: false, error: error.message };
  }
};
```

## 环境变量配置

### 必需的环境变量
```env
# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# AWS SES
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 通用
FROM_EMAIL=noreply@yourdomain.com
```

## 错误处理

### 1. 邮件发送错误
```typescript
// 错误处理策略
const handleEmailError = (error: any) => {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    return {
      type: 'RATE_LIMIT',
      message: '发送频率过高，请稍后重试',
      retryAfter: error.retryAfter
    };
  }
  
  if (error.code === 'INVALID_EMAIL') {
    return {
      type: 'INVALID_EMAIL',
      message: '邮箱地址格式无效',
      email: error.email
    };
  }
  
  return {
    type: 'GENERIC_ERROR',
    message: '邮件发送失败，请稍后重试',
    error: error.message
  };
};
```

### 2. 批量发送错误处理
```typescript
// 批量发送结果
interface BulkEmailResult {
  total: number;
  successful: number;
  failed: number;
  errors: EmailError[];
}

const sendBulkEmails = async (certificates: Certificate[]): Promise<BulkEmailResult> => {
  const results: BulkEmailResult = {
    total: certificates.length,
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (const certificate of certificates) {
    try {
      await sendEmail(certificate.recipientEmail, certificate);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        certificateId: certificate.id,
        email: certificate.recipientEmail,
        error: error.message
      });
    }
  }
  
  return results;
};
```

### 3. 重试机制
```typescript
// 指数退避重试
const sendEmailWithRetry = async (email: string, data: any, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(email, data);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 指数退避延迟
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

## 性能优化

### 1. 批量发送优化
```typescript
// 并发批量发送
const sendBulkEmailsConcurrent = async (certificates: Certificate[], concurrency = 5) => {
  const chunks = chunk(certificates, concurrency);
  const results: BulkEmailResult[] = [];
  
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(certificate => 
      sendEmail(certificate.recipientEmail, certificate)
    );
    
    const chunkResults = await Promise.allSettled(chunkPromises);
    results.push(processChunkResults(chunkResults));
  }
  
  return mergeResults(results);
};
```

### 2. 队列处理
```typescript
// 邮件队列
class EmailQueue {
  private queue: EmailJob[] = [];
  private processing = false;
  
  addJob(job: EmailJob) {
    this.queue.push(job);
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        try {
          await this.processJob(job);
        } catch (error) {
          console.error('Job processing error:', error);
        }
      }
    }
    
    this.processing = false;
  }
}
```

### 3. 缓存策略
```typescript
// 邮件模板缓存
const emailTemplateCache = new Map<string, string>();

const getEmailTemplate = async (templateId: string): Promise<string> => {
  if (emailTemplateCache.has(templateId)) {
    return emailTemplateCache.get(templateId)!;
  }
  
  const template = await fetchEmailTemplate(templateId);
  emailTemplateCache.set(templateId, template);
  return template;
};
```

## 监控和分析

### 1. 发送统计
```typescript
// 邮件发送统计
interface EmailStats {
  totalSent: number;
  successful: number;
  failed: number;
  rateLimitHits: number;
  averageResponseTime: number;
}

const trackEmailStats = (result: EmailResult) => {
  // 更新统计数据
  stats.totalSent++;
  if (result.success) {
    stats.successful++;
  } else {
    stats.failed++;
  }
  
  // 记录响应时间
  stats.averageResponseTime = 
    (stats.averageResponseTime * (stats.totalSent - 1) + result.responseTime) / stats.totalSent;
};
```

### 2. 错误监控
```typescript
// 错误监控
const monitorEmailErrors = (error: EmailError) => {
  console.error('Email error:', {
    type: error.type,
    message: error.message,
    timestamp: new Date().toISOString(),
    email: error.email,
    certificateId: error.certificateId
  });
  
  // 发送错误报告
  if (error.type === 'CRITICAL') {
    sendErrorReport(error);
  }
};
```

## 使用指南

### 发送单个邮件
1. 导航到证书页面
2. 点击任何证书旁边的邮件图标
3. 邮件通知模态框将打开
4. 点击模态框中的邮件图标发送个人通知

### 发送批量邮件
1. 导航到证书页面
2. 点击"发送邮件通知"按钮
3. 使用复选框或"全选"选择证书
4. 点击"发送X封邮件"发送批量通知
5. 在模态框中查看结果

## 故障排除

### 常见问题

1. **邮件发送失败**
   - 检查邮件服务配置
   - 验证环境变量
   - 检查网络连接

2. **批量发送超时**
   - 减少并发数量
   - 增加超时时间
   - 检查邮件服务限制

3. **邮件被标记为垃圾邮件**
   - 配置SPF记录
   - 设置DKIM签名
   - 使用可信的邮件服务

## 相关文档

- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md)
- [证书系统架构](./04-CERTIFICATE-ARCHITECTURE.md)
- [调试指南](./13-DEBUG.md) 