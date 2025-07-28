import { useState, useEffect, useCallback, useMemo } from 'react';
import { certificateService } from '@/services/certificateService';
import type { Certificate } from '@/types/certificate';

interface UseCertificatesOptions {
  publisherId: string;
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
  const { publisherId, templateId, status, autoFetch = true } = options;
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => ({
    publisherId,
    ...(templateId && { templateId }),
    ...(status && { status })
  }), [publisherId, templateId, status]);

  const fetchCertificates = useCallback(async () => {
    if (!publisherId) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await certificateService.getCertificates(filters);
      setCertificates(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load certificates';
      setError(errorMessage);
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, publisherId]);

  const updateCertificate = useCallback(async (id: string, updates: Partial<Certificate>) => {
    try {
      setError(null);
      const updated = await certificateService.updateCertificate(id, updates);
      
      // Optimistic update
      setCertificates(prev => 
        prev.map(cert => cert.id === id ? { ...cert, ...updated } : cert)
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update certificate';
      setError(errorMessage);
      console.error('Error updating certificate:', err);
      throw err;
    }
  }, []);

  const deleteCertificate = useCallback(async (id: string) => {
    try {
      setError(null);
      await certificateService.deleteCertificate(id);
      
      // Optimistic update
      setCertificates(prev => prev.filter(cert => cert.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete certificate';
      setError(errorMessage);
      console.error('Error deleting certificate:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (autoFetch && publisherId) {
      fetchCertificates();
    }
  }, [fetchCertificates, autoFetch, publisherId]);

  return {
    certificates,
    loading,
    error,
    refetch: fetchCertificates,
    updateCertificate,
    deleteCertificate
  };
}