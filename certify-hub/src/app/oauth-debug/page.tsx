'use client';

import { useEffect, useState } from 'react';

export default function OAuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const info = {
      // Current page info
      currentUrl: window.location.href,
      origin: window.location.origin,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      
      // Environment variables
      nodeEnv: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      googleRedirectUrl: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URL,
      appEnv: process.env.NEXT_PUBLIC_APP_ENV,
      
      // Calculated values
      calculatedCallback: `${window.location.origin}/auth/callback`,
      
      // Check for localhost issues
      isLocalhost: window.location.hostname === 'localhost',
      isProduction: process.env.NODE_ENV === 'production',
      mismatch: process.env.NODE_ENV === 'production' && window.location.hostname === 'localhost'
    };
    
    setDebugInfo(info);
  }, []);

  if (!debugInfo) {
    return <div>Loading debug info...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">OAuth Debug Information</h1>
        
        <div className="space-y-6">
          {/* Current Environment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Current Environment</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Current URL:</strong>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.currentUrl}</div>
              </div>
              <div>
                <strong>Origin:</strong>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.origin}</div>
              </div>
              <div>
                <strong>Hostname:</strong>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.hostname}</div>
              </div>
              <div>
                <strong>Protocol:</strong>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.protocol}</div>
              </div>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <div className="space-y-3">
              <div>
                <strong>NODE_ENV:</strong>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  debugInfo.nodeEnv === 'production' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {debugInfo.nodeEnv}
                </span>
              </div>
              <div>
                <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.supabaseUrl}</div>
              </div>
              <div>
                <strong>NEXT_PUBLIC_GOOGLE_CLIENT_ID:</strong>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.googleClientId}</div>
              </div>
              <div>
                <strong>NEXT_PUBLIC_APP_ENV:</strong>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">{debugInfo.appEnv}</div>
              </div>
            </div>
          </div>

          {/* Calculated OAuth URL */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">OAuth Callback Analysis</h2>
            <div>
              <strong>Calculated Callback URL:</strong>
              <div className={`font-mono text-sm p-2 rounded mt-2 ${
                debugInfo.calculatedCallback.includes('localhost') 
                  ? 'bg-red-100 text-red-800 border border-red-300' 
                  : 'bg-green-100 text-green-800 border border-green-300'
              }`}>
                {debugInfo.calculatedCallback}
              </div>
              {debugInfo.calculatedCallback.includes('localhost') && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 font-semibold">⚠️ PROBLEM DETECTED:</p>
                  <p className="text-red-700">Your callback URL contains 'localhost' even though you're trying to run in production!</p>
                </div>
              )}
            </div>
          </div>

          {/* Issue Detection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Issue Detection</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className={`w-4 h-4 rounded-full mr-3 ${debugInfo.isLocalhost ? 'bg-red-500' : 'bg-green-500'}`}></span>
                <span>Running on localhost: {debugInfo.isLocalhost ? 'YES' : 'NO'}</span>
              </div>
              <div className="flex items-center">
                <span className={`w-4 h-4 rounded-full mr-3 ${debugInfo.isProduction ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                <span>Production environment: {debugInfo.isProduction ? 'YES' : 'NO'}</span>
              </div>
              <div className="flex items-center">
                <span className={`w-4 h-4 rounded-full mr-3 ${debugInfo.mismatch ? 'bg-red-500' : 'bg-green-500'}`}></span>
                <span>Environment mismatch: {debugInfo.mismatch ? 'YES (PROBLEM!)' : 'NO'}</span>
              </div>
            </div>
            
            {debugInfo.mismatch && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold text-red-800">🚨 Critical Issue Detected:</h3>
                <p className="text-red-700 mt-2">
                  You have NODE_ENV=production but you're running on localhost. This means:
                </p>
                <ul className="list-disc ml-6 mt-2 text-red-700">
                  <li>Your production environment variables are loaded</li>
                  <li>But window.location.origin is still localhost</li>
                  <li>So OAuth callback gets set to localhost</li>
                </ul>
                <p className="mt-3 font-semibold text-red-800">
                  Solution: Make sure you're actually deployed to production, not running locally!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}