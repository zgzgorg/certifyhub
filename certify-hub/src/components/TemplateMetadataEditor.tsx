'use client';

import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CertificatePreview from "@/components/CertificatePreview";
import { FieldEditor } from "@/components/FieldEditor";
import { Template, TemplateMetadata } from '@/types/template';
import { CertificateField, CertificatePreviewRef } from '@/types/certificate';
import { MAX_PREVIEW_WIDTH, MAX_PREVIEW_HEIGHT } from "@/config/certificate";

interface TemplateMetadataEditorProps {
  template: Template;
  metadata?: TemplateMetadata;
  onSave: (metadata: TemplateMetadata) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export const TemplateMetadataEditor: React.FC<TemplateMetadataEditorProps> = ({
  template,
  metadata,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [name, setName] = useState(metadata?.name || 'V0');
  const [isDefault, setIsDefault] = useState(true);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [showCustomizeDetails, setShowCustomizeDetails] = useState(false);
  const [fields, setFields] = useState<CertificateField[]>(
    metadata?.metadata.map(f => ({
      id: f.id,
      label: f.label,
      value: '',
      position: f.position,
      required: f.required,
      showInPreview: f.showInPreview,
      fontSize: f.fontSize,
      fontFamily: f.fontFamily,
      color: f.color,
      textAlign: f.textAlign,
    })) || []
  );
  
  const previewRef = useRef<CertificatePreviewRef | null>(null);

  // Field management handlers
  const handleFieldChange = (id: string, value: string) => {
    setFields(fields => fields.map(f => f.id === id ? { ...f, value } : f));
  };

  const handleFieldLabelChange = (id: string, label: string) => {
    setFields(fields => fields.map(f => f.id === id ? { ...f, label } : f));
  };

  const handleFieldFontSizeChange = (id: string, fontSize: number) => {
    setFields(fields => fields.map(f => f.id === id ? { ...f, fontSize } : f));
  };

  const handleFieldFontFamilyChange = (id: string, fontFamily: string) => {
    setFields(fields => fields.map(f => f.id === id ? { ...f, fontFamily } : f));
  };

  const handleFieldColorChange = (id: string, color: string) => {
    setFields(fields => fields.map(f => f.id === id ? { ...f, color } : f));
  };

  const handleFieldTextAlignChange = (id: string, textAlign: 'left' | 'center' | 'right') => {
    setFields(fields => fields.map(f => f.id === id ? { ...f, textAlign } : f));
  };

  const handleFieldShowToggle = (id: string, show: boolean) => {
    setFields(fields => fields.map(f => f.id === id ? { ...f, showInPreview: show } : f));
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;
    
    // Get template dimensions from preview ref
    let templateWidth = 569; // Default fallback
    let templateHeight = 437; // Default fallback
    
    if (previewRef.current) {
      try {
        const dimensions = previewRef.current.getTemplateDimensions();
        templateWidth = dimensions.width;
        templateHeight = dimensions.height;
      } catch (error) {
        console.warn('Could not get template dimensions, using defaults');
      }
    }
    
    // Calculate center position
    const centerX = templateWidth / 2;
    const centerY = templateHeight / 2;
    
    // Calculate font size as 1/10 of template height
    const fontSize = Math.max(12, Math.min(48, Math.round(templateHeight / 10)));
    
    // Position new field in center, with slight offset for multiple fields
    const position = {
      x: centerX,
      y: centerY + (fields.length * 30) // Offset each new field by 30px
    };
    
    setFields(fields => [
      ...fields,
      {
        id: uuidv4(),
        label: newFieldLabel.trim(),
        value: '',
        position,
        required: false,
        fontSize,
        fontFamily: 'serif',
        color: '#1a237e',
        showInPreview: true,
        textAlign: 'center',
      },
    ]);
    setNewFieldLabel("");
  };

  const handleDeleteField = (id: string) => {
    setFields(fields => fields.filter(f => f.id !== id));
  };

  const handleFieldPositionChange = (id: string, x: number, y: number) => {
    setFields(fields => fields.map(f => f.id === id ? { ...f, position: { x, y } } : f));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name for the metadata');
      return;
    }

    const templateMetadata: TemplateMetadata = {
      id: metadata?.id || '',
      template_id: template.id,
      name: name.trim(),
      is_default: isDefault,
      user_id: template.user_id,
      metadata: fields.map(f => ({
        id: f.id,
        label: f.label,
        position: f.position,
        required: f.required,
        showInPreview: f.showInPreview || true,
        fontSize: f.fontSize || 20,
        fontFamily: f.fontFamily || 'serif',
        color: f.color || '#1a237e',
        textAlign: f.textAlign || 'center',
      })),
      created_at: metadata?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(templateMetadata);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">
            Edit Template Metadata
          </h2>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Metadata Form and Field Editor */}
          <div className="w-1/2 p-6 overflow-y-auto border-r">
            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">What is Template Metadata?</h3>
              <p className="text-sm text-blue-700 mb-3">
                Template metadata defines the dynamic fields that will appear on certificates generated from this template. 
                These fields can be customized for each certificate generation, such as recipient name, date, course title, etc.
              </p>
              <button
                onClick={() => setShowCustomizeDetails(!showCustomizeDetails)}
                className="text-sm font-semibold text-blue-800 hover:text-blue-600 flex items-center gap-1"
              >
                {showCustomizeDetails ? '▼' : '▶'} Click to see how to customize
              </button>
              {showCustomizeDetails && (
                <div className="mt-3">
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Add new fields using the "Add Field" section below</li>
                    <li>• Drag fields in the preview to position them on the certificate</li>
                    <li>• Customize font size, family, color, and alignment for each field</li>
                    <li>• Toggle "Show in Preview" to control field visibility</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  disabled={true}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                  Currently we only support default metadata editing
                </label>
              </div>
            </div>

            {/* Field Editor */}
            <FieldEditor
              fields={fields}
              newFieldLabel={newFieldLabel}
              onNewFieldLabelChange={setNewFieldLabel}
              onFieldLabelChange={handleFieldLabelChange}
              onFieldValueChange={handleFieldChange}
              onFieldFontSizeChange={handleFieldFontSizeChange}
              onFieldFontFamilyChange={handleFieldFontFamilyChange}
              onFieldColorChange={handleFieldColorChange}
              onFieldTextAlignChange={handleFieldTextAlignChange}
              onFieldShowToggle={handleFieldShowToggle}
              onFieldDelete={handleDeleteField}
              onFieldAdd={handleAddField}
            />
          </div>

          {/* Right: Preview */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>
            <div className="flex justify-center">
              <CertificatePreview
                ref={previewRef}
                template={{
                  id: template.id,
                  name: template.name,
                  description: template.description || '',
                  thumbnail: template.file_url,
                }}
                fields={fields}
                onFieldPositionChange={handleFieldPositionChange}
                maxWidth={MAX_PREVIEW_WIDTH}
                maxHeight={MAX_PREVIEW_HEIGHT}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 