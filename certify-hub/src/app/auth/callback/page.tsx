'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ OAuth callback error:', error);
          router.push(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }

        if (data.session) {
          console.log('✅ OAuth login successful:', data.session.user.id);
          
          // Wait a moment for AuthContext to process the session
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } else {
          console.log('⚠️ No session found in callback');
          router.push('/login');
        }
      } catch (error) {
        console.error('❌ OAuth callback exception:', error);
        router.push('/login?error=OAuth callback failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Completing sign in...
        </h2>
        <p className="text-gray-600">
          Please wait while we complete your authentication.
        </p>
      </div>
    </div>
  );
}