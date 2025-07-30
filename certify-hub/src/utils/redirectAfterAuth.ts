import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Centralized function to handle post-authentication redirects
 * This prevents multiple redirect attempts and ensures consistent behavior
 */
export function redirectAfterAuth(router: AppRouterInstance, delay: number = 500) {
  console.log('🔄 Redirecting to dashboard after authentication...');
  
  // Use a slight delay to allow AuthContext to fully process the session
  setTimeout(() => {
    try {
      router.push('/dashboard');
      console.log('✅ Dashboard redirect initiated');
    } catch (error) {
      console.error('❌ Redirect failed:', error);
      // Fallback to window.location if router fails
      window.location.href = '/dashboard';
    }
  }, delay);
}

/**
 * Check if we should redirect after authentication
 * This prevents redirects when user is already on dashboard or other protected pages
 */
export function shouldRedirectAfterAuth(pathname: string): boolean {
  const protectedPaths = ['/dashboard', '/certificates', '/certificate'];
  return !protectedPaths.some(path => pathname.startsWith(path));
}