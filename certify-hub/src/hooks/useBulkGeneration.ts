import React, { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { BulkGenerationRow, CertificateField, CertificateTemplate } from '@/types/certificate';
import { parseExcelData, parseExcelFile } from '@/utils/excel';
import CertificatePreview from '@/components/CertificatePreview';
import { generatePDFsAsZip } from '@/utils/pdfGenerator';

export const useBulkGeneration = () => {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkGenerationRow[]>([{ id: uuidv4() }]);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exporting, setExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const handleBulkCellChange = useCallback((rowIdx: number, fieldId: string, value: string) => {
    setBulkRows(rows => rows.map((row, idx) => 
      idx === rowIdx ? { ...row, [fieldId]: value } : row
    ));
  }, []);

  const handleBulkAddRow = useCallback(() => {
    setBulkRows(rows => [...rows, { id: uuidv4() }]);
  }, []);

  const handleBulkDeleteRow = useCallback((rowIdx: number) => {
    setBulkRows(rows => rows.filter((_, idx) => idx !== rowIdx));
  }, []);

  const handleBulkPaste = useCallback((
    e: React.ClipboardEvent<HTMLDivElement>, 
    editableFields: CertificateField[]
  ) => {
    const text = e.clipboardData.getData('text/plain');
    const result = parseExcelData(text, editableFields);
    
    if (result.error) {
      setErrorMessage(result.error);
      setShowError(true);
    } else if (result.rows.length > 0) {
      setBulkRows(result.rows);
      setErrorMessage(null);
      setShowError(false);
    } else {
      setErrorMessage("No valid data found in pasted content.");
      setShowError(true);
    }
  }, []);

  const handleBulkFile = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>, 
    editableFields: CertificateField[]
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseExcelFile(file, editableFields);
      
      if (result.error) {
        setErrorMessage(result.error);
        setShowError(true);
      } else if (result.rows.length > 0) {
        setBulkRows(result.rows);
        setErrorMessage(null);
        setShowError(false);
      } else {
        setErrorMessage("No valid data found in uploaded file.");
        setShowError(true);
      }
    } catch (error) {
      setErrorMessage(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowError(true);
    }
    
    e.target.value = '';
  }, []);

  const handleBulkExportPDF = useCallback(async (
    selectedTemplateObj: CertificateTemplate,
    editableFields: CertificateField[],
    previewRef: React.RefObject<{ exportToPDF: (filename?: string, returnBlob?: boolean) => Promise<Blob | void> } | null>
  ) => {
    if (!selectedTemplateObj) return;

    setExporting(true);
    setExportProgress(0);

    try {
      // Prepare fields list for each row
      const fieldsList = bulkRows.map(row => 
        editableFields.map(f => ({ ...f, value: row[f.id] || '' }))
      );

      // Generate PDFs as ZIP using the modular function
      const zipBlob = await generatePDFsAsZip(
        selectedTemplateObj,
        fieldsList,
        'certificate'
      );
      
      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'certificates.zip';
      a.click();
      URL.revokeObjectURL(url);
      
      setExporting(false);
      setExportProgress(0);
    } catch (error) {
      console.error('Error generating bulk PDFs:', error);
      setExporting(false);
      setExportProgress(0);
      throw error;
    }
  }, [bulkRows]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setShowError(false);
  }, []);

  return {
    bulkOpen,
    setBulkOpen,
    bulkRows,
    setBulkRows,
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
  };
};