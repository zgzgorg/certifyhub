'use client';

import React, { useState } from 'react';
import { CertificateField, CertificateTemplate } from '@/types/certificate';
import { generateCertificatePDF } from '@/utils/pdfGenerator';

interface ModularPDFGenerateButtonProps {
  template: CertificateTemplate;
  fields: CertificateField[];
  filename?: string;
  variant?: 'primary' | 'secondary' | 'sample';
  className?: string;
  children?: React.ReactNode;
  onFieldsUpdate?: (fields: CertificateField[]) => void;
  disabled?: boolean;
}

export const ModularPDFGenerateButton: React.FC<ModularPDFGenerateButtonProps> = ({
  template,
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

      // Generate PDF using modular function
      const result = await generateCertificatePDF({
        template,
        fields: fieldsToUse,
        filename,
        returnBlob: false
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate PDF');
      }

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
    const baseStyles = 'px-4 py-2 rounded-md font-semibold shadow-lg transition-colors disabled:opacity-50';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-blue-600 text-white hover:bg-blue-700`;
      case 'secondary':
        return `${baseStyles} bg-gray-600 text-white hover:bg-gray-700`;
      case 'sample':
        return `${baseStyles} bg-green-600 text-white hover:bg-green-700`;
      default:
        return `${baseStyles} bg-blue-600 text-white hover:bg-blue-700`;
    }
  };

  // Get button content
  const getButtonContent = () => {
    if (generatingPDF) {
      return 'Generating PDF...';
    }
    
    if (children) {
      return children;
    }
    
    switch (variant) {
      case 'sample':
        return 'Generate Sample';
      default:
        return 'Generate PDF';
    }
  };

  return (
    <button
      onClick={handleGeneratePDF}
      disabled={disabled || generatingPDF}
      className={`${getButtonStyles()} ${className}`}
    >
      {getButtonContent()}
    </button>
  );
}; 