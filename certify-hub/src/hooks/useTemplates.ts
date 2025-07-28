import { useState, useEffect, useCallback } from 'react';
import { templateService } from '@/services/templateService';
import type { Template } from '@/types/template';

interface TemplateWithCount extends Template {
  certificateCount: number;
}

interface UseTemplatesOptions {
  publisherId: string;
  autoFetch?: boolean;
}

interface UseTemplatesReturn {
  templates: TemplateWithCount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTemplates(options: UseTemplatesOptions): UseTemplatesReturn {
  const { publisherId, autoFetch = true } = options;
  const [templates, setTemplates] = useState<TemplateWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!publisherId) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await templateService.getTemplatesWithCounts(publisherId);
      setTemplates(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates';
      setError(errorMessage);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [publisherId]);

  useEffect(() => {
    if (autoFetch && publisherId) {
      fetchTemplates();
    }
  }, [fetchTemplates, autoFetch, publisherId]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates
  };
}