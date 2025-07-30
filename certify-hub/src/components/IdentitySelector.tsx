'use client';

import { useState, useRef, useEffect } from 'react';
import { useIdentity } from '../contexts/IdentityContext';
import { UserIdentity } from '../types/user';

export default function IdentitySelector() {
  const { currentIdentity, availableIdentities, switchIdentity } = useIdentity();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!currentIdentity || availableIdentities.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {currentIdentity?.name || 'Loading...'}
        </span>
        {currentIdentity?.type === 'organization' && (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            {currentIdentity.role}
          </span>
        )}
      </div>
    );
  }

  const handleIdentitySelect = (identity: UserIdentity) => {
    switchIdentity(identity);
    setIsOpen(false);
  };

  const getIdentityIcon = (identity: UserIdentity) => {
    return identity.type === 'personal' ? '👤' : '🏢';
  };

  const getIdentityBadge = (identity: UserIdentity) => {
    if (identity.type === 'organization' && identity.role) {
      return (
        <span className={`px-2 py-1 text-xs rounded-full ${
          identity.role === 'owner' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-blue-100 text-blue-800'
        }`}>
          {identity.role}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-700 hover:bg-gray-50 rounded-md transition-colors"
      >
        <span>{getIdentityIcon(currentIdentity)}</span>
        <span className="font-medium">{currentIdentity.name}</span>
        {getIdentityBadge(currentIdentity)}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {availableIdentities.map((identity) => (
              <button
                key={`${identity.type}-${identity.id}`}
                onClick={() => handleIdentitySelect(identity)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  currentIdentity.id === identity.id && currentIdentity.type === identity.type
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{getIdentityIcon(identity)}</span>
                    <span className="font-medium">{identity.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getIdentityBadge(identity)}
                    {currentIdentity.id === identity.id && currentIdentity.type === identity.type && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 