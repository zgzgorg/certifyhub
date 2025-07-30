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
      // Check if user exists in auth system
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email === email);

      if (!authUser) {
        setMessage('No user found with this email');
        setUserInfo(null);
        return;
      }

      // Check if user has any organization memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          *,
          organizations (*)
        `)
        .eq('user_id', authUser.id);

      // Check if user owns any organizations
      const { data: ownedOrgs, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', authUser.id);

      const userInfo: any = {
        type: 'user',
        data: {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || 'Unknown',
          created_at: authUser.created_at,
          email_confirmed: authUser.email_confirmed_at ? 'Yes' : 'No'
        },
        memberships: memberships || [],
        ownedOrganizations: ownedOrgs || []
      };

      setUserInfo(userInfo);
      
      if (ownedOrgs && ownedOrgs.length > 0) {
        setMessage(`User found - owns ${ownedOrgs.length} organization(s)`);
      } else if (memberships && memberships.length > 0) {
        setMessage(`User found - member of ${memberships.length} organization(s)`);
      } else {
        setMessage('User found - no organization affiliations');
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
              <p><strong>User ID:</strong> {userInfo.data.id}</p>
              <p><strong>Name:</strong> {userInfo.data.name}</p>
              <p><strong>Email Confirmed:</strong> {userInfo.data.email_confirmed}</p>
              <p><strong>Created:</strong> {new Date(userInfo.data.created_at).toLocaleString()}</p>
            </div>

            {userInfo.ownedOrganizations && userInfo.ownedOrganizations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Owned Organizations</h3>
                {userInfo.ownedOrganizations.map((org: any) => (
                  <div key={org.id} className="border rounded-lg p-4 mb-3">
                    <p><strong>Name:</strong> {org.name}</p>
                    <p><strong>Status:</strong> {org.status}</p>
                    <p><strong>Contact Person:</strong> {org.contact_person}</p>
                    <p><strong>Description:</strong> {org.description || 'None'}</p>
                  </div>
                ))}
              </div>
            )}

            {userInfo.memberships && userInfo.memberships.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Organization Memberships</h3>
                {userInfo.memberships.map((membership: any) => (
                  <div key={membership.id} className="border rounded-lg p-4 mb-3">
                    <p><strong>Organization:</strong> {membership.organizations?.name}</p>
                    <p><strong>Role:</strong> {membership.role}</p>
                    <p><strong>Joined:</strong> {new Date(membership.joined_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
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