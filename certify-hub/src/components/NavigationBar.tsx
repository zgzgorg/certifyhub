'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useIdentity } from '../contexts/IdentityContext';
import { UI_TEXT } from '@/constants/messages';
import { hasOrganizationAccess } from '@/utils/organizationAccess';
import IdentitySelector from './IdentitySelector';

export default function NavigationBar() {
  const { user, organization, organizationMembers, signOut } = useAuth();
  const { currentIdentity } = useIdentity();
  const pathname = usePathname();

  // Check if user has organization access
  const userHasOrgAccess = hasOrganizationAccess({ user, organization, organizationMembers });

  // Check if current page matches
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="w-full bg-white shadow fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-blue-700 hover:text-blue-900">
            {UI_TEXT.NAVIGATION.CERTIFY_HUB}
          </Link>
          <Link 
            href="/certificate/generate" 
            className={`font-medium transition-colors ${
              isActive('/certificate/generate') 
                ? 'text-blue-700 border-b-2 border-blue-700' 
                : 'text-gray-700 hover:text-blue-700'
            }`}
          >
            Generate
          </Link>
          <Link 
            href="/certificate/templates" 
            className={`font-medium transition-colors ${
              isActive('/certificate/templates') 
                ? 'text-blue-700 border-b-2 border-blue-700' 
                : 'text-gray-700 hover:text-blue-700'
            }`}
          >
            Templates
          </Link>
          {userHasOrgAccess && (
            <Link 
              href="/certificates" 
              className={`font-medium transition-colors ${
                isActive('/certificates') 
                  ? 'text-blue-700 border-b-2 border-blue-700' 
                  : 'text-gray-700 hover:text-blue-700'
              }`}
            >
              Certificates
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className={`font-medium transition-colors ${
                  isActive('/dashboard') 
                    ? 'text-blue-700 border-b-2 border-blue-700' 
                    : 'text-gray-700 hover:text-blue-700'
                }`}
              >
                Dashboard
              </Link>

              <IdentitySelector />
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