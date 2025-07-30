'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import SystemAdminGuard from '../../../components/SystemAdminGuard';
import { SystemAdminInfo, addSystemAdmin, removeSystemAdmin, SYSTEM_PERMISSIONS } from '../../../utils/systemAdmin';

export default function SystemAdminsPage() {
  const [systemAdmins, setSystemAdmins] = useState<SystemAdminInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('admin');
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSystemAdmins();
  }, []);

  const fetchSystemAdmins = async () => {
    try {
      const { getAllSystemAdmins } = await import('../../../utils/systemAdmin');
      const admins = await getAllSystemAdmins();
      setSystemAdmins(admins);
    } catch (error) {
      console.error('Error fetching system admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    try {
      // 首先查找用户
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) {
        setMessage({ type: 'error', text: 'Error finding user' });
        return;
      }

      const user = users?.users?.find(u => u.email === newAdminEmail);
      if (!user) {
        setMessage({ type: 'error', text: 'User not found with this email' });
        return;
      }

      const result = await addSystemAdmin(user.id, newAdminRole, selectedPermissions);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'System admin added successfully' });
        setNewAdminEmail('');
        setNewAdminRole('admin');
        setSelectedPermissions({});
        setShowAddForm(false);
        fetchSystemAdmins();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add system admin' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding system admin' });
    }
  };

  const handleRemoveAdmin = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} as a system admin?`)) {
      return;
    }

    try {
      const result = await removeSystemAdmin(userId);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'System admin removed successfully' });
        fetchSystemAdmins();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to remove system admin' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing system admin' });
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SystemAdminGuard requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              System Administrators
            </h1>
            <p className="text-gray-600">
              Manage system administrators and their permissions
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
              <button
                onClick={() => setMessage(null)}
                className="float-right text-sm underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                System Administrators ({systemAdmins.length})
              </h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                {showAddForm ? 'Cancel' : 'Add System Admin'}
              </button>
            </div>

            {showAddForm && (
              <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New System Administrator</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter user email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value as 'admin' | 'moderator')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(SYSTEM_PERMISSIONS).map(([key, permission]) => (
                      <label key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPermissions[permission] || false}
                          onChange={() => togglePermission(permission)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddAdmin}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                >
                  Add System Administrator
                </button>
              </div>
            )}

            <div className="divide-y divide-gray-200">
              {systemAdmins.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No system administrators found
                </div>
              ) : (
                systemAdmins.map((admin) => (
                  <div key={admin.id} className="px-6 py-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {admin.user_name || 'Unknown User'}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            admin.role === 'super_admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : admin.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {admin.role.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><strong>Email:</strong> {admin.email}</p>
                            <p><strong>Added:</strong> {new Date(admin.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p><strong>Last Updated:</strong> {new Date(admin.updated_at).toLocaleDateString()}</p>
                            <p><strong>User Created:</strong> {new Date(admin.user_created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {Object.keys(admin.permissions).length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Permissions:</strong>
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(admin.permissions).map(([permission, enabled]) => (
                                <span
                                  key={permission}
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    enabled 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {permission.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {admin.role !== 'super_admin' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleRemoveAdmin(admin.user_id, admin.user_name)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </SystemAdminGuard>
  );
} 