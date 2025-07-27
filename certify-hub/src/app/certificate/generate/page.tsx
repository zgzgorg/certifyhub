'use client';
import React, { useState, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import CertificatePreview from "@/components/CertificatePreview";
import { TemplateGridSelector } from "@/components/TemplateGridSelector";
import { FieldEditor } from "@/components/FieldEditor";
import { PDFGenerateButton } from "@/components/PDFGenerateButton";
import { BulkGenerationModal } from "@/components/BulkGenerationModal";
import { useDatabaseTemplates } from "@/hooks/useDatabaseTemplates";
import { useBulkGeneration } from "@/hooks/useBulkGeneration";
import { useTemplateMetadata } from "@/hooks/useTemplateMetadata";
import { MAX_PREVIEW_WIDTH, MAX_PREVIEW_HEIGHT } from "@/config/certificate";
import { getNewFieldPosition } from "@/utils/template";
import { CertificatePreviewRef } from "@/types/certificate";
import { CertificateField } from "@/types/certificate";
import { Template } from "@/types/template";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export default function CertificateGeneratePage() {
  const { user } = useAuth();
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const previewRef = useRef<CertificatePreviewRef | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<Record<string, CertificateField[]>>({});
  const [showAdjustDetails, setShowAdjustDetails] = useState(false);
  const [localTemplates, setLocalTemplates] = useState<Template[]>([]);

  // Database templates
  const {
    templates,
    loading: templatesLoading,
    refetch: refetchTemplates,
  } = useDatabaseTemplates();

  // Template metadata hook
  const { getPublicTemplateMetadata, getUserDefaultMetadata } = useTemplateMetadata();

  // Bulk generation
  const {
    bulkOpen,
    setBulkOpen,
    bulkRows,
    exportProgress,
    exporting,
    errorMessage,
    showError,
    bulkFileInputRef,
    handleBulkCellChange,
    handleBulkAddRow,
    handleBulkDeleteRow,
    handleBulkPaste,
    handleBulkFile,
    handleBulkExportPDF,
    clearError,
  } = useBulkGeneration();

  const selectedTemplateObj = selectedTemplate 
    ? templates.find(tpl => tpl.id === selectedTemplate) || 
      localTemplates.find(tpl => tpl.id === selectedTemplate) || null 
    : null;

  const fields = templateFields[selectedTemplate || ''] || [];

  // Current editable fields (excluding hidden fields)
  const editableFields = fields.filter(f => f.showInPreview);

  // Load template metadata and initialize fields
  const loadTemplateMetadata = async (templateId: string) => {
    try {
      // First try to get user's default metadata for this template (if logged in)
      if (user) {
        const userMetadata = await getUserDefaultMetadata(templateId);
        if (userMetadata) {
          // Use user's default metadata
          const metadataFields = userMetadata.metadata.map((field: {
            id: string;
            label: string;
            position: { x: number; y: number };
            required: boolean;
            fontSize: number;
            fontFamily: string;
            color: string;
            textAlign: 'left' | 'center' | 'right';
            showInPreview: boolean;
          }) => ({
            id: field.id,
            label: field.label,
            value: '',
            position: field.position,
            required: field.required,
            fontSize: field.fontSize,
            fontFamily: field.fontFamily,
            color: field.color,
            textAlign: field.textAlign,
            showInPreview: field.showInPreview,
          }));
          setTemplateFields(prev => ({ ...prev, [templateId]: metadataFields }));
          return;
        }
      }

      // If no user metadata, try to get any default metadata for this template (public access)
      const anyMetadata = await getPublicTemplateMetadata(templateId);

      if (anyMetadata) {
        // Use any available default metadata
        const metadataFields = anyMetadata.metadata.map((field: {
          id: string;
          label: string;
          position: { x: number; y: number };
          required: boolean;
          fontSize: number;
          fontFamily: string;
          color: string;
          textAlign: 'left' | 'center' | 'right';
          showInPreview: boolean;
        }) => ({
          id: field.id,
          label: field.label,
          value: '',
          position: field.position,
          required: field.required,
          fontSize: field.fontSize,
          fontFamily: field.fontFamily,
          color: field.color,
          textAlign: field.textAlign,
          showInPreview: field.showInPreview,
        }));
        setTemplateFields(prev => ({ ...prev, [templateId]: metadataFields }));
        return;
      }

      // If no metadata found, use default fields
      const defaultFields: CertificateField[] = [
        { 
          id: 'name', 
          label: 'Name', 
          value: '', 
          position: { x: 285, y: 180 }, 
          required: true, 
          fontSize: 32, 
          fontFamily: 'serif', 
          color: '#1a237e', 
          showInPreview: true 
        },
        { 
          id: 'date', 
          label: 'Date', 
          value: '', 
          position: { x: 285, y: 280 }, 
          required: true, 
          fontSize: 20, 
          fontFamily: 'serif', 
          color: '#333333', 
          showInPreview: true 
        },
        { 
          id: 'certificateId', 
          label: 'Certificate ID', 
          value: '', 
          position: { x: 480, y: 400 }, 
          required: true, 
          fontSize: 14, 
          fontFamily: 'monospace', 
          color: '#888888', 
          showInPreview: true 
        },
      ];
      setTemplateFields(prev => ({ ...prev, [templateId]: defaultFields }));
    } catch (error) {
      console.error('Error loading template metadata:', error);
      // Fallback to default fields
      const defaultFields: CertificateField[] = [
        { 
          id: 'name', 
          label: 'Name', 
          value: '', 
          position: { x: 285, y: 180 }, 
          required: true, 
          fontSize: 32, 
          fontFamily: 'serif', 
          color: '#1a237e', 
          showInPreview: true 
        },
        { 
          id: 'date', 
          label: 'Date', 
          value: '', 
          position: { x: 285, y: 280 }, 
          required: true, 
          fontSize: 20, 
          fontFamily: 'serif', 
          color: '#333333', 
          showInPreview: true 
        },
        { 
          id: 'certificateId', 
          label: 'Certificate ID', 
          value: '', 
          position: { x: 480, y: 400 }, 
          required: true, 
          fontSize: 14, 
          fontFamily: 'monospace', 
          color: '#888888', 
          showInPreview: true 
        },
      ];
      setTemplateFields(prev => ({ ...prev, [templateId]: defaultFields }));
    }
  };

  // Template management handlers
  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplate(templateId);
    
    // Initialize fields for template if not exists
    if (!templateFields[templateId]) {
      await loadTemplateMetadata(templateId);
    }
  };

  const handleTemplateUpload = (file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert("Only image files (PNG, JPEG, SVG) are supported.");
      return false;
    }

    // Create a local template object
    const localTemplateId = `local_${Date.now()}`;
    const localTemplate: Template = {
      id: localTemplateId,
      name: file.name,
      description: 'Local template',
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      is_public: false,
      user_id: user?.id || 'local',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to local templates list
    setLocalTemplates(prev => [...prev, localTemplate]);
    
    // Select the local template
    setSelectedTemplate(localTemplateId);
    
    // Initialize empty fields for the local template
    setTemplateFields(prev => ({
      ...prev,
      [localTemplateId]: []
    }));
    
    // Show adjust details for local template
    setShowAdjustDetails(true);
    
    return true;
  };

  const handleTemplateDelete = async (templateId: string) => {
    // Check if it's a local template
    const isLocalTemplate = templateId.startsWith('local_');
    
    if (isLocalTemplate) {
      // Delete local template
      setLocalTemplates(prev => prev.filter(t => t.id !== templateId));
      
      // Clean up stored fields for this template
      setTemplateFields(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [templateId]: removed, ...rest } = prev;
        return rest;
      });
      
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
      }
      
      return;
    }
    
    // Delete database template
    if (!user) return;
    
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
      
      // Clean up stored fields for this template
      setTemplateFields(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [templateId]: removed, ...rest } = prev;
        return rest;
      });
      
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
      }
      
      // Refetch templates
      refetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  // const getCurrentFields = (): CertificateField[] => {
  //   if (!selectedTemplate) return [];
  //   return templateFields[selectedTemplate] || [];
  // };

  const updateCurrentTemplateFields = (
    updater: (fields: CertificateField[]) => CertificateField[]
  ) => {
    if (!selectedTemplate) return;
    
    setTemplateFields(prev => ({
      ...prev,
      [selectedTemplate]: updater(prev[selectedTemplate] || [])
    }));
  };

  // Field management handlers
  const handleFieldChange = (id: string, value: string) => {
    updateCurrentTemplateFields(fields => fields.map(f => f.id === id ? { ...f, value } : f));
  };

  const handleFieldLabelChange = (id: string, label: string) => {
    updateCurrentTemplateFields(fields => fields.map(f => f.id === id ? { ...f, label } : f));
  };

  const handleFieldFontSizeChange = (id: string, fontSize: number) => {
    updateCurrentTemplateFields(fields => fields.map(f => f.id === id ? { ...f, fontSize } : f));
  };

  const handleFieldFontFamilyChange = (id: string, fontFamily: string) => {
    updateCurrentTemplateFields(fields => fields.map(f => f.id === id ? { ...f, fontFamily } : f));
  };

  const handleFieldColorChange = (id: string, color: string) => {
    updateCurrentTemplateFields(fields => fields.map(f => f.id === id ? { ...f, color } : f));
  };

  const handleFieldTextAlignChange = (id: string, textAlign: 'left' | 'center' | 'right') => {
    updateCurrentTemplateFields(fields => fields.map(f => f.id === id ? { ...f, textAlign } : f));
  };

  const handleFieldShowToggle = (id: string, show: boolean) => {
    updateCurrentTemplateFields(fields => fields.map(f => f.id === id ? { ...f, showInPreview: show } : f));
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim() || !selectedTemplate) return;
    
    const position = getNewFieldPosition(selectedTemplate, fields.length);
    
    updateCurrentTemplateFields(fields => [
      ...fields,
      {
        id: uuidv4(),
        label: newFieldLabel.trim(),
        value: '',
        position,
        required: false,
        fontSize: 20,
        fontFamily: 'serif',
        color: '#1a237e',
        showInPreview: true,
      },
    ]);
    setNewFieldLabel("");
  };

  const handleDeleteField = (id: string) => {
    updateCurrentTemplateFields(fields => fields.filter(f => f.id !== id));
  };

  const handleFieldPositionChange = (id: string, x: number, y: number) => {
    updateCurrentTemplateFields(fields => fields.map(f => f.id === id ? { ...f, position: { x, y } } : f));
  };

  // Bulk generation handlers
  const handleBulkPasteWrapper = (e: React.ClipboardEvent<HTMLDivElement>) => {
    handleBulkPaste(e, editableFields);
  };

  const handleBulkFileWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleBulkFile(e, editableFields);
  };

  const handleBulkExportPDFWrapper = () => {
    if (selectedTemplateObj) {
      // Convert Template to CertificateTemplate for bulk export
      const certificateTemplate = {
        id: selectedTemplateObj.id,
        name: selectedTemplateObj.name,
        description: selectedTemplateObj.description || '',
        thumbnail: selectedTemplateObj.file_url,
      };
      handleBulkExportPDF(certificateTemplate, editableFields, previewRef);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center py-10">
      <div className="w-full max-w-7xl flex flex-col md:flex-row gap-8 items-start justify-center px-2 md:px-8">
        {/* Left: Field Management */}
        <div className="flex-1 min-w-[320px] max-w-md space-y-6 bg-white rounded-xl shadow p-6">
          
          <TemplateGridSelector
            templates={[...templates, ...localTemplates]}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
            onTemplateUpload={handleTemplateUpload}
            onTemplateDelete={handleTemplateDelete}
            loading={templatesLoading}
            onTemplatesUpdate={(updatedTemplates) => {
              // This will be handled by the useDatabaseTemplates hook
            }}
          />
          
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
            defaultShowDetails={false}
            showDetails={showAdjustDetails}
            onShowDetailsChange={setShowAdjustDetails}
          />
        </div>
        {/* Right: Preview Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-[320px] max-w-full bg-white rounded-xl shadow p-6">
          <div className="w-full flex flex-col items-center justify-center" style={{minHeight: 400}}>
            {selectedTemplateObj ? (
              <CertificatePreview
                ref={previewRef}
                template={{
                  id: selectedTemplateObj.id,
                  name: selectedTemplateObj.name,
                  description: selectedTemplateObj.description || '',
                  thumbnail: selectedTemplateObj.file_url,
                }}
                fields={fields}
                onFieldPositionChange={handleFieldPositionChange}
                maxWidth={MAX_PREVIEW_WIDTH}
                maxHeight={MAX_PREVIEW_HEIGHT}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-400" style={{minHeight: 300}}>
                <span>Please select a template to preview</span>
              </div>
            )}
          </div>
          {/* Action Buttons below preview */}
          <div className="w-full flex justify-center mt-6 gap-4">
            <PDFGenerateButton
              previewRef={previewRef}
              fields={fields}
              filename="sample_certificate.pdf"
              variant="secondary"
              className="px-6 py-2"
              disabled={!selectedTemplateObj}
            >
              Generate Sample
            </PDFGenerateButton>
            <button
              className="px-6 py-2 rounded-md bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              onClick={() => setBulkOpen(true)}
            >
              Bulk Generation
            </button>
          </div>
        </div>
      </div>
      <BulkGenerationModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        editableFields={editableFields}
        bulkRows={bulkRows}
        exporting={exporting}
        exportProgress={exportProgress}
        errorMessage={errorMessage}
        showError={showError}
        bulkFileInputRef={bulkFileInputRef}
        onBulkCellChange={handleBulkCellChange}
        onBulkAddRow={handleBulkAddRow}
        onBulkDeleteRow={handleBulkDeleteRow}
        onBulkPaste={handleBulkPasteWrapper}
        onBulkFile={handleBulkFileWrapper}
        onBulkExportPDF={handleBulkExportPDFWrapper}
        onClearError={clearError}
      />
    </div>
  );
}