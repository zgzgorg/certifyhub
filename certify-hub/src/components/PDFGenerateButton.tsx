'use client';

import React, { useState } from 'react';
import { CertificateField, CertificatePreviewRef } from '@/types/certificate';

interface PDFGenerateButtonProps {
  previewRef: React.RefObject<CertificatePreviewRef | null>;
  fields: CertificateField[];
  filename?: string;
  variant?: 'primary' | 'secondary' | 'sample';
  className?: string;
  children?: React.ReactNode;
  onFieldsUpdate?: (fields: CertificateField[]) => void;
  disabled?: boolean;
}

export const PDFGenerateButton: React.FC<PDFGenerateButtonProps> = ({
  previewRef,
  fields,
  filename = 'certificate.pdf',
  variant = 'primary',
  className = '',
  children,
  onFieldsUpdate,
  disabled = false
}) => {
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Generate sample data based on field label
  const generateSampleValue = (field: CertificateField): string => {
    if (field.value.trim()) return field.value;
    
    const label = field.label.toLowerCase();
    if (label.includes('name') || label.includes('recipient')) {
      return 'John Doe';
    } else if (label.includes('date')) {
      return new Date().toLocaleDateString();
    } else if (label.includes('course') || label.includes('title')) {
      return 'Sample Course Title';
    } else if (label.includes('id') || label.includes('certificate')) {
      return 'CERT-2024-001';
    } else if (label.includes('instructor') || label.includes('teacher')) {
      return 'Dr. Jane Smith';
    } else if (label.includes('organization') || label.includes('company')) {
      return 'Sample Organization';
    } else {
      return `Sample ${field.label}`;
    }
  };

  // Generate PDF with optional sample data
  const handleGeneratePDF = async () => {
    if (!previewRef.current) {
      alert('Preview not ready. Please wait for the template to load.');
      return;
    }

    setGeneratingPDF(true);
    try {
      let fieldsToUse = fields;
      let shouldRestoreFields = false;

      // If this is a sample generation, fill empty fields with sample data
      if (variant === 'sample') {
        const fieldsWithSampleData = fields.map(field => ({
          ...field,
          value: generateSampleValue(field)
        }));
        
        fieldsToUse = fieldsWithSampleData;
        shouldRestoreFields = true;
        
        // Update fields temporarily for sample generation
        if (onFieldsUpdate) {
          onFieldsUpdate(fieldsWithSampleData);
        }
      }

      // Wait a bit for the preview to update if fields changed
      if (shouldRestoreFields) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Generate PDF
      await previewRef.current.exportToPDF(filename);

      // Restore original fields if we temporarily updated them
      if (shouldRestoreFields && onFieldsUpdate) {
        onFieldsUpdate(fields);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Get button styles based on variant
  const getButtonStyles = () => {
    const baseStyles = 'px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-indigo-500 text-white hover:bg-indigo-600 shadow`;
      case 'secondary':
        return `${baseStyles} bg-green-600 text-white hover:bg-green-700 shadow`;
      case 'sample':
        return `${baseStyles} bg-green-600 text-white hover:bg-green-700 shadow`;
      default:
        return `${baseStyles} bg-indigo-500 text-white hover:bg-indigo-600 shadow`;
    }
  };

  // Get button content
  const getButtonContent = () => {
    if (generatingPDF) {
      return (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Generating...
        </>
      );
    }

    if (children) {
      return children;
    }

    switch (variant) {
      case 'sample':
        return (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Sample PDF
          </>
        );
      default:
        return 'Generate Certificate';
    }
  };

  return (
    <button
      onClick={handleGeneratePDF}
      disabled={generatingPDF || disabled || !previewRef.current}
      className={`${getButtonStyles()} ${className}`}
    >
      {getButtonContent()}
    </button>
  );
}; 