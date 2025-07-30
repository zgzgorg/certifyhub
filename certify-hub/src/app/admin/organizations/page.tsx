'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Organization } from '../../../types/user';
import SystemAdminGuard from '../../../components/SystemAdminGuard';

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organizations:', error);
      } else {
        setOrganizations(data || []);
      }
    } catch (error) {
      console.error('Exception in fetchOrganizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrganizationStatus = async (orgId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status })
        .eq('id', orgId);

      if (error) {
        console.error('Error updating organization:', error);
      } else {
        // Refresh list
        fetchOrganizations();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SystemAdminGuard requiredRole="admin" requiredPermission="manage_organizations">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Organization Management
            </h1>
            <p className="text-gray-600">
              Review and approve organization registrations
            </p>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Organizations ({organizations.filter(org => org.status === 'pending').length})
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {organizations.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No organizations found
                </div>
              ) : (
                organizations.map((org) => (
                  <div key={org.id} className="px-6 py-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {org.name}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            org.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : org.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {org.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><strong>Email:</strong> {org.email}</p>
                            <p><strong>Contact Person:</strong> {org.contact_person}</p>
                            {org.contact_phone && (
                              <p><strong>Phone:</strong> {org.contact_phone}</p>
                            )}
                          </div>
                          <div>
                            {org.website && (
                              <p><strong>Website:</strong> <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{org.website}</a></p>
                            )}
                            <p><strong>Registered:</strong> {new Date(org.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {org.description && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600">
                              <strong>Description:</strong> {org.description}
                            </p>
                          </div>
                        )}
                      </div>

                      {org.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => updateOrganizationStatus(org.id, 'approved')}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateOrganizationStatus(org.id, 'rejected')}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                          >
                            Reject
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