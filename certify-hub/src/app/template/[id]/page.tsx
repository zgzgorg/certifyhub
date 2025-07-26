'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Template } from '@/types/template';

export default function TemplatePreviewPage() {
  const params = useParams();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('share_url', `${window.location.origin}/template/${params.id}`)
        .eq('is_public', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Template not found or not public');
        } else {
          throw error;
        }
      } else {
        setTemplate(data);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchTemplate();
    }
  }, [params.id, fetchTemplate]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Template Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This template does not exist or is not public'}</p>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
            {template.description && (
              <p className="text-blue-100 text-lg">{template.description}</p>
            )}
          </div>

          {/* Template Preview */}
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Preview</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                {template.file_type.startsWith('image/') ? (
                  <img
                    src={template.file_url}
                    alt={template.name}
                    className="max-w-full h-auto mx-auto max-h-96 object-contain"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600">{template.file_name}</p>
                    <button
                      onClick={() => window.open(template.file_url, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      View Full Template
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Template Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Name:</span>
                    <span className="font-medium">{template.file_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Size:</span>
                    <span className="font-medium">{formatFileSize(template.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Type:</span>
                    <span className="font-medium">{template.file_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uploaded:</span>
                    <span className="font-medium">
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => window.open(template.file_url, '_blank')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Download Template
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Share URL copied to clipboard!');
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Copy Share Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 