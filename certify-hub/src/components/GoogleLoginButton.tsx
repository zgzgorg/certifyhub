'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      console.log('🚀 Attempting Google login...');
      
      // 使用自定义callback URL来处理OAuth响应
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ Google login error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('popup_closed')) {
          errorMessage = 'Login was cancelled. Please try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Login request timed out. Please try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('invalid_request')) {
          errorMessage = 'Invalid request. Please try again or contact support.';
        }
        
        setMessage({ type: 'error', text: errorMessage });
      } else {
        console.log('✅ Google login initiated successfully:', data);
        setMessage({ type: 'success', text: 'Redirecting to Google...' });
        
        // Supabase会自动处理OAuth流程和重定向
        // 用户会被重定向到Google授权页面，然后回到应用
        // 登录成功后，AuthContext会检测到用户状态变化，登录页面会自动跳转到dashboard
      }
    } catch (error: unknown) {
      console.error('❌ Google login exception:', error);
      let errorMessage = 'Google login failed. Please try again.';
      const errMsg = error instanceof Error ? error.message : '';
      
      if (errMsg.includes('timeout') || errMsg.includes('network')) {
        errorMessage = 'Network timeout. Please check your connection and try again.';
      } else if (errMsg) {
        errorMessage = errMsg;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 py-3 px-4 rounded-md font-semibold border border-gray-300 hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Signing in with Google...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
