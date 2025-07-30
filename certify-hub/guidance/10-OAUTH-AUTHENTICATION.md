# OAuth认证系统

## 概述

CertifyHub 使用 Google OAuth 2.0 进行用户认证，提供安全、便捷的登录体验。系统支持本地开发和生产环境的完整认证流程。

## 认证流程

### 1. 用户认证流程
```
用户点击登录 → Google OAuth → 回调处理 → 用户信息存储 → 重定向到应用
```

### 2. 技术实现
- **前端**: Next.js Auth.js 客户端
- **后端**: Supabase Auth
- **OAuth提供商**: Google OAuth 2.0
- **回调处理**: 自定义重定向逻辑

## 配置设置

### 1. Google OAuth 配置

#### 创建 Google OAuth 应用
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端 ID

#### 配置重定向 URI
```
开发环境:
http://localhost:3000/auth/callback

生产环境:
https://your-domain.com/auth/callback
```

### 2. Supabase 配置

#### 环境变量
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth 配置
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### Supabase Auth 设置
1. 登录 Supabase Dashboard
2. 进入 Authentication > Settings
3. 启用 Google 提供商
4. 配置 Google OAuth 凭据

### 3. Next.js 配置

#### Auth.js 配置
```typescript
// lib/auth.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const authConfig = {
  providers: [
    {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      wellKnown: 'https://accounts.google.com/.well-known/openid_configuration',
      authorization: {
        params: {
          scope: 'openid email profile'
        }
      },
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 处理用户登录
      return true;
    },
    async redirect({ url, baseUrl }) {
      // 自定义重定向逻辑
      return url.startsWith(baseUrl) ? url : baseUrl;
    }
  }
};
```

## 本地开发配置

### 1. 本地重定向解决方案

#### 问题描述
在本地开发环境中，Google OAuth 回调可能无法正确处理，导致认证失败。

#### 解决方案
```typescript
// utils/oauthRedirect.ts
export const handleOAuthRedirect = (url: string) => {
  // 检查是否为本地开发环境
  if (process.env.NODE_ENV === 'development') {
    // 本地开发重定向处理
    return handleLocalRedirect(url);
  }
  
  // 生产环境重定向处理
  return handleProductionRedirect(url);
};

const handleLocalRedirect = (url: string) => {
  // 解析 URL 参数
  const urlParams = new URLSearchParams(url.split('?')[1]);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  
  if (code && state) {
    // 处理认证代码
    return processAuthCode(code, state);
  }
  
  return '/dashboard';
};

const handleProductionRedirect = (url: string) => {
  // 生产环境重定向逻辑
  return url.startsWith(process.env.NEXT_PUBLIC_SITE_URL) 
    ? url 
    : '/dashboard';
};
```

### 2. 开发环境设置

#### 本地服务器配置
```typescript
// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/auth/callback',
        destination: '/api/auth/callback',
        permanent: false,
      },
    ];
  },
};
```

#### 环境变量配置
```env
# 开发环境
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth (开发)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 生产环境配置

### 1. 域名配置

#### 生产环境重定向 URI
```
https://your-domain.com/auth/callback
https://your-domain.com/api/auth/callback
```

#### SSL 证书
- 确保域名有有效的 SSL 证书
- 配置 HTTPS 重定向
- 设置安全标头

### 2. 环境变量
```env
# 生产环境
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_production_secret

# Google OAuth (生产)
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
```

## 用户界面组件

### 1. 登录按钮组件
```typescript
// components/GoogleLoginButton.tsx
import { signIn } from 'next-auth/react';

export const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    signIn('google', {
      callbackUrl: '/dashboard',
      redirect: true
    });
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        {/* Google 图标 */}
      </svg>
      使用 Google 登录
    </button>
  );
};
```

### 2. 认证状态管理
```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
    } else if (session?.user) {
      setUser(session.user);
      setLoading(false);
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [session, status]);

  const signOut = () => {
    // 处理登出逻辑
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 回调处理

### 1. 认证回调页面
```typescript
// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleOAuthRedirect } from '@/utils/oauthRedirect';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const url = window.location.href;
      const redirectUrl = handleOAuthRedirect(url);
      router.push(redirectUrl);
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">正在处理认证...</p>
      </div>
    </div>
  );
}
```

### 2. API 路由处理
```typescript
// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleOAuthRedirect } from '@/utils/oauthRedirect';

export async function GET(request: NextRequest) {
  const url = request.url;
  const redirectUrl = handleOAuthRedirect(url);
  
  return NextResponse.redirect(redirectUrl);
}
```

## 错误处理

### 1. 常见错误
```typescript
// 错误处理策略
const handleAuthError = (error: any) => {
  switch (error.type) {
    case 'OAuthCallbackError':
      return {
        message: '认证回调失败，请重试',
        action: 'retry'
      };
    
    case 'OAuthSigninError':
      return {
        message: '登录失败，请检查网络连接',
        action: 'retry'
      };
    
    case 'OAuthAccountNotLinked':
      return {
        message: '此邮箱已被其他方式注册',
        action: 'contact_support'
      };
    
    default:
      return {
        message: '认证过程中发生未知错误',
        action: 'contact_support'
      };
  }
};
```

### 2. 错误页面
```typescript
// components/AuthError.tsx
export const AuthError = ({ error }: { error: any }) => {
  const errorInfo = handleAuthError(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            认证错误
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {errorInfo.message}
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={() => window.location.reload()}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  );
};
```

## 安全考虑

### 1. 安全最佳实践
- **HTTPS**: 生产环境必须使用 HTTPS
- **状态验证**: 验证 OAuth 状态参数
- **令牌安全**: 安全存储访问令牌
- **CSRF 保护**: 防止跨站请求伪造

### 2. 环境变量安全
```env
# 生产环境安全配置
NEXTAUTH_SECRET=your_very_long_random_secret
NEXTAUTH_URL=https://your-domain.com

# 不要在生产环境使用开发环境的 OAuth 凭据
GOOGLE_CLIENT_ID=production_client_id
GOOGLE_CLIENT_SECRET=production_client_secret
```

## 监控和日志

### 1. 认证日志
```typescript
// 认证事件日志
const logAuthEvent = (event: string, data: any) => {
  console.log('Auth event:', {
    event,
    timestamp: new Date().toISOString(),
    userId: data.userId,
    provider: data.provider,
    success: data.success
  });
};
```

### 2. 错误监控
```typescript
// 错误监控
const monitorAuthErrors = (error: any) => {
  console.error('Auth error:', {
    type: error.type,
    message: error.message,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
};
```

## 故障排除

### 常见问题

1. **重定向 URI 不匹配**
   - 检查 Google OAuth 配置中的重定向 URI
   - 确保开发和生产环境使用不同的客户端 ID

2. **认证回调失败**
   - 检查网络连接
   - 验证环境变量配置
   - 查看浏览器控制台错误

3. **用户信息不完整**
   - 检查 Google OAuth 范围配置
   - 验证用户信息处理逻辑

## 相关文档

- [项目设置指南](./01-SETUP.md)
- [系统安全配置](./11-SECURITY.md)
- [调试指南](./13-DEBUG.md) 