# 调试指南

## 概述

本文档提供了 CertifyHub 项目的调试技巧和常见问题解决方案，帮助开发者快速定位和解决问题。

## 调试工具

### 1. 浏览器开发者工具

#### 控制台调试
```javascript
// 基本日志
console.log('调试信息:', data);
console.error('错误信息:', error);
console.warn('警告信息:', warning);

// 分组日志
console.group('证书生成');
console.log('模板ID:', templateId);
console.log('数据:', certificateData);
console.groupEnd();

// 性能测量
console.time('PDF生成时间');
// ... PDF生成代码
console.timeEnd('PDF生成时间');

// 表格显示
console.table(certificates);
```

#### 网络调试
```javascript
// 监控API请求
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('API请求:', args[0]);
  return originalFetch.apply(this, args).then(response => {
    console.log('API响应:', response);
    return response;
  });
};
```

### 2. Supabase 调试

#### 数据库查询调试
```typescript
// 启用详细日志
const supabase = createClient(url, key, {
  db: {
    schema: 'public'
  },
  auth: {
    debug: true
  }
});

// 监控查询性能
const debugQuery = async (query: any) => {
  const startTime = performance.now();
  const result = await query;
  const endTime = performance.now();
  
  console.log(`查询耗时: ${endTime - startTime}ms`);
  return result;
};
```

#### RLS 策略调试
```sql
-- 检查RLS策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('users', 'organizations', 'certificates', 'templates');
```

### 3. Next.js 调试

#### 开发模式配置
```typescript
// next.config.ts
const nextConfig = {
  // 启用详细错误信息
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // 开发模式配置
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // 启用源码映射
      config.devtool = 'eval-source-map';
    }
    return config;
  },
};
```

#### API 路由调试
```typescript
// app/api/debug/route.ts
export async function GET(request: Request) {
  console.log('请求头:', Object.fromEntries(request.headers));
  console.log('URL:', request.url);
  
  return Response.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
  });
}
```

## 常见问题

### 1. 认证问题

#### OAuth 回调失败
```typescript
// 检查OAuth配置
const checkOAuthConfig = () => {
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.OAUTH_REDIRECT_URI,
    siteUrl: process.env.NEXTAUTH_URL
  };
  
  console.log('OAuth配置:', config);
  
  const missing = Object.entries(config)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
    
  if (missing.length > 0) {
    console.error('缺少环境变量:', missing);
  }
};
```

#### 会话状态问题
```typescript
// 检查会话状态
const debugSession = () => {
  const session = useSession();
  console.log('会话状态:', {
    data: session.data,
    status: session.status,
    error: session.error
  });
};
```

### 2. 数据库问题

#### 连接失败
```typescript
// 测试数据库连接
const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (error) {
      console.error('数据库连接失败:', error);
      return false;
    }
    
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接异常:', error);
    return false;
  }
};
```

#### RLS 策略问题
```sql
-- 检查用户权限
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 检查表权限
SELECT 
  table_name,
  has_table_privilege(auth.uid(), table_name, 'SELECT') as can_select,
  has_table_privilege(auth.uid(), table_name, 'INSERT') as can_insert,
  has_table_privilege(auth.uid(), table_name, 'UPDATE') as can_update,
  has_table_privilege(auth.uid(), table_name, 'DELETE') as can_delete
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 3. PDF 生成问题

#### 模板渲染失败
```typescript
// 调试模板渲染
const debugTemplateRendering = (template: string, data: any) => {
  console.log('模板内容:', template);
  console.log('数据:', data);
  
  // 检查变量替换
  const variables = template.match(/\{\{(\w+)\}\}/g);
  console.log('模板变量:', variables);
  
  const missingVariables = variables?.filter(variable => {
    const key = variable.replace(/\{\{|\}\}/g, '');
    return !data[key];
  });
  
  if (missingVariables?.length) {
    console.warn('缺少变量:', missingVariables);
  }
};
```

#### Canvas 渲染问题
```typescript
// 调试Canvas渲染
const debugCanvasRendering = async (element: HTMLElement) => {
  console.log('元素尺寸:', {
    offsetWidth: element.offsetWidth,
    offsetHeight: element.offsetHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight
  });
  
  console.log('元素样式:', window.getComputedStyle(element));
  
  // 检查字体加载
  const fonts = Array.from(document.fonts);
  console.log('已加载字体:', fonts.map(font => font.family));
};
```

### 4. 邮件发送问题

#### 邮件服务配置
```typescript
// 检查邮件配置
const checkEmailConfig = () => {
  const config = {
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL
  };
  
  console.log('邮件配置:', {
    ...config,
    smtpPass: config.smtpPass ? '***' : '未设置'
  });
  
  const missing = Object.entries(config)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
    
  if (missing.length > 0) {
    console.error('缺少邮件配置:', missing);
  }
};
```

#### 邮件发送调试
```typescript
// 调试邮件发送
const debugEmailSending = async (emailData: any) => {
  console.log('邮件数据:', {
    to: emailData.to,
    subject: emailData.subject,
    template: emailData.template
  });
  
  try {
    const result = await sendEmail(emailData);
    console.log('邮件发送成功:', result);
  } catch (error) {
    console.error('邮件发送失败:', error);
  }
};
```

## 性能调试

### 1. 内存使用监控
```typescript
// 监控内存使用
const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('内存使用:', {
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
    });
  }
};
```

### 2. 网络性能监控
```typescript
// 监控网络性能
const monitorNetworkPerformance = () => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        console.log('页面加载性能:', {
          dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
          tcpConnection: navEntry.connectEnd - navEntry.connectStart,
          responseTime: navEntry.responseEnd - navEntry.responseStart,
          domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart
        });
      }
    }
  });
  
  observer.observe({ entryTypes: ['navigation'] });
};
```

### 3. 组件渲染性能
```typescript
// 监控组件渲染
const useRenderPerformance = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      console.log(`${componentName} 渲染时间: ${endTime - startTime}ms`);
    };
  });
};
```

## 错误处理

### 1. 全局错误捕获
```typescript
// 全局错误处理
const setupGlobalErrorHandling = () => {
  window.addEventListener('error', (event) => {
    console.error('全局错误:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', {
      reason: event.reason,
      promise: event.promise
    });
  });
};
```

### 2. React 错误边界
```typescript
// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('React错误边界捕获:', {
      error,
      errorInfo
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>出现错误</h2>
          <details>
            <summary>错误详情</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## 调试脚本

### 1. 环境检查脚本
```typescript
// 环境检查
const checkEnvironment = () => {
  const checks = {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    googleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    smtpHost: !!process.env.SMTP_HOST,
    smtpUser: !!process.env.SMTP_USER,
    smtpPass: !!process.env.SMTP_PASS
  };
  
  console.table(checks);
  
  const failed = Object.entries(checks)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
    
  if (failed.length > 0) {
    console.error('环境配置问题:', failed);
  }
};
```

### 2. 数据库检查脚本
```typescript
// 数据库健康检查
const checkDatabaseHealth = async () => {
  const checks = {
    connection: false,
    tables: false,
    rls: false,
    storage: false
  };
  
  try {
    // 测试连接
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (!error) {
      checks.connection = true;
    }
    
    // 检查表
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tables) {
      checks.tables = true;
    }
    
    // 检查存储
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets) {
      checks.storage = true;
    }
    
  } catch (error) {
    console.error('数据库检查失败:', error);
  }
  
  console.table(checks);
  return checks;
};
```

## 调试最佳实践

### 1. 日志级别
```typescript
// 日志级别管理
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel;
  
  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }
  
  debug(message: string, data?: any) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }
  
  info(message: string, data?: any) {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, data);
    }
  }
  
  warn(message: string, data?: any) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, data);
    }
  }
  
  error(message: string, data?: any) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, data);
    }
  }
}

const logger = new Logger(LogLevel.DEBUG);
```

### 2. 调试模式开关
```typescript
// 调试模式配置
const DEBUG_MODE = process.env.NODE_ENV === 'development';

const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    console.log(`[DEBUG] ${message}`, data);
  }
};

const debugError = (message: string, error?: any) => {
  if (DEBUG_MODE) {
    console.error(`[DEBUG ERROR] ${message}`, error);
  }
};
```

## 相关文档

- [项目设置指南](./01-SETUP.md)
- [OAuth认证系统](./10-OAUTH-AUTHENTICATION.md)
- [系统安全配置](./11-SECURITY.md) 