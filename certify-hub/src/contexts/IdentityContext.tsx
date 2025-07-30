'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { UserIdentity } from '../types/user';
import { debug } from '../utils/debug';

interface IdentityContextType {
  currentIdentity: UserIdentity | null;
  availableIdentities: UserIdentity[];
  switchIdentity: (identity: UserIdentity) => void;
  loading: boolean;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const { user, organization, organizationMembers } = useAuth();
  const [currentIdentity, setCurrentIdentity] = useState<UserIdentity | null>(null);
  const [availableIdentities, setAvailableIdentities] = useState<UserIdentity[]>([]);
  const [loading, setLoading] = useState(true);

  // Build available identities from user data
  const buildIdentities = useCallback(() => {
    if (!user) {
      setAvailableIdentities([]);
      setCurrentIdentity(null);
      return;
    }

    const identities: UserIdentity[] = [];

    // Add personal identity
    identities.push({
      type: 'personal',
      id: user.id,
      name: user.user_metadata?.name || user.email || 'Personal',
    });

    // Add organization identities (only for admin+ roles)
    if (organizationMembers) {
      organizationMembers.forEach((member) => {
        if (member.role === 'owner' || member.role === 'admin') {
          if (member.organizations) {
            identities.push({
              type: 'organization',
              id: member.organizations.id,
              name: member.organizations.name,
              role: member.role,
              organization: member.organizations,
            });
          }
        }
      });
    }

    // Add current organization if user owns it
    if (organization && organization.owner_id === user.id) {
      const existingOrgIdentity = identities.find(
        (identity) => identity.type === 'organization' && identity.id === organization.id
      );
      if (!existingOrgIdentity) {
        identities.push({
          type: 'organization',
          id: organization.id,
          name: organization.name,
          role: 'owner',
          organization: organization,
        });
      }
    }

    setAvailableIdentities(identities);

    // Set default identity (personal first, then first organization)
    const defaultIdentity = identities.find(identity => identity.type === 'personal') || identities[0];
    setCurrentIdentity(defaultIdentity || null);
  }, [user, organization, organizationMembers]);

  useEffect(() => {
    debug.identity('Building identities...');
    setLoading(true);
    buildIdentities();
    setLoading(false);
  }, [buildIdentities]);

  const switchIdentity = useCallback((identity: UserIdentity) => {
    debug.identity(`Switching to identity: ${identity.type} - ${identity.name}`);
    setCurrentIdentity(identity);
    
    // Store in localStorage for persistence
    localStorage.setItem('currentIdentity', JSON.stringify(identity));
  }, []);

  // Load saved identity from localStorage on mount
  useEffect(() => {
    const savedIdentity = localStorage.getItem('currentIdentity');
    if (savedIdentity && availableIdentities.length > 0) {
      try {
        const parsedIdentity = JSON.parse(savedIdentity);
        const isValidIdentity = availableIdentities.some(
          identity => identity.id === parsedIdentity.id && identity.type === parsedIdentity.type
        );
        
        if (isValidIdentity) {
          setCurrentIdentity(parsedIdentity);
        }
      } catch (error) {
        debug.warn('Failed to parse saved identity:', error);
      }
    }
  }, [availableIdentities]);

  const value = {
    currentIdentity,
    availableIdentities,
    switchIdentity,
    loading,
  };

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const context = useContext(IdentityContext);
  if (context === undefined) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
} 