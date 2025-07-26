'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { UI_TEXT } from '@/constants/messages';

export default function NavigationBar() {
  const { user, organization, regularUser, signOut } = useAuth();

  return (
    <nav className="w-full bg-white shadow fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-blue-700 hover:text-blue-900">
            {UI_TEXT.NAVIGATION.CERTIFY_HUB}
          </Link>
          <Link href="/certificate/generate" className="text-gray-700 hover:text-blue-700 font-medium">
            {UI_TEXT.NAVIGATION.GENERATE_CERTIFICATE}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-700 font-medium">
                Dashboard
              </Link>
              {organization && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {organization.name}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    organization.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : organization.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {organization.status}
                  </span>
                </div>
              )}
              {regularUser && (
                <span className="text-sm text-gray-600">
                  {regularUser.name}
                </span>
              )}
              <button
                onClick={signOut}
                className="text-gray-700 hover:text-blue-700 font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-700 hover:text-blue-700 font-medium">
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 