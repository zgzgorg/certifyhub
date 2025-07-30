# 邮件错误处理指南

## 概述

本指南详细说明了 CertifyHub 邮件系统的错误处理机制，包括错误类型、重试策略、监控和故障排除。

## 错误类型分类

### 1. 网络连接错误
```typescript
interface NetworkError {
  type: 'NETWORK_ERROR';
  code: 'CONNECTION_TIMEOUT' | 'DNS_RESOLUTION_FAILED' | 'NETWORK_UNREACHABLE';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}
```

### 2. 认证错误
```typescript
interface AuthenticationError {
  type: 'AUTHENTICATION_ERROR';
  code: 'INVALID_API_KEY' | 'EXPIRED_TOKEN' | 'INSUFFICIENT_PERMISSIONS';
  message: string;
  retryable: boolean;
  requiresReconfiguration: boolean;
}
```

### 3. 速率限制错误
```typescript
interface RateLimitError {
  type: 'RATE_LIMIT_ERROR';
  code: 'RATE_LIMIT_EXCEEDED' | 'QUOTA_EXCEEDED';
  message: string;
  retryable: true;
  retryAfter: number;
  limit: number;
  remaining: number;
}
```

### 4. 邮箱格式错误
```typescript
interface EmailFormatError {
  type: 'EMAIL_FORMAT_ERROR';
  code: 'INVALID_EMAIL_FORMAT' | 'DOMAIN_NOT_FOUND' | 'DISPOSABLE_EMAIL';
  message: string;
  email: string;
  retryable: false;
}
```

### 5. 服务提供商错误
```typescript
interface ProviderError {
  type: 'PROVIDER_ERROR';
  code: 'SERVICE_UNAVAILABLE' | 'MAINTENANCE_MODE' | 'INTERNAL_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
  provider: 'RESEND' | 'SENDGRID' | 'SMTP';
}
```

## 错误处理策略

### 1. 分层错误处理

```typescript
class EmailErrorHandler {
  static handleError(error: any): EmailErrorResult {
    // 1. 网络错误处理
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error);
    }
    
    // 2. 认证错误处理
    if (this.isAuthenticationError(error)) {
      return this.handleAuthenticationError(error);
    }
    
    // 3. 速率限制处理
    if (this.isRateLimitError(error)) {
      return this.handleRateLimitError(error);
    }
    
    // 4. 邮箱格式错误
    if (this.isEmailFormatError(error)) {
      return this.handleEmailFormatError(error);
    }
    
    // 5. 服务提供商错误
    if (this.isProviderError(error)) {
      return this.handleProviderError(error);
    }
    
    // 6. 通用错误处理
    return this.handleGenericError(error);
  }
}
```

### 2. 重试机制

#### 指数退避重试
```typescript
const sendEmailWithRetry = async (
  email: string, 
  data: EmailData, 
  maxRetries = 3,
  baseDelay = 1000
): Promise<EmailResult> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(email, data);
    } catch (error) {
      lastError = error as Error;
      
      // 检查是否可重试
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // 计算延迟时间
      const delay = baseDelay * Math.pow(2, attempt);
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};
```

#### 智能重试策略
```typescript
const getRetryStrategy = (error: any): RetryStrategy => {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    return {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffMultiplier: 2
    };
  }
  
  if (error.code === 'NETWORK_ERROR') {
    return {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 1.5
    };
  }
  
  return {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.5
  };
};
```

### 3. 批量发送错误处理

```typescript
interface BulkEmailResult {
  total: number;
  successful: number;
  failed: number;
  errors: EmailError[];
  retryQueue: EmailData[];
}

const sendBulkEmails = async (emails: EmailData[]): Promise<BulkEmailResult> => {
  const result: BulkEmailResult = {
    total: emails.length,
    successful: 0,
    failed: 0,
    errors: [],
    retryQueue: []
  };
  
  for (const emailData of emails) {
    try {
      await sendEmailWithRetry(emailData.recipient, emailData);
      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        email: emailData.recipient,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // 将可重试的错误加入重试队列
      if (isRetryableError(error)) {
        result.retryQueue.push(emailData);
      }
    }
  }
  
  return result;
};
```

## 错误监控和日志

### 1. 错误日志记录

```typescript
const logEmailError = (error: EmailError, context: EmailContext) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    error: {
      type: error.type,
      code: error.code,
      message: error.message,
      retryable: error.retryable
    },
    context: {
      recipient: context.recipient,
      templateId: context.templateId,
      organizationId: context.organizationId,
      attempt: context.attempt
    },
    metadata: {
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    }
  };
  
  // 发送到日志服务
  console.error('Email Error:', logEntry);
  
  // 存储到数据库
  storeEmailErrorLog(logEntry);
};
```

### 2. 错误统计

```typescript
interface EmailErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByCode: Record<string, number>;
  retrySuccessRate: number;
  averageRetryAttempts: number;
}

const getEmailErrorStats = async (timeRange: TimeRange): Promise<EmailErrorStats> => {
  const errors = await fetchEmailErrors(timeRange);
  
  return {
    totalErrors: errors.length,
    errorsByType: groupBy(errors, 'type'),
    errorsByCode: groupBy(errors, 'code'),
    retrySuccessRate: calculateRetrySuccessRate(errors),
    averageRetryAttempts: calculateAverageRetryAttempts(errors)
  };
};
```

## 用户界面错误处理

### 1. 错误消息显示

```typescript
const getErrorMessage = (error: EmailError): string => {
  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      return '发送频率过高，请稍后重试';
    
    case 'INVALID_EMAIL_FORMAT':
      return `邮箱地址格式无效: ${error.email}`;
    
    case 'NETWORK_ERROR':
      return '网络连接失败，请检查网络后重试';
    
    case 'AUTHENTICATION_ERROR':
      return '邮件服务配置错误，请联系管理员';
    
    default:
      return '邮件发送失败，请稍后重试';
  }
};
```

### 2. 批量发送结果展示

```typescript
const EmailResultModal: React.FC<EmailResultProps> = ({ result, onClose }) => {
  return (
    <Modal open={true} onClose={onClose}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          邮件发送结果
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">
            总计: {result.total} 封邮件
          </Typography>
          <Typography variant="body1" color="success.main">
            成功: {result.successful} 封
          </Typography>
          <Typography variant="body1" color="error.main">
            失败: {result.failed} 封
          </Typography>
        </Box>
        
        {result.errors.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              错误详情:
            </Typography>
            {result.errors.map((error, index) => (
              <Alert key={index} severity="error" sx={{ mb: 1 }}>
                {error.email}: {error.error}
              </Alert>
            ))}
          </Box>
        )}
      </Box>
    </Modal>
  );
};
```

## 配置和故障排除

### 1. 环境变量配置

```env
# 邮件服务配置
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# 错误处理配置
EMAIL_MAX_RETRIES=3
EMAIL_BASE_DELAY=1000
EMAIL_MAX_DELAY=30000

# 监控配置
EMAIL_ERROR_LOG_ENABLED=true
EMAIL_ERROR_NOTIFICATION_ENABLED=true
```

### 2. 故障排除检查清单

#### 网络连接问题
- [ ] 检查网络连接
- [ ] 验证 DNS 解析
- [ ] 检查防火墙设置
- [ ] 测试 API 端点可达性

#### 认证问题
- [ ] 验证 API 密钥有效性
- [ ] 检查密钥权限
- [ ] 确认账户状态
- [ ] 验证发送域名配置

#### 速率限制问题
- [ ] 检查发送配额
- [ ] 监控发送频率
- [ ] 实施发送队列
- [ ] 配置重试间隔

#### 邮箱格式问题
- [ ] 验证邮箱格式
- [ ] 检查域名有效性
- [ ] 过滤一次性邮箱
- [ ] 实施邮箱验证

### 3. 调试工具

```typescript
// 邮件发送调试
const debugEmailSending = async (emailData: EmailData) => {
  console.log('Email Data:', emailData);
  
  try {
    const result = await sendEmail(emailData.recipient, emailData);
    console.log('Email Sent Successfully:', result);
  } catch (error) {
    console.error('Email Sending Failed:', error);
    console.error('Error Details:', {
      type: error.type,
      code: error.code,
      message: error.message,
      retryable: error.retryable
    });
  }
};

// 批量发送调试
const debugBulkEmailSending = async (emails: EmailData[]) => {
  console.log('Bulk Email Data:', emails);
  
  const result = await sendBulkEmails(emails);
  console.log('Bulk Email Result:', result);
  
  if (result.errors.length > 0) {
    console.error('Bulk Email Errors:', result.errors);
  }
};
```

## 最佳实践

### 1. 错误处理原则
- 始终捕获和处理所有可能的错误
- 提供有意义的错误消息
- 实施适当的重试策略
- 记录详细的错误日志

### 2. 用户体验
- 显示友好的错误消息
- 提供重试选项
- 显示发送进度
- 提供错误详情查看

### 3. 系统稳定性
- 实施熔断器模式
- 监控错误率
- 设置告警阈值
- 定期检查服务状态

### 4. 性能优化
- 使用异步处理
- 实施队列机制
- 优化重试策略
- 缓存常用数据

## 相关文档

- [邮件通知系统](./08-EMAIL-SYSTEM.md)
- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md)
- [调试指南](./13-DEBUG.md)
- [系统安全配置](./11-SECURITY.md) 