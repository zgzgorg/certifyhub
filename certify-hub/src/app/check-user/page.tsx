'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function CheckUserPage() {
  const [email, setEmail] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const checkUser = async () => {
    if (!email) {
      setMessage('Please enter an email address');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Try to query user information from database
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('email', email)
        .single();

      const { data: userData, error: userError } = await supabase
        .from('regular_users')
        .select('*')
        .eq('email', email)
        .single();

      if (orgData) {
        setUserInfo({
          type: 'organization',
          data: orgData,
          emailConfirmed: orgData.user_id ? 'Yes' : 'No'
        });
        setMessage('Organization user found');
      } else if (userData) {
        setUserInfo({
          type: 'regular_user',
          data: userData,
          emailConfirmed: userData.user_id ? 'Yes' : 'No'
        });
        setMessage('Regular user found');
      } else {
        setMessage('No user found with this email');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setMessage('Error checking user');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!email) {
      setMessage('Please enter an email address');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Verification email sent! Please check your inbox.');
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Check User Status</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter email to check"
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={checkUser}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check User'}
            </button>
            
            <button
              onClick={resendVerification}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Resend Verification'}
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        {userInfo && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <div className="space-y-2">
              <p><strong>Type:</strong> {userInfo.type}</p>
              <p><strong>Email:</strong> {userInfo.data.email}</p>
              <p><strong>User ID:</strong> {userInfo.data.user_id || 'Not set'}</p>
              <p><strong>Email Confirmed:</strong> {userInfo.emailConfirmed}</p>
              <p><strong>Created:</strong> {new Date(userInfo.data.created_at).toLocaleString()}</p>
              
              {userInfo.type === 'organization' && (
                <>
                  <p><strong>Name:</strong> {userInfo.data.name}</p>
                  <p><strong>Status:</strong> {userInfo.data.status}</p>
                  <p><strong>Contact Person:</strong> {userInfo.data.contact_person}</p>
                </>
              )}
              
              {userInfo.type === 'regular_user' && (
                <p><strong>Name:</strong> {userInfo.data.name}</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Tips:</h3>
          <ul className="text-yellow-700 space-y-1">
            <li>• Check your spam/junk folder for verification emails</li>
            <li>• Make sure you're using a real email address</li>
            <li>• Try disabling email confirmation in Supabase settings</li>
            <li>• Check Supabase SMTP settings if emails aren't being sent</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 