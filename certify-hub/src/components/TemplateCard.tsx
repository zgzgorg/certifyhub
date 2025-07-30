'use client';

import { useState, useCallback, memo } from 'react';
import { Template } from '@/types/template';

interface TemplateCardProps {
  template: Template;
  onDelete: (templateId: string) => void;
  onManageMetadata: (template: Template) => void;
  onToggleVisibility?: (templateId: string, isPublic: boolean) => void;
  isUpdatingVisibility?: boolean;
}

function TemplateCard({ template, onDelete, onManageMetadata, onToggleVisibility, isUpdatingVisibility }: TemplateCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getFileIcon = useCallback((fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType === 'application/pdf') {
      return (
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  }, []);

  const copyShareUrl = useCallback(async () => {
    if (template.share_url) {
      try {
        await navigator.clipboard.writeText(template.share_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  }, [template.share_url]);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    onDelete(template.id);
  }, [template.id, onDelete]);

  const handleViewTemplate = useCallback(() => {
    window.open(template.file_url, '_blank');
  }, [template.file_url]);

  const handleManageMetadata = useCallback(() => {
    onManageMetadata(template);
  }, [template, onManageMetadata]);

  const handleToggleVisibility = useCallback(() => {
    if (onToggleVisibility) {
      onToggleVisibility(template.id, !template.is_public);
    }
  }, [template.id, template.is_public, onToggleVisibility]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Template Thumbnail */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {template.file_url && !imageError && template.file_type?.startsWith('image/') ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <img
              src={template.file_url}
              alt={template.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          </>
        ) : template.file_url && template.file_type === 'application/pdf' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
            <div className="mb-2">
              <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">PDF Template</p>
              <p className="text-xs text-gray-500">{template.file_name}</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getFileIcon(template.file_type || '')}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 text-xs rounded-full ${
            template.is_public 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {template.is_public ? 'Public' : 'Private'}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {template.name}
          </h3>
          <p className="text-sm text-gray-500">
            {template.file_name}
          </p>
        </div>

        {template.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>File size:</span>
            <span>{formatFileSize(template.file_size)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Uploaded:</span>
            <span>{new Date(template.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleViewTemplate}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-md transition-colors"
          >
            View Template
          </button>
          
          {template.share_url && (
            <button
              onClick={copyShareUrl}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded-md transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Share URL'}
            </button>
          )}
        </div>

        <div className="mt-3 flex space-x-2">
          <button
            onClick={handleManageMetadata}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-md transition-colors"
          >
            Manage Metadata
          </button>
          {onToggleVisibility && (
            <button
              onClick={handleToggleVisibility}
              disabled={isUpdatingVisibility}
              className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors ${
                template.is_public
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } ${isUpdatingVisibility ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={template.is_public ? 'Make this template private (only you can see it)' : 'Make this template public (others can see and use it)'}
            >
              {isUpdatingVisibility ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                template.is_public ? 'Make Private' : 'Make Public'
              )}
            </button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-red-600 hover:text-red-800 text-sm py-2 px-3 rounded-md hover:bg-red-50 transition-colors"
          >
            Delete Template
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Template
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{template.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Use memo to wrap component and export correctly
export default memo(TemplateCard); 