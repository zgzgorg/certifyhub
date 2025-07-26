'use client';

import { useState } from 'react';
import { Template } from '@/types/template';

interface TemplateCardProps {
  template: Template;
  onDelete: (templateId: string) => void;
  onManageMetadata: (template: Template) => void;
}

export default function TemplateCard({ template, onDelete, onManageMetadata }: TemplateCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const copyShareUrl = async () => {
    if (template.share_url) {
      try {
        await navigator.clipboard.writeText(template.share_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(template.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getFileIcon(template.file_type)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate max-w-48">
                {template.name}
              </h3>
              <p className="text-sm text-gray-500">
                {template.file_name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              template.is_public 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {template.is_public ? 'Public' : 'Private'}
            </span>
          </div>
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
            onClick={() => window.open(template.file_url, '_blank')}
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
            onClick={() => onManageMetadata(template)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-md transition-colors"
          >
            Manage Metadata
          </button>
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