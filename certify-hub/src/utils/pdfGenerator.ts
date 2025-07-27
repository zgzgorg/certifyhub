import { CertificateTemplate, CertificateField } from '@/types/certificate';

export interface PDFGenerationOptions {
  template: CertificateTemplate;
  fields: CertificateField[];
  filename?: string;
  maxWidth?: number;
  maxHeight?: number;
  returnBlob?: boolean;
}

export interface PDFGenerationResult {
  blob?: Blob;
  url?: string;
  success: boolean;
  error?: string;
}

/**
 * Calculate text dimensions using the same logic as CertificatePreview
 */
const calculateTextDimensions = (text: string, fontSize: number, fontFamily?: string) => {
  // Create temporary element to measure text dimensions
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.whiteSpace = 'pre';
  tempDiv.style.fontSize = `${fontSize}px`;
  tempDiv.style.fontFamily = fontFamily || 'serif';
  tempDiv.style.fontWeight = '600';
  tempDiv.textContent = text;
  document.body.appendChild(tempDiv);
  
  const width = tempDiv.offsetWidth;
  const height = tempDiv.offsetHeight;
  document.body.removeChild(tempDiv);
  
  return { width, height };
};

/**
 * Preload image and get its dimensions
 */
const preloadImage = async (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Create clean certificate element for PDF generation
 */
const createCleanCertificateElement = (
  template: CertificateTemplate,
  fields: CertificateField[],
  imgWidth: number,
  imgHeight: number
): HTMLDivElement => {
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
    
    const { width: textWidth, height: textHeight } = calculateTextDimensions(
      field.value, 
      fontSize,
      fontFamily
    );
    
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
    
    // Vertical centering - adjusted for PDF rendering
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
  
  return cleanDiv;
};

/**
 * Generate PDF from certificate template and fields
 */
export const generateCertificatePDF = async (options: PDFGenerationOptions): Promise<PDFGenerationResult> => {
  try {
    const { template, fields, filename = 'certificate.pdf', returnBlob = true } = options;
    
    // Preload image and get dimensions
    const { width: imgWidth, height: imgHeight } = await preloadImage(template.thumbnail);
    
    // Create clean certificate element
    const cleanDiv = createCleanCertificateElement(template, fields, imgWidth, imgHeight);
    
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
      
      if (returnBlob) {
        const blob = pdf.output('blob');
        return { blob, success: true };
      } else {
        pdf.save(filename);
        return { success: true };
      }
    } finally {
      // Remove temporary element
      document.body.removeChild(cleanDiv);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Generate multiple PDFs and return as blobs
 */
export const generateMultiplePDFs = async (
  template: CertificateTemplate,
  fieldsList: CertificateField[][],
  filenamePrefix: string = 'certificate'
): Promise<Blob[]> => {
  const pdfBlobs: Blob[] = [];
  
  for (let i = 0; i < fieldsList.length; i++) {
    const fields = fieldsList[i];
    const result = await generateCertificatePDF({
      template,
      fields,
      filename: `${filenamePrefix}_${i + 1}.pdf`,
      returnBlob: true
    });
    
    if (result.success && result.blob) {
      pdfBlobs.push(result.blob);
    } else {
      throw new Error(`Failed to generate PDF ${i + 1}: ${result.error}`);
    }
  }
  
  return pdfBlobs;
};

/**
 * Generate multiple PDFs and create a ZIP file
 */
export const generatePDFsAsZip = async (
  template: CertificateTemplate,
  fieldsList: CertificateField[][],
  filenamePrefix: string = 'certificate'
): Promise<Blob> => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  const pdfBlobs = await generateMultiplePDFs(template, fieldsList, filenamePrefix);
  
  pdfBlobs.forEach((blob, index) => {
    zip.file(`${filenamePrefix}_${index + 1}.pdf`, blob);
  });
  
  return await zip.generateAsync({ type: 'blob' });
}; 