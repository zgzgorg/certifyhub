'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserOrganizations } from '@/utils/organizationAccess';
import { supabase } from '../../lib/supabaseClient';
import { Organization, OrganizationMember } from '../../types/user';

interface OrganizationWithMembers extends Organization {
  members?: OrganizationMember[];
  userRole?: string;
  email?: string;
  contact_person?: string;
  contact_phone?: string;
  website?: string;
}

// Loading component for better UX
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error boundary component
function ErrorBoundary({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={retry}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, organization, organizationMembers, loading, error, retry } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationWithMembers[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithMembers | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    website: '',
    contact_person: '',
    contact_phone: ''
  });

  const userOrganizations = getUserOrganizations({ user, organization, organizationMembers });

  useEffect(() => {
    if (!loading && !user && !error) {
      router.push('/login');
    }
  }, [user, loading, error, router]);

  useEffect(() => {
    if (user?.id) {
      fetchOrganizations();
    }
  }, [user?.id]);

  const fetchOrganizations = async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping fetch');
      return;
    }

    try {
      // Fetch organizations where user is owner
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('Error fetching owned organizations:', ownedError);
      }

      // Fetch organizations where user is a member
      const { data: memberOrgs, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          *,
          organizations (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (memberError) {
        console.error('Error fetching member organizations:', memberError);
      }

      // Combine and format organizations
      const allOrgs: OrganizationWithMembers[] = [];
      
      // Add owned organizations
      if (ownedOrgs) {
        ownedOrgs.forEach(org => {
          allOrgs.push({
            ...org,
            userRole: 'owner'
          });
        });
      }

      // Add member organizations
      if (memberOrgs) {
        memberOrgs.forEach(membership => {
          const org = (membership as any).organizations;
          if (org && !allOrgs.find(o => o.id === org.id)) {
            allOrgs.push({
              ...org,
              userRole: membership.role
            });
          }
        });
      }

      setOrganizations(allOrgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          ...formData,
          owner_id: user.id,
          created_by: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add user as owner member
      await supabase
        .from('organization_members')
        .insert({
          organization_id: data.id,
          user_id: user.id,
          role: 'owner'
        });

      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        description: '',
        website: '',
        contact_person: '',
        contact_phone: ''
      });
      
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization: ' + error.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Show error state with retry option
  if (error) {
    return <ErrorBoundary error={error} retry={retry} />;
  }

  // Show loading skeleton while loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Redirect to login if no user
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back! Here&apos;s your account overview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Account Type</p>
                <p className="font-medium">
                  {userOrganizations.length > 0 ? 'Organization Member' : 'Individual User'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Link
                href="/certificate/generate"
                className="flex items-center justify-between w-full p-3 text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition border border-gray-200"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">Generate Certificate</span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              
              {/* Show organization features for owners/admins of approved organizations */}
              {userOrganizations.some((org: any) => 
                org.status === 'approved' && (org.userRole === 'owner' || org.userRole === 'admin')
              ) && (
                <Link
                  href="/certificate/templates"
                  className="flex items-center justify-between w-full p-3 text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition border border-gray-200"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="font-medium">Manage Templates</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
              
              <Link
                href="/certificates"
                className="flex items-center justify-between w-full p-3 text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition border border-gray-200"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-medium">View Certificates</span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Certificates Generated</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Templates Available</span>
                <span className="font-semibold">
                  {userOrganizations.some((org: any) => 
                    org.status === 'approved' && (org.userRole === 'owner' || org.userRole === 'admin')
                  ) ? 'Unlimited' : '5'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Account Status</span>
                <span className="font-semibold text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Organizations Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Organizations
            </h3>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Create Organization
            </button>
          </div>

          {/* Create Organization Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Create New Organization</h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person *
                      </label>
                      <input
                        type="text"
                        name="contact_person"
                        required
                        value={formData.contact_person}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        name="contact_phone"
                        value={formData.contact_phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="https://example.com"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Approval Required
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            Your organization registration will be reviewed by administrators. You'll be notified once it's approved.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                      Create Organization
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Organization List */}
          {organizations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Found</h3>
              <p className="text-gray-600 mb-4">
                You haven't created or joined any organizations yet.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Create Your First Organization
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedOrg(org)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {org.name}
                      </h3>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          org.userRole === 'owner' 
                            ? 'bg-purple-100 text-purple-800' 
                            : org.userRole === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {org.userRole}
                        </span>
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
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>Email:</strong> {org.email}</p>
                      <p><strong>Contact:</strong> {org.contact_person}</p>
                      {org.website && (
                        <p><strong>Website:</strong> {org.website}</p>
                      )}
                      <p><strong>Created:</strong> {new Date(org.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    {org.description && (
                      <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                        {org.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Organization Detail Modal */}
          {selectedOrg && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">{selectedOrg.name}</h2>
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{selectedOrg.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Contact Person</p>
                        <p className="font-medium">{selectedOrg.contact_person}</p>
                      </div>
                      {selectedOrg.contact_phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{selectedOrg.contact_phone}</p>
                        </div>
                      )}
                      {selectedOrg.website && (
                        <div>
                          <p className="text-sm text-gray-600">Website</p>
                          <a 
                            href={selectedOrg.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {selectedOrg.website}
                          </a>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Created</p>
                        <p className="font-medium">{new Date(selectedOrg.created_at).toLocaleDateString()}</p>
                      </div>
                      {selectedOrg.description && (
                        <div>
                          <p className="text-sm text-gray-600">Description</p>
                          <p className="font-medium">{selectedOrg.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Your Role & Status</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Your Role</p>
                        <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                          selectedOrg.userRole === 'owner' 
                            ? 'bg-purple-100 text-purple-800' 
                            : selectedOrg.userRole === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedOrg.userRole}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Organization Status</p>
                        <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                          selectedOrg.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : selectedOrg.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedOrg.status}
                        </span>
                      </div>
                      {selectedOrg.status === 'pending' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">
                                Pending Approval
                              </h3>
                              <div className="mt-2 text-sm text-yellow-700">
                                <p>
                                  Your organization is currently under review. You'll be notified once it's approved.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Details - Only show if user has no organizations */}
        {userOrganizations.length === 0 && user && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              User Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium">{user.user_metadata?.name || user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 