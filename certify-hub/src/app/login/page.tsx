'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from '../../components/LoginForm';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import { redirectAfterAuth, shouldRedirectAfterAuth } from '../../utils/redirectAfterAuth';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!loading && user && shouldRedirectAfterAuth(pathname) && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log('🔄 User already logged in, redirecting from login page...');
      redirectAfterAuth(router, 100); // Faster redirect since user is already authenticated
    }
  }, [user, loading, router, pathname]);

  // Don't render login form if user is already logged in
  if (!loading && user) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sign In
          </h1>
          <p className="text-gray-600">
            Sign in to your account to continue
          </p>
        </div>
        
        {/* Error Message from URL */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
            {errorMessage}
          </div>
        )}
        
        {/* Google Login */}
        <GoogleLoginButton />
        
        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>
        
        {/* Email/Password Login */}
        <LoginForm />
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Don&apos;t have an account?
            </p>
            <a
              href="/register"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense 
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Sign In
              </h1>
              <p className="text-gray-600">
                Loading...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
} 