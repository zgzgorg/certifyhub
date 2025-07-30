import { useState, useEffect, useCallback, useMemo } from 'react';
import { certificateService } from '@/services/certificateService';
import type { Certificate } from '@/types/certificate';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentity } from '@/contexts/IdentityContext';

interface UseCertificatesOptions {
  publisherId?: string;
  recipientEmail?: string;
  templateId?: string | null;
  status?: 'active' | 'revoked' | 'expired';
  autoFetch?: boolean;
}

interface UseCertificatesReturn {
  certificates: Certificate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateCertificate: (id: string, updates: Partial<Certificate>) => Promise<void>;
  deleteCertificate: (id: string) => Promise<void>;
}

export function useCertificates(options: UseCertificatesOptions): UseCertificatesReturn {
  const { publisherId, recipientEmail, templateId, status, autoFetch = true } = options;
  const { user, organization, organizationMembers } = useAuth();
  const { currentIdentity } = useIdentity();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const securityContext = useMemo(() => {
    return {
      user,
      isAuthenticated: !!user,
      organizationMemberships: organizationMembers || [],
      ownedOrganizations: organization ? [{ id: organization.id, name: organization.name }] : []
    };
  }, [user, organization, organizationMembers]);

  const filters = useMemo(() => ({
    ...(publisherId && { publisherId }),
    ...(recipientEmail && { recipientEmail }),
    ...(templateId && { templateId }),
    ...(status && { status })
  }), [publisherId, recipientEmail, templateId, status]);

  const fetchCertificates = useCallback(async () => {
    if (!securityContext.isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await certificateService.getCertificates(filters, securityContext);
      setCertificates(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load certificates';
      setError(errorMessage);
      // Don't log sensitive error details
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching certificates:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, securityContext]);

  const updateCertificate = useCallback(async (id: string, updates: Partial<Certificate>) => {
    try {
      setError(null);
      const updated = await certificateService.updateCertificate(id, updates, securityContext);
      
      // Optimistic update
      setCertificates(prev => 
        prev.map(cert => cert.id === id ? { ...cert, ...updated } : cert)
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update certificate';
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating certificate:', err);
      }
      throw err;
    }
  }, [securityContext]);

  const deleteCertificate = useCallback(async (id: string) => {
    try {
      setError(null);
      await certificateService.deleteCertificate(id, securityContext);
      
      // Optimistic update
      setCertificates(prev => prev.filter(cert => cert.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete certificate';
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting certificate:', err);
      }
      throw err;
    }
  }, [securityContext]);

  useEffect(() => {
    if (autoFetch && securityContext.isAuthenticated) {
      fetchCertificates();
    }
  }, [fetchCertificates, autoFetch, securityContext.isAuthenticated]);

  return {
    certificates,
    loading,
    error,
    refetch: fetchCertificates,
    updateCertificate,
    deleteCertificate
  };
}