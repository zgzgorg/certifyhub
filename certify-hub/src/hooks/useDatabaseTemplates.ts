import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Template } from '@/types/template';
import { UserIdentity } from '@/types/user';

interface UseDatabaseTemplatesOptions {
  identity?: UserIdentity;
}

export const useDatabaseTemplates = (options: UseDatabaseTemplatesOptions = {}) => {
  const { user } = useAuth();
  const { identity } = options;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (identity) {
        // Use identity-based filtering
        if (identity.type === 'personal') {
          // For personal identity, get templates created by the user (no organization_id) + public templates
          query = query.or(`user_id.eq.${identity.id},is_public.eq.true`).is('organization_id', null);
        } else {
          // For organization identity, get templates created by the organization + public templates
          query = query.or(`organization_id.eq.${identity.id},is_public.eq.true`);
        }
      } else {
        // Fallback to original logic - show public templates and user's templates
        query = query.or('is_public.eq.true' + (user?.id ? ',user_id.eq.' + user.id : ''));
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [user?.id, identity]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
  };
}; 