import React, { useRef } from 'react';
import { CertificateTemplate } from '@/types/certificate';

interface TemplateSelectorProps {
  templates: CertificateTemplate[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateId: string) => void;
  onTemplateUpload: (file: File) => boolean;
  onTemplateDelete: (templateId: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onTemplateUpload,
  onTemplateDelete,
}) => {
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
      alert("Only SVG, PNG, or JPEG images are supported.");
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
      <div className="flex gap-4 flex-wrap">
        {templates.map((tpl) => (
          <div key={tpl.id} className="relative group w-32 h-40">
            <button
              type="button"
              onClick={() => onTemplateSelect(tpl.id)}
              className={`w-full h-full border-2 rounded-lg flex flex-col items-center justify-center p-2 transition
                ${selectedTemplate === tpl.id 
                  ? "border-indigo-500 bg-indigo-50 shadow" 
                  : "border-gray-200 bg-white hover:border-indigo-300"}`}
            >
              <img 
                src={tpl.thumbnail} 
                alt={tpl.name} 
                className="w-16 h-16 mb-2 object-contain" 
              />
              <span className="font-semibold text-gray-800 group-hover:text-indigo-600">
                {tpl.name}
              </span>
              <span className="text-xs text-gray-500 text-center mt-1">
                {tpl.description}
              </span>
              {selectedTemplate === tpl.id && (
                <span className="mt-2 text-xs text-indigo-600 font-bold">Selected</span>
              )}
            </button>
            {/* Delete button, only custom templates can be deleted */}
            {tpl.id !== 'classic-blue' && (
              <button
                className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-100 z-10"
                title="Delete template"
                onClick={() => onTemplateDelete(tpl.id)}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-4 h-4 text-red-500" 
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
        {/* Add Template Card */}
        <button
          type="button"
          onClick={handleUploadClick}
          className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition"
          title="Upload a new template"
        >
          <span className="text-4xl mb-2">+</span>
          <span className="font-semibold">Add Template</span>
        </button>
        <input
          type="file"
          accept="image/svg+xml,image/png,image/jpeg"
          ref={inputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};