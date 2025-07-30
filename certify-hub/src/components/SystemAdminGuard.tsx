'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSystemAdmin, isSuperAdmin, isAdminOrSuper } from '../utils/systemAdmin';
import { useRouter } from 'next/navigation';

interface SystemAdminGuardProps {
  children: React.ReactNode;
  requiredRole?: 'system_admin' | 'admin' | 'super_admin';
  requiredPermission?: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function SystemAdminGuard({
  children,
  requiredRole = 'system_admin',
  requiredPermission,
  fallback,
  redirectTo = '/dashboard'
}: SystemAdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;

      if (!user) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      try {
        let access = false;

        switch (requiredRole) {
          case 'system_admin':
            access = await isSystemAdmin(user);
            break;
          case 'admin':
            access = await isAdminOrSuper(user);
            break;
          case 'super_admin':
            access = await isSuperAdmin(user);
            break;
          default:
            access = await isSystemAdmin(user);
        }

        // 如果指定了特定权限，还需要检查权限
        if (access && requiredPermission) {
          const { hasSystemPermission } = await import('../utils/systemAdmin');
          access = await hasSystemPermission(user, requiredPermission);
        }

        setHasAccess(access);
      } catch (error) {
        console.error('Error checking system admin access:', error);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkAccess();
  }, [user, loading, requiredRole, requiredPermission]);

  // Handle redirect in a separate useEffect to avoid setState during render
  useEffect(() => {
    if (shouldRedirect && redirectTo) {
      router.push(redirectTo);
    }
  }, [shouldRedirect, redirectTo, router]);

  // 如果还在检查权限，显示加载状态
  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Checking permissions...</div>
      </div>
    );
  }

  // 如果没有访问权限
  if (!hasAccess) {
    // 如果提供了重定向路径，则设置重定向标志
    if (redirectTo && !shouldRedirect) {
      setShouldRedirect(true);
      return null;
    }

    // 如果提供了自定义fallback，则显示
    if (fallback) {
      return <>{fallback}</>;
    }

    // 默认的访问被拒绝页面
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Access Denied
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              You don't have permission to access this page. Please contact your system administrator.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 有访问权限，显示子组件
  return <>{children}</>;
}

// 便捷的权限检查Hook
export function useSystemAdminAccess(requiredRole?: 'system_admin' | 'admin' | 'super_admin') {
  const { user, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;

      if (!user) {
        setHasAccess(false);
        setChecking(false);
        return;
      }

      try {
        let access = false;

        switch (requiredRole) {
          case 'system_admin':
            access = await isSystemAdmin(user);
            break;
          case 'admin':
            access = await isAdminOrSuper(user);
            break;
          case 'super_admin':
            access = await isSuperAdmin(user);
            break;
          default:
            access = await isSystemAdmin(user);
        }

        setHasAccess(access);
      } catch (error) {
        console.error('Error checking system admin access:', error);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkAccess();
  }, [user, loading, requiredRole]);

  return {
    hasAccess,
    checking: loading || checking,
    user
  };
} 