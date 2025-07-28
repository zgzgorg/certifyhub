import React, { useRef, useState } from 'react';
import { Template } from '@/types/template';
import { useAuth } from '@/contexts/AuthContext';

interface TemplateGridSelectorProps {
  templates: Template[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateId: string) => void;
  onTemplateUpload: (file: File) => boolean;
  onTemplateDelete: (templateId: string) => void;
  loading?: boolean;
  onTemplatesUpdate?: (templates: Template[]) => void;
}

export const TemplateGridSelector: React.FC<TemplateGridSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onTemplateUpload,
  onTemplateDelete,
  loading = false,
  onTemplatesUpdate,
}) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const success = onTemplateUpload(file);
    if (!success) {
      alert("Only image files (PNG, JPEG, GIF, WebP) are supported. PDF files are not supported.");
    }
    
    // Clear the input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (fileType === 'application/pdf') {
      return (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
          <button
            type="button"
            onClick={handleUploadClick}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Use Local Template
          </button>
        </div>
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse flex-shrink-0">
              <div className="w-32 h-24 bg-gray-200 rounded-lg"></div>
              <div className="mt-2 space-y-1">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
        <button
          type="button"
          onClick={handleUploadClick}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Use Local Template
        </button>
      </div>
      
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
        {templates.map((template) => (
          <div key={template.id} className="relative group flex-shrink-0">
            <button
              type="button"
              onClick={() => onTemplateSelect(template.id)}
              className={`w-32 bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 ${
                selectedTemplate === template.id 
                  ? "ring-2 ring-indigo-500 shadow-md" 
                  : "hover:shadow-md"
              }`}
            >
              {/* Template Thumbnail */}
              <div className="relative h-20 bg-gray-100 overflow-hidden">
                {template.file_type.startsWith('image/') ? (
                  <img 
                    src={template.file_url} 
                    alt={template.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileTypeIcon(template.file_type)}
                  </div>
                )}
                
                {/* Public/Private Badge */}
                <div className="absolute top-1 right-1">
                  <span className={`px-1 py-0.5 text-xs rounded-full ${
                    template.is_public 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                
                {/* Selected Indicator */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-1 left-1 bg-indigo-500 text-white rounded-full p-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-2">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {template.name}
                </h4>
                <p className="text-xs text-gray-500 truncate mt-1">
                  Published by {template.user_id === user?.id ? 'You' : 'Organization'}
                </p>
              </div>
            </button>
            
            {/* Delete button for local templates only */}
            {template.id.startsWith('local_') && (
              <button
                className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow hover:bg-red-100 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete template"
                onClick={(e) => {
                  e.stopPropagation();
                  onTemplateDelete(template.id);
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-3 h-3 text-red-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m5 0H6" 
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      
      <input
        type="file"
        accept="image/svg+xml,image/png,image/jpeg"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}; 