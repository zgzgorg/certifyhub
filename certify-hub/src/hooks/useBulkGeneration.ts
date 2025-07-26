import React, { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { BulkGenerationRow, CertificateField, CertificateTemplate } from '@/types/certificate';
import { parseExcelData, parseExcelFile } from '@/utils/excel';
import CertificatePreview from '@/components/CertificatePreview';

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
    const zip = new JSZip();

    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      const rowFields = editableFields.map(f => ({ ...f, value: row[f.id] || '' }));
      
      // Create temporary container for rendering
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      
      const ReactDOMClient = await import('react-dom/client');
      const root = ReactDOMClient.createRoot(container);
      
      await new Promise(resolve => {
        root.render(
          React.createElement(CertificatePreview, {
            ref: previewRef,
            template: selectedTemplateObj,
            fields: rowFields,
            onFieldPositionChange: () => {},
            maxWidth: 600,
            maxHeight: 500
          })
        );
        setTimeout(resolve, 300);
      });

      // Export PDF as blob
      let pdfBlob: Blob | null = null;
      if (previewRef.current?.exportToPDF) {
        const result = await previewRef.current.exportToPDF(`certificate_${i + 1}.pdf`, true);
        pdfBlob = result instanceof Blob ? result : null;
      }

      root.unmount();
      document.body.removeChild(container);

      if (pdfBlob) {
        zip.file(`certificate_${i + 1}.pdf`, pdfBlob);
      }

      setExportProgress(Math.round(((i + 1) / bulkRows.length) * 100));
    }

    // Generate zip and trigger download
    const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      setExportProgress(Math.round(metadata.percent));
    });
    
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'certificates.zip';
    a.click();
    URL.revokeObjectURL(url);
    
    setExporting(false);
    setExportProgress(0);
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