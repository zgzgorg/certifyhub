import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { TemplateMetadata, TemplateMetadataCreateData, TemplateMetadataUpdateData } from '@/types/template';

export const useTemplateMetadata = (templateId?: string) => {
  const { user } = useAuth();
  const [metadata, setMetadata] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    if (!templateId || !user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('template_metadata')
        .select('*')
        .eq('template_id', templateId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMetadata(data || []);
    } catch (err) {
      console.error('Error fetching template metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
    } finally {
      setLoading(false);
    }
  }, [templateId, user?.id]);

  // New function to get public template metadata (no authentication required)
  const getPublicTemplateMetadata = useCallback(async (templateId: string): Promise<TemplateMetadata | null> => {
    if (!templateId) return null;

    try {
      // Get any default metadata for this template (public access)
      const { data, error } = await supabase
        .from('template_metadata')
        .select('*')
        .eq('template_id', templateId)
        .eq('is_default', true)
        .limit(1);

      if (error) {
        console.error('Error fetching public template metadata:', error);
        return null;
      }

      // Return the first result or null if no data
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error fetching public template metadata:', err);
      return null;
    }
  }, []);

  // New function to get user's default metadata for a template
  const getUserDefaultMetadata = useCallback(async (templateId: string): Promise<TemplateMetadata | null> => {
    if (!templateId || !user) return null;

    try {
      const { data, error } = await supabase
        .from('template_metadata')
        .select('*')
        .eq('template_id', templateId)
        .eq('user_id', user.id)
        .eq('is_default', true)
        .limit(1);

      if (error) {
        console.error('Error fetching user default metadata:', error);
        return null;
      }

      // Return the first result or null if no data
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error fetching user default metadata:', err);
      return null;
    }
  }, [user?.id]);

  const createMetadata = useCallback(async (metadataData: TemplateMetadataCreateData): Promise<TemplateMetadata | null> => {
    if (!user) return null;

    try {
      setError(null);

      // If this is set as default, unset other defaults for this template and user
      if (metadataData.is_default) {
        await supabase
          .from('template_metadata')
          .update({ is_default: false })
          .eq('template_id', metadataData.template_id)
          .eq('user_id', user.id)
          .eq('is_default', true);
      }

      const { data, error: createError } = await supabase
        .from('template_metadata')
        .insert({
          template_id: metadataData.template_id,
          name: metadataData.name,
          description: metadataData.description,
          is_default: metadataData.is_default,
          user_id: user.id,
          metadata: metadataData.metadata,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Refresh the metadata list
      await fetchMetadata();
      return data;
    } catch (err) {
      console.error('Error creating template metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to create metadata');
      return null;
    }
  }, [user?.id, fetchMetadata]);

  const updateMetadata = useCallback(async (metadataId: string, updateData: TemplateMetadataUpdateData): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      // If this is set as default, unset other defaults for this template and user
      if (updateData.is_default) {
        const currentMetadata = metadata.find(m => m.id === metadataId);
        if (currentMetadata) {
          await supabase
            .from('template_metadata')
            .update({ is_default: false })
            .eq('template_id', currentMetadata.template_id)
            .eq('user_id', user.id)
            .eq('is_default', true)
            .neq('id', metadataId);
        }
      }

      const { error: updateError } = await supabase
        .from('template_metadata')
        .update(updateData)
        .eq('id', metadataId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refresh the metadata list
      await fetchMetadata();
      return true;
    } catch (err) {
      console.error('Error updating template metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to update metadata');
      return false;
    }
  }, [user?.id, metadata, fetchMetadata]);

  const deleteMetadata = useCallback(async (metadataId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('template_metadata')
        .delete()
        .eq('id', metadataId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Refresh the metadata list
      await fetchMetadata();
      return true;
    } catch (err) {
      console.error('Error deleting template metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete metadata');
      return false;
    }
  }, [user?.id, fetchMetadata]);

  const getDefaultMetadata = useCallback((): TemplateMetadata | null => {
    return metadata.find(m => m.is_default) || null;
  }, [metadata]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    metadata,
    loading,
    error,
    fetchMetadata,
    createMetadata,
    updateMetadata,
    deleteMetadata,
    getDefaultMetadata,
    getPublicTemplateMetadata,
    getUserDefaultMetadata,
  };
}; 