'use client';
import React, { useState, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import CertificatePreview from "@/components/CertificatePreview";
import { TemplateSelector } from "@/components/TemplateSelector";
import { FieldEditor } from "@/components/FieldEditor";
import { BulkGenerationModal } from "@/components/BulkGenerationModal";
import { useCertificateTemplates } from "@/hooks/useCertificateTemplates";
import { useBulkGeneration } from "@/hooks/useBulkGeneration";
import { MAX_PREVIEW_WIDTH, MAX_PREVIEW_HEIGHT } from "@/config/certificate";
import { getNewFieldPosition } from "@/utils/template";


export default function CertificateGeneratePage() {
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const previewRef = useRef<{ exportToPDF: (filename?: string, returnBlob?: boolean) => Promise<Blob | void> } | null>(null);

  // Template management
  const {
    templates,
    selectedTemplate,
    selectedTemplateObj,
    selectTemplate,
    uploadTemplate,
    deleteTemplate,
    getCurrentFields,
    updateCurrentTemplateFields,
  } = useCertificateTemplates();

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

  const fields = getCurrentFields();

  // Current editable fields (excluding hidden fields)
  const editableFields = fields.filter(f => f.showInPreview);



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
      handleBulkExportPDF(selectedTemplateObj, editableFields, previewRef);
    }
  };


  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center py-10">
      <div className="w-full max-w-7xl flex flex-col md:flex-row gap-8 items-start justify-center px-2 md:px-8">
        {/* Left: Field Management */}
        <div className="flex-1 min-w-[320px] max-w-md space-y-6 bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Generate Certificate</h2>
          
          <TemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={selectTemplate}
            onTemplateUpload={uploadTemplate}
            onTemplateDelete={deleteTemplate}
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
          />
        </div>
        {/* Right: Preview Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-[320px] max-w-full bg-white rounded-xl shadow p-6">
          <div className="w-full flex flex-col items-center justify-center" style={{minHeight: 400}}>
            {selectedTemplateObj ? (
              <CertificatePreview
                ref={previewRef}
                template={selectedTemplateObj}
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
        </div>
      </div>
      {/* Bottom: Action Button */}
      <div className="w-full max-w-5xl flex justify-end mt-8 gap-4">
        <button
          className="px-6 py-2 rounded-md bg-indigo-500 text-white font-semibold shadow disabled:opacity-50"
          onClick={async () => {
            if (previewRef.current?.exportToPDF) {
              await previewRef.current.exportToPDF('certificate.pdf');
            }
          }}
        >
          Generate Certificate
        </button>
        <button
          className="px-6 py-2 rounded-md bg-green-600 text-white font-semibold shadow disabled:opacity-50"
          onClick={() => setBulkOpen(true)}
        >
          Bulk Generation
        </button>
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