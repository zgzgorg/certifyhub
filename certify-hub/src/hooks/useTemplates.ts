import { useState, useEffect, useCallback } from 'react';
import { templateService } from '@/services/templateService';
import type { Template } from '@/types/template';
import type { UserIdentity } from '@/types/user';

interface TemplateWithCount extends Template {
  certificateCount: number;
}

interface UseTemplatesOptions {
  publisherId?: string;
  identity?: UserIdentity;
  includePublic?: boolean;
  autoFetch?: boolean;
}

interface UseTemplatesReturn {
  templates: TemplateWithCount[] | Template[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTemplates(options: UseTemplatesOptions): UseTemplatesReturn {
  const { publisherId, identity, includePublic = false, autoFetch = true } = options;
  const [templates, setTemplates] = useState<TemplateWithCount[] | Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!publisherId && !identity) return;

    try {
      setLoading(true);
      setError(null);

      let data: TemplateWithCount[] | Template[];
      if (identity) {
        data = await templateService.getTemplatesByIdentity(identity, includePublic);
      } else if (publisherId) {
        data = await templateService.getTemplatesWithCounts(publisherId);
      } else {
        data = [];
      }

      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [publisherId, identity, includePublic]);

  useEffect(() => {
    if (autoFetch && (publisherId || identity)) {
      fetchTemplates();
    }
  }, [fetchTemplates, autoFetch, publisherId, identity, includePublic]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates
  };
}