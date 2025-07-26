'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function TestConnectionPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, success: boolean, message: string, data?: any) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testSupabaseConnection = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // 测试1: 基本连接
      addResult('Basic Connection', true, 'Testing Supabase client initialization...');
      
      // 测试2: 获取当前用户
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          addResult('Get Current User', false, `Error: ${error.message}`, error);
        } else {
          addResult('Get Current User', true, `Success: ${user ? 'User found' : 'No user logged in'}`, user);
        }
      } catch (error: any) {
        addResult('Get Current User', false, `Exception: ${error.message}`, error);
      }

      // 测试3: 获取会话
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          addResult('Get Session', false, `Error: ${error.message}`, error);
        } else {
          addResult('Get Session', true, `Success: ${session ? 'Session found' : 'No active session'}`, session);
        }
      } catch (error: any) {
        addResult('Get Session', false, `Exception: ${error.message}`, error);
      }

      // 测试4: 测试数据库连接
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('count')
          .limit(1);
        
        if (error) {
          addResult('Database Connection', false, `Error: ${error.message}`, error);
        } else {
          addResult('Database Connection', true, 'Success: Database connection working', data);
        }
      } catch (error: any) {
        addResult('Database Connection', false, `Exception: ${error.message}`, error);
      }

      // 测试5: 测试认证端点
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
          }
        });
        
        if (response.ok) {
          addResult('Auth Endpoint', true, 'Success: Auth endpoint responding', { status: response.status });
        } else {
          addResult('Auth Endpoint', false, `Error: HTTP ${response.status}`, { status: response.status });
        }
      } catch (error: any) {
        addResult('Auth Endpoint', false, `Exception: ${error.message}`, error);
      }

    } catch (error: any) {
      addResult('Overall Test', false, `General error: ${error.message}`, error);
    } finally {
      setLoading(false);
    }
  };

  const testLoginWithTimeout = async () => {
    setLoading(true);
    addResult('Login Test', true, 'Testing login with timeout...');

    const testEmail = 'test@example.com';
    const testPassword = 'wrongpassword';

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000);
      });

      const loginPromise = supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      const result = await Promise.race([loginPromise, timeoutPromise]);
      
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        const error = result.error as any;
        addResult('Login Timeout Test', true, `Expected error: ${error.message}`, error);
      }
    } catch (error: any) {
      if (error.message.includes('Timeout')) {
        addResult('Login Timeout Test', false, 'Login request timed out - this indicates a connection issue', error);
      } else {
        addResult('Login Timeout Test', true, `Expected error: ${error.message}`, error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Supabase Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={testSupabaseConnection}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>
            
            <button
              onClick={testLoginWithTimeout}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Login Timeout'}
            </button>
          </div>

          <div className="text-sm text-gray-600">
            <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</p>
            <p><strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {result.test}
                      </p>
                      <p className={`text-sm ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                      <p className="text-xs text-gray-500">{result.timestamp}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full ${
                      result.success ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer">View Details</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Tips:</h3>
          <ul className="text-yellow-700 space-y-1 text-sm">
            <li>• If connection tests fail, check your environment variables</li>
            <li>• If login times out, there might be a network issue</li>
            <li>• Check browser console for additional error details</li>
            <li>• Ensure Supabase project is active and accessible</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 