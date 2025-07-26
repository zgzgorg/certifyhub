'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 添加超时机制
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setMessage({ type: 'error', text: 'Login request timed out. Please try again.' });
    }, 10000); // 10秒超时

    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      clearTimeout(timeoutId); // 清除超时

      if (error) {
        console.error('Login error:', error);
        
        // 提供更详细的错误信息
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the verification link before logging in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        }
        
        setMessage({ type: 'error', text: errorMessage });
      } else {
        console.log('Login successful:', data);
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        // 这里可以添加重定向逻辑
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      }
    } catch (error: any) {
      clearTimeout(timeoutId); // 清除超时
      console.error('Login exception:', error);
      setMessage({ type: 'error', text: error.message || 'Login failed. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // 添加超时机制
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setMessage({ type: 'error', text: 'Request timed out. Please try again.' });
    }, 10000); // 10秒超时

    try {
      console.log('Sending password reset email to:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      clearTimeout(timeoutId); // 清除超时

      if (error) {
        console.error('Password reset error:', error);
        setMessage({ type: 'error', text: error.message });
      } else {
        console.log('Password reset email sent successfully');
        setMessage({ 
          type: 'success', 
          text: 'Password reset email sent! Please check your email for instructions.' 
        });
      }
    } catch (error: any) {
      clearTimeout(timeoutId); // 清除超时
      console.error('Password reset exception:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send reset email. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          name="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
          {message.type === 'error' && message.text.includes('Invalid email or password') && (
            <div className="mt-2 text-sm">
              <p>Need help?</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Make sure you've verified your email address</li>
                <li>Check that your email and password are correct</li>
                <li>If you just registered, please check your email for verification</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Having trouble logging in?{' '}
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Reset password
          </button>
        </p>
      </div>
    </form>
  );
}
