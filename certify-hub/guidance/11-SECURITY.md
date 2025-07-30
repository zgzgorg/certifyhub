# 系统安全配置

## 概述

CertifyHub 采用多层次安全策略，确保用户数据、证书信息和系统资源的安全。本文档详细介绍了系统的安全架构、配置和最佳实践。

## 安全架构

### 1. 多层安全模型
```
┌─────────────────┐
│   应用层安全    │ ← 输入验证、XSS防护、CSRF保护
├─────────────────┤
│   认证层安全    │ ← OAuth、JWT、会话管理
├─────────────────┤
│   数据层安全    │ ← RLS、加密、访问控制
├─────────────────┤
│   网络层安全    │ ← HTTPS、防火墙、DDoS防护
└─────────────────┘
```

### 2. 安全组件
- **前端安全**: 输入验证、XSS防护、CSRF令牌
- **认证安全**: OAuth 2.0、JWT令牌、会话管理
- **数据安全**: 行级安全(RLS)、数据加密、访问控制
- **网络安全**: HTTPS、安全标头、防火墙规则

## 认证和授权

### 1. OAuth 2.0 认证
```typescript
// Google OAuth 配置
const oauthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.OAUTH_REDIRECT_URI,
  scope: 'openid email profile'
};
```

### 2. JWT 令牌管理
```typescript
// JWT 配置
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: '24h',
  algorithm: 'HS256'
};

// 令牌验证
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};
```

### 3. 会话管理
```typescript
// 会话配置
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
};
```

## 数据安全

### 1. 行级安全 (RLS)

#### 用户表策略
```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的数据
CREATE POLICY "Users can view own profile" ON users
FOR SELECT USING (auth.uid() = id);

-- 用户只能更新自己的数据
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid() = id);
```

#### 组织表策略
```sql
-- 启用 RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看已批准的组织
CREATE POLICY "Anyone can view approved organizations" ON organizations
FOR SELECT USING (status = 'approved');

-- 管理员可以查看所有组织
CREATE POLICY "Admins can view all organizations" ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'system_admin')
  )
);

-- 用户只能更新自己的组织
CREATE POLICY "Users can update own organization" ON organizations
FOR UPDATE USING (admin_id = auth.uid());
```

#### 证书表策略
```sql
-- 启用 RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 发布者可以查看自己发布的证书
CREATE POLICY "Publishers can view own certificates" ON certificates
FOR SELECT USING (publisher_id IN (
  SELECT id FROM organizations WHERE admin_id = auth.uid()
));

-- 管理员可以查看所有证书
CREATE POLICY "Admins can view all certificates" ON certificates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'system_admin')
  )
);

-- 发布者可以创建证书
CREATE POLICY "Publishers can create certificates" ON certificates
FOR INSERT WITH CHECK (publisher_id IN (
  SELECT id FROM organizations WHERE admin_id = auth.uid()
));
```

### 2. 数据加密

#### 敏感数据加密
```typescript
// 数据加密工具
import crypto from 'crypto';

const encryptData = (data: string, key: string): string => {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptData = (encryptedData: string, key: string): string => {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

#### 证书内容哈希
```typescript
// 内容完整性验证
const generateContentHash = (content: any): string => {
  const contentString = JSON.stringify(content);
  return crypto.createHash('sha256').update(contentString).digest('hex');
};

const verifyContentIntegrity = (content: any, hash: string): boolean => {
  const calculatedHash = generateContentHash(content);
  return calculatedHash === hash;
};
```

## 网络安全

### 1. HTTPS 配置
```typescript
// Next.js HTTPS 配置
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

### 2. CORS 配置
```typescript
// CORS 配置
const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### 3. 安全标头
```typescript
// 安全标头中间件
const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
};
```

## 输入验证

### 1. 前端验证
```typescript
// 输入验证工具
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateCertificateData = (data: any): boolean => {
  if (!data.recipientEmail || !validateEmail(data.recipientEmail)) {
    return false;
  }
  
  if (!data.templateId || typeof data.templateId !== 'string') {
    return false;
  }
  
  return true;
};
```

### 2. 后端验证
```typescript
// API 路由验证
import { z } from 'zod';

const certificateSchema = z.object({
  recipientEmail: z.string().email(),
  templateId: z.string().uuid(),
  metadataValues: z.record(z.any())
});

const validateCertificateRequest = (data: any) => {
  try {
    return certificateSchema.parse(data);
  } catch (error) {
    throw new Error('Invalid certificate data');
  }
};
```

### 3. SQL 注入防护
```typescript
// 参数化查询
const getCertificateById = async (id: string) => {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
};
```

## XSS 防护

### 1. 内容清理
```typescript
// XSS 防护工具
import DOMPurify from 'dompurify';

const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: ['class', 'style']
  });
};

const sanitizeUserInput = (input: string): string => {
  return input.replace(/[<>]/g, '');
};
```

### 2. 模板渲染安全
```typescript
// 安全的模板渲染
const renderTemplate = (template: string, data: any): string => {
  // 清理用户数据
  const sanitizedData = Object.keys(data).reduce((acc, key) => {
    acc[key] = sanitizeUserInput(data[key]);
    return acc;
  }, {} as any);
  
  // 安全替换模板变量
  let rendered = template;
  Object.keys(sanitizedData).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, sanitizedData[key]);
  });
  
  return rendered;
};
```

## CSRF 防护

### 1. CSRF 令牌
```typescript
// CSRF 令牌生成
const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF 令牌验证
const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  return token === sessionToken;
};
```

### 2. 表单保护
```typescript
// 表单 CSRF 保护
const ProtectedForm = ({ children }: { children: React.ReactNode }) => {
  const [csrfToken, setCsrfToken] = useState('');
  
  useEffect(() => {
    setCsrfToken(generateCSRFToken());
  }, []);
  
  return (
    <form>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      {children}
    </form>
  );
};
```

## 访问控制

### 1. 基于角色的访问控制
```typescript
// 角色定义
enum UserRole {
  ANONYMOUS = 'anonymous',
  USER = 'user',
  ORGANIZATION = 'organization',
  ADMIN = 'admin',
  SYSTEM_ADMIN = 'system_admin'
}

// 权限检查
const checkPermission = (user: any, action: string, resource: string): boolean => {
  const permissions = {
    [UserRole.ANONYMOUS]: ['view_public_templates'],
    [UserRole.USER]: ['view_public_templates', 'generate_certificates'],
    [UserRole.ORGANIZATION]: ['view_public_templates', 'generate_certificates', 'issue_certificates'],
    [UserRole.ADMIN]: ['view_all', 'manage_organizations'],
    [UserRole.SYSTEM_ADMIN]: ['view_all', 'manage_all']
  };
  
  const userPermissions = permissions[user.role] || [];
  return userPermissions.includes(action);
};
```

### 2. 资源访问控制
```typescript
// 资源访问检查
const checkResourceAccess = async (userId: string, resourceId: string, action: string) => {
  const user = await getUserById(userId);
  
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return true;
  }
  
  if (action === 'view' && user.role === UserRole.ADMIN) {
    return true;
  }
  
  // 检查资源所有权
  const resource = await getResourceById(resourceId);
  return resource.ownerId === userId;
};
```

## 审计和日志

### 1. 安全事件日志
```typescript
// 安全日志记录
const logSecurityEvent = (event: string, data: any) => {
  console.log('Security event:', {
    event,
    timestamp: new Date().toISOString(),
    userId: data.userId,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    details: data.details
  });
};

// 登录尝试日志
const logLoginAttempt = (email: string, success: boolean, ip: string) => {
  logSecurityEvent('login_attempt', {
    email,
    success,
    ipAddress: ip,
    timestamp: new Date().toISOString()
  });
};
```

### 2. 异常检测
```typescript
// 异常检测
const detectAnomalies = (userId: string, action: string) => {
  const userActions = getUserActionHistory(userId);
  const recentActions = userActions.filter(action => 
    action.timestamp > Date.now() - 5 * 60 * 1000 // 最近5分钟
  );
  
  if (recentActions.length > 10) {
    logSecurityEvent('rate_limit_exceeded', {
      userId,
      action,
      count: recentActions.length
    });
    return false;
  }
  
  return true;
};
```

## 环境变量安全

### 1. 敏感信息管理
```env
# 生产环境安全配置
NEXTAUTH_SECRET=your_very_long_random_secret
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# 数据库安全
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OAuth 安全
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 邮件服务安全
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 2. 环境变量验证
```typescript
// 环境变量验证
const validateEnvironmentVariables = () => {
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'JWT_SECRET',
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};
```

## 安全最佳实践

### 1. 开发安全
- 定期更新依赖包
- 使用安全编码实践
- 进行代码安全审查
- 实施自动化安全测试

### 2. 部署安全
- 使用 HTTPS
- 配置安全标头
- 启用 CSP
- 实施速率限制

### 3. 运维安全
- 定期安全审计
- 监控异常活动
- 备份数据安全
- 更新安全补丁

## 相关文档

- [OAuth认证系统](./10-OAUTH-AUTHENTICATION.md)
- [项目设置指南](./01-SETUP.md)
- [调试指南](./13-DEBUG.md) 