'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentity } from '@/contexts/IdentityContext';
import { useTemplates } from '@/hooks/useTemplates';
import TemplateUploadModal from '@/components/TemplateUploadModal';
import TemplateCard from '@/components/TemplateCard';
import { TemplateMetadataEditor } from '@/components/TemplateMetadataEditor';
import { Template, TemplateMetadata } from '@/types/template';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button 
} from '@mui/material';

export default function TemplatesPage() {
  const { user } = useAuth();
  const { currentIdentity } = useIdentity();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState<TemplateMetadata | null>(null);
  const [updatingVisibility, setUpdatingVisibility] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Use the updated useTemplates hook with identity - only show owned templates
  const { templates, loading, error, refetch } = useTemplates({
    identity: currentIdentity || undefined,
    includePublic: false, // Only show templates owned by current identity
    autoFetch: !!currentIdentity
  });

  // Auto-refresh after upload/delete
  const handleTemplateUploaded = useCallback(() => {
    setIsUploadModalOpen(false);
    refetch();
  }, [refetch]);

  const handleTemplateDeleted = useCallback(async (templateId: string) => {
    try {
      // Delete from storage first
      const template = templates.find(t => t.id === templateId);
      if (template?.file_url) {
        const filePath = template.file_url.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('templates')
            .remove([filePath]);
        }
      }
      // Delete from database
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  }, [templates, refetch]);

  const handleManageMetadata = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setEditingMetadata(null);
    setIsMetadataEditorOpen(true);
  }, []);

  const handleEditMetadata = useCallback((template: Template, metadata: TemplateMetadata) => {
    setSelectedTemplate(template);
    setEditingMetadata(metadata);
    setIsMetadataEditorOpen(true);
  }, []);

  const handleMetadataSaved = useCallback(async (metadata: TemplateMetadata) => {
    if (!selectedTemplate) return;
    try {
      if (metadata.id) {
        // Update existing metadata
        const { error } = await supabase
          .from('template_metadata')
          .update({
            name: metadata.name,
            description: metadata.description,
            is_default: metadata.is_default,
            metadata: metadata.metadata,
          })
          .eq('id', metadata.id);
        if (error) throw error;
      } else {
        // Create new metadata
        const { error } = await supabase
          .from('template_metadata')
          .insert({
            template_id: selectedTemplate.id,
            name: metadata.name,
            description: metadata.description,
            is_default: metadata.is_default,
            user_id: user?.id,
            metadata: metadata.metadata,
          });
        if (error) throw error;
      }
      setIsMetadataEditorOpen(false);
      setSelectedTemplate(null);
      setEditingMetadata(null);
      refetch();
    } catch (error) {
      console.error('Error saving metadata:', error);
      alert('Failed to save metadata');
    }
  }, [selectedTemplate, user?.id, refetch]);

  const handleMetadataCancel = useCallback(() => {
    setIsMetadataEditorOpen(false);
    setSelectedTemplate(null);
    setEditingMetadata(null);
  }, []);

  const handleToggleVisibility = useCallback(async (templateId: string, isPublic: boolean) => {
    try {
      setUpdatingVisibility(templateId);
      
      const { error } = await supabase
        .from('templates')
        .update({ is_public: isPublic })
        .eq('id', templateId);
      
      if (error) throw error;
      
      // Show success message
      const template = templates.find(t => t.id === templateId);
      if (template) {
        alert(`Template "${template.name}" is now ${isPublic ? 'public' : 'private'}`);
      }
      
      // Refetch templates to update the UI
      await refetch();
      
      // Force a page refresh after a short delay to ensure all changes are reflected
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating template visibility:', error);
      alert('Failed to update template visibility');
    } finally {
      setUpdatingVisibility(null);
    }
  }, [refetch, templates]);

  if (!user) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Certificate Templates
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Login to manage your templates
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to upload and manage your certificate templates.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <Button variant="contained" color="primary">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <Button variant="outlined" color="primary">
                  Register
                </Button>
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!currentIdentity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading identity...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Certificate Templates</h1>
            <p className="mt-2 text-gray-600">
              Managing templates as {currentIdentity.type === 'personal' ? 'Personal' : currentIdentity.name}
              {currentIdentity.type === 'organization' && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {currentIdentity.role}
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Only showing templates you own. Public templates can be used by others, private templates are only visible to you.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Upload Template
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">Error loading templates: {error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-6">
              {currentIdentity.type === 'personal' 
                ? 'Get started by uploading your first certificate template'
                : `No templates created by ${currentIdentity.name} yet`
              }
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Upload Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDelete={handleTemplateDeleted}
                onManageMetadata={handleManageMetadata}
                onToggleVisibility={handleToggleVisibility}
                isUpdatingVisibility={updatingVisibility === template.id}
              />
            ))}
          </div>
        )}

        <TemplateUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploaded={handleTemplateUploaded}
        />

        {selectedTemplate && (
          <TemplateMetadataEditor
            template={selectedTemplate}
            metadata={editingMetadata || undefined}
            onSave={handleMetadataSaved}
            onCancel={handleMetadataCancel}
            isEditing={!!editingMetadata}
          />
        )}
      </div>
    </div>
  );
} 