'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import TemplateUploadModal from '@/components/TemplateUploadModal';
import TemplateCard from '@/components/TemplateCard';
import { TemplateMetadataEditor } from '@/components/TemplateMetadataEditor';
import { Template, TemplateMetadata } from '@/types/template';

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState<TemplateMetadata | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user, fetchTemplates]);

  const handleTemplateUploaded = () => {
    fetchTemplates();
    setIsUploadModalOpen(false);
  };

  const handleTemplateDeleted = async (templateId: string) => {
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
      
      // Refresh templates
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleManageMetadata = (template: Template) => {
    setSelectedTemplate(template);
    setEditingMetadata(null);
    setIsMetadataEditorOpen(true);
  };

  const handleEditMetadata = (template: Template, metadata: TemplateMetadata) => {
    setSelectedTemplate(template);
    setEditingMetadata(metadata);
    setIsMetadataEditorOpen(true);
  };

  const handleMetadataSaved = async (metadata: TemplateMetadata) => {
    if (!selectedTemplate) return;

    try {
      if (editingMetadata) {
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
    } catch (error) {
      console.error('Error saving metadata:', error);
      alert('Failed to save metadata');
    }
  };

  const handleMetadataCancel = () => {
    setIsMetadataEditorOpen(false);
    setSelectedTemplate(null);
    setEditingMetadata(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please login to access templates</h1>
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
            <p className="mt-2 text-gray-600">Manage your certificate templates</p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Upload Template
          </button>
        </div>

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
            <p className="text-gray-600 mb-6">Get started by uploading your first certificate template</p>
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