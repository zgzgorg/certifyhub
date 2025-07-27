import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { BulkGenerationRow, CertificateField, CertificateTemplate } from '@/types/certificate';
import React from 'react';
import CertificatePreview from '@/components/CertificatePreview';

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
    // Preload the template image to ensure it's ready
    const preloadImage = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = template.thumbnail;
    });
    
    try {
      await preloadImage;
      console.log('Template image preloaded successfully');
    } catch (error) {
      console.error('Failed to preload template image:', error);
      throw new Error('Failed to load template image');
    }
    
    // Get image dimensions
    const img = new Image();
    img.src = template.thumbnail;
    await new Promise((resolve) => {
      img.onload = () => resolve(img);
    });
    
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    
    // Create clean certificate element directly (similar to CertificatePreview's createCleanCertificateElement)
    const cleanDiv = document.createElement('div');
    cleanDiv.style.position = 'relative';
    cleanDiv.style.width = `${imgWidth}px`;
    cleanDiv.style.height = `${imgHeight}px`;
    cleanDiv.style.background = 'white';
    
    // Add template image
    const templateImg = document.createElement('img');
    templateImg.src = template.thumbnail;
    templateImg.style.position = 'absolute';
    templateImg.style.top = '0';
    templateImg.style.left = '0';
    templateImg.style.width = '100%';
    templateImg.style.height = '100%';
    templateImg.style.objectFit = 'cover';
    cleanDiv.appendChild(templateImg);
    
    // Add fields that should show in preview
    fields.filter(field => field.showInPreview && field.value).forEach(field => {
      const fieldDiv = document.createElement('div');
      fieldDiv.style.position = 'absolute';
      
      // Calculate text dimensions
      const fontSize = field.fontSize || 16;
      const fontFamily = field.fontFamily || 'serif';
      
      // Simple text dimension calculation (you can improve this if needed)
      const textWidth = field.value.length * fontSize * 0.6; // Approximate width
      const textHeight = fontSize * 1.2; // Approximate height
      
      // field.position stores the anchor point position (in original coordinates)
      const anchorX = field.position.x;
      const anchorY = field.position.y;
      const textAlign = field.textAlign || 'center';
      
      // Calculate actual render position based on anchor point and text alignment
      let renderX = anchorX;
      if (textAlign === 'center') {
        renderX = anchorX - textWidth / 2;
      } else if (textAlign === 'right') {
        renderX = anchorX - textWidth;
      }
      
      // Vertical centering
      const verticalOffset = 0.75;
      const renderY = anchorY - textHeight * verticalOffset;
      
      fieldDiv.style.left = `${renderX}px`;
      fieldDiv.style.top = `${renderY}px`;
      fieldDiv.style.fontSize = `${fontSize}px`;
      fieldDiv.style.fontFamily = fontFamily;
      fieldDiv.style.color = field.color || '#000000';
      fieldDiv.style.fontWeight = '600';
      fieldDiv.style.whiteSpace = 'pre';
      fieldDiv.style.textAlign = textAlign;
      fieldDiv.style.zIndex = '2';
      fieldDiv.textContent = field.value;
      cleanDiv.appendChild(fieldDiv);
    });
    
    // Temporarily add to DOM for rendering (positioned off-screen)
    cleanDiv.style.position = 'fixed';
    cleanDiv.style.left = '-9999px';
    cleanDiv.style.top = '-9999px';
    document.body.appendChild(cleanDiv);
    
    try {
      // Wait for image to load in clean element
      await new Promise((resolve) => {
        const img = cleanDiv.querySelector('img');
        if (img && !img.complete) {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 5000); // Timeout after 5 seconds
        } else {
          resolve(null);
        }
      });
      
      // Import required libraries
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      // Capture the clean certificate
      console.log('Starting html2canvas with dimensions:', imgWidth, 'x', imgHeight);
      const canvas = await html2canvas(cleanDiv, { 
        useCORS: true, 
        backgroundColor: 'white',
        scale: 1,
        width: imgWidth,
        height: imgHeight,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      console.log('PDF generated successfully');
      return pdf.output('blob');
    } finally {
      // Remove temporary element
      document.body.removeChild(cleanDiv);
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