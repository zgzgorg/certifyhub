import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { BulkGenerationRow, CertificateField, CertificateTemplate } from '@/types/certificate';
import React from 'react';
import CertificatePreview from '@/components/CertificatePreview';
import { generateCertificatePDF as generatePDF } from '@/utils/pdfGenerator';

export interface CertificateIssuanceData {
  templateId: string;
  publisherId: string;
  recipientEmail: string;
  metadataValues: Record<string, any>;
  template: CertificateTemplate;
  fields: CertificateField[];
}

export interface DuplicateCertificate {
  recipientEmail: string;
  metadataValues: Record<string, any>;
  existingCertificateKey: string;
}

export interface IssuanceResult {
  success: boolean;
  issuedCount: number;
  duplicateCount: number;
  duplicates: DuplicateCertificate[];
  error?: string;
}

export const useCertificateIssuance = () => {
  const { organization } = useAuth();
  const [issuing, setIssuing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateContentHash = async (templateId: string, publisherId: string, recipientEmail: string, metadataValues: Record<string, any>): Promise<string> => {
    const contentString = `${templateId}|${publisherId}|${recipientEmail}|${JSON.stringify(metadataValues)}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const generateCertificateKey = async (contentHash: string, issuedAt: string): Promise<string> => {
    const contentString = `${contentHash}|${issuedAt}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const generateCertificatePDF = async (
    template: CertificateTemplate,
    fields: CertificateField[],
    certificateKey: string
  ): Promise<Blob> => {
    const result = await generatePDF({
      template,
      fields,
      filename: `certificate_${certificateKey}.pdf`,
      returnBlob: true
    });
    
    if (result.success && result.blob) {
      return result.blob;
    } else {
      throw new Error(result.error || 'Failed to generate PDF');
    }
  };

  const checkDuplicateCertificates = async (certificates: CertificateIssuanceData[]): Promise<DuplicateCertificate[]> => {
    const duplicates: DuplicateCertificate[] = [];

    for (const cert of certificates) {
      const contentHash = await generateContentHash(
        cert.templateId,
        cert.publisherId,
        cert.recipientEmail,
        cert.metadataValues
      );

      const { data: existingCert, error } = await supabase
        .from('certificates')
        .select('certificate_key')
        .eq('content_hash', contentHash)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking duplicate certificate:', error);
        continue;
      }

      if (existingCert) {
        duplicates.push({
          recipientEmail: cert.recipientEmail,
          metadataValues: cert.metadataValues,
          existingCertificateKey: existingCert.certificate_key
        });
      }
    }

    return duplicates;
  };

  const issueCertificate = async (certData: CertificateIssuanceData): Promise<boolean> => {
    try {
      const issuedAt = new Date().toISOString();
      const contentHash = await generateContentHash(
        certData.templateId,
        certData.publisherId,
        certData.recipientEmail,
        certData.metadataValues
      );
      const certificateKey = await generateCertificateKey(contentHash, issuedAt);

      const watermarkData = {
        certificateKey,
        contentHash,
        issuedAt,
        publisherId: certData.publisherId,
        templateId: certData.templateId,
        verificationUrl: `${window.location.origin}/verify/${certificateKey}`
      };

      // Generate PDF
      const pdfBlob = await generateCertificatePDF(
        certData.template,
        certData.fields,
        certificateKey
      );

      // Upload PDF to Supabase Storage
      const fileName = `${certificateKey}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        return false;
      }

      // Get public URL for the uploaded PDF
      const { data: urlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);

      const pdfUrl = urlData.publicUrl;

      // Insert certificate record with PDF URL
      const { error } = await supabase
        .from('certificates')
        .insert({
          template_id: certData.templateId,
          publisher_id: certData.publisherId,
          recipient_email: certData.recipientEmail,
          metadata_values: certData.metadataValues,
          content_hash: contentHash,
          certificate_key: certificateKey,
          watermark_data: watermarkData,
          pdf_url: pdfUrl,
          issued_at: issuedAt,
          status: 'active'
        });

      if (error) {
        console.error('Error issuing certificate:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error issuing certificate:', error);
      return false;
    }
  };

  const updateCertificate = async (certData: CertificateIssuanceData, existingCertificateKey: string): Promise<boolean> => {
    try {
      const issuedAt = new Date().toISOString();
      const contentHash = await generateContentHash(
        certData.templateId,
        certData.publisherId,
        certData.recipientEmail,
        certData.metadataValues
      );
      const certificateKey = await generateCertificateKey(contentHash, issuedAt);

      const watermarkData = {
        certificateKey,
        contentHash,
        issuedAt,
        publisherId: certData.publisherId,
        templateId: certData.templateId,
        verificationUrl: `${window.location.origin}/verify/${certificateKey}`
      };

      // Generate new PDF
      const pdfBlob = await generateCertificatePDF(
        certData.template,
        certData.fields,
        certificateKey
      );

      // Upload new PDF to Supabase Storage (overwrite existing)
      const fileName = `${certificateKey}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading updated PDF:', uploadError);
        return false;
      }

      // Get public URL for the uploaded PDF
      const { data: urlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);

      const pdfUrl = urlData.publicUrl;

      // Update the existing certificate with new PDF URL
      const { error } = await supabase
        .from('certificates')
        .update({
          metadata_values: certData.metadataValues,
          content_hash: contentHash,
          certificate_key: certificateKey,
          watermark_data: watermarkData,
          pdf_url: pdfUrl,
          issued_at: issuedAt,
          updated_at: new Date().toISOString()
        })
        .eq('certificate_key', existingCertificateKey);

      if (error) {
        console.error('Error updating certificate:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating certificate:', error);
      return false;
    }
  };

  const issueCertificates = async (
    templateId: string,
    bulkRows: BulkGenerationRow[],
    editableFields: any[],
    template: CertificateTemplate,
    updateDuplicates: boolean = false
  ): Promise<IssuanceResult> => {
    if (!organization) {
      throw new Error('Organization not found');
    }

    setIssuing(true);
    setProgress(0);
    setError(null);

    try {
      // Validate all fields are filled
      const emptyFields = bulkRows.some(row => {
        return editableFields.some(field => {
          const value = row[field.id];
          return !value || value.trim() === '';
        });
      });

      if (emptyFields) {
        throw new Error('All fields must be filled before issuing certificates');
      }

      // Prepare certificate data
      const certificates: CertificateIssuanceData[] = bulkRows.map(row => ({
        templateId,
        publisherId: organization.id,
        recipientEmail: row.recipientEmail || '',
        metadataValues: editableFields.reduce((acc, field) => {
          acc[field.id] = row[field.id] || '';
          return acc;
        }, {} as Record<string, any>),
        template,
        fields: editableFields.map(field => ({
          ...field,
          value: row[field.id] || ''
        }))
      }));

      // Check for duplicates
      const duplicates = await checkDuplicateCertificates(certificates);
      const nonDuplicateCertificates = certificates.filter(cert => 
        !duplicates.some(dup => 
          dup.recipientEmail === cert.recipientEmail && 
          JSON.stringify(dup.metadataValues) === JSON.stringify(cert.metadataValues)
        )
      );

      let issuedCount = 0;
      let duplicateCount = 0;

      // Issue new certificates
      for (let i = 0; i < nonDuplicateCertificates.length; i++) {
        const success = await issueCertificate(nonDuplicateCertificates[i]);
        if (success) {
          issuedCount++;
        }
        setProgress(((i + 1) / nonDuplicateCertificates.length) * 50);
      }

      // Handle duplicates
      if (duplicates.length > 0) {
        if (updateDuplicates) {
          for (let i = 0; i < duplicates.length; i++) {
            const duplicate = duplicates[i];
            const certData = certificates.find(cert => 
              cert.recipientEmail === duplicate.recipientEmail &&
              JSON.stringify(cert.metadataValues) === JSON.stringify(duplicate.metadataValues)
            );

            if (certData) {
              const success = await updateCertificate(certData, duplicate.existingCertificateKey);
              if (success) {
                duplicateCount++;
              }
            }
            setProgress(50 + ((i + 1) / duplicates.length) * 50);
          }
        } else {
          duplicateCount = duplicates.length;
        }
      }

      setProgress(100);

      return {
        success: true,
        issuedCount,
        duplicateCount,
        duplicates
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        issuedCount: 0,
        duplicateCount: 0,
        duplicates: [],
        error: errorMessage
      };
    } finally {
      setIssuing(false);
    }
  };

  return {
    issuing,
    progress,
    error,
    issueCertificates,
    clearError: () => setError(null)
  };
}; 