'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestStoragePage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testStorage = async () => {
    setLoading(true);
    setResults([]);

    try {
      // 测试1: 检查用户认证
      addResult('Testing user authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        addResult(`❌ Auth error: ${authError.message}`);
      } else if (!user) {
        addResult('❌ No authenticated user found');
      } else {
        addResult(`✅ User authenticated: ${user.email}`);
      }

      // 测试2: 检查bucket是否存在
      addResult('Testing bucket existence...');
      try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError) {
          addResult(`❌ Bucket list error: ${bucketError.message}`);
        } else {
          const templatesBucket = buckets?.find(b => b.name === 'templates');
          if (templatesBucket) {
            addResult(`✅ Templates bucket found: ${templatesBucket.name}`);
          } else {
            addResult('❌ Templates bucket not found');
            addResult(`Available buckets: ${buckets?.map(b => b.name).join(', ') || 'none'}`);
          }
        }
      } catch (error) {
        addResult(`❌ Bucket test error: ${error}`);
      }

      // 测试3: 尝试列出templates bucket的内容
      addResult('Testing bucket access...');
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('templates')
          .list('', { limit: 1 });
        
        if (listError) {
          addResult(`❌ Bucket access error: ${listError.message}`);
        } else {
          addResult(`✅ Bucket access successful. Files count: ${files?.length || 0}`);
        }
      } catch (error) {
        addResult(`❌ Bucket access test error: ${error}`);
      }

      // 测试4: 检查数据库表
      addResult('Testing database table...');
      try {
        const { data: templates, error: dbError } = await supabase
          .from('templates')
          .select('count')
          .limit(1);
        
        if (dbError) {
          addResult(`❌ Database error: ${dbError.message}`);
        } else {
          addResult('✅ Database table accessible');
        }
      } catch (error) {
        addResult(`❌ Database test error: ${error}`);
      }

    } catch (error) {
      addResult(`❌ General error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Storage Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={testStorage}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Storage Tests'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
          <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">Click "Run Storage Tests" to start testing</p>
            ) : (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 