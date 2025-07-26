import { CertificateTemplate, CertificateField, FontFamily } from '@/types/certificate';

// Default template dimensions (matches empty-certificate.png)
export const DEFAULT_TEMPLATE_WIDTH = 569;
export const DEFAULT_TEMPLATE_HEIGHT = 437;

// Preview area constraints
export const MAX_PREVIEW_WIDTH = 600;
export const MAX_PREVIEW_HEIGHT = 500;

// Font configuration
export const FONT_FAMILIES: FontFamily[] = [
  { label: 'Serif', value: 'serif' },
  { label: 'Sans', value: 'sans-serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Cursive', value: 'cursive' },
  { label: 'Fantasy', value: 'fantasy' },
];

// Default templates
export const DEFAULT_TEMPLATES: CertificateTemplate[] = [
  {
    id: "classic-blue",
    name: "Classic Blue",
    description: "A classic blue bordered certificate.",
    thumbnail: "/empty-certificate.png",
  },
];

// Default field configurations for different templates
export const getDefaultFieldsForTemplate = (templateId: string): CertificateField[] => {
  switch (templateId) {
    case 'classic-blue':
      // Classic Blue template (569x437) - Using intuitive relative positioning
      return [
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
        }, // Center, upper-middle
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
        }, // Center, below name
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
        }, // Bottom right corner
      ];
    default:
      // For uploaded templates, use generic relative positioning (assuming typical certificate size)
      return [
        { 
          id: 'name', 
          label: 'Name', 
          value: '', 
          position: { x: 400, y: 250 }, 
          required: true, 
          fontSize: 32, 
          fontFamily: 'serif', 
          color: '#1a237e', 
          showInPreview: true 
        }, // Center, upper-middle
        { 
          id: 'date', 
          label: 'Date', 
          value: '', 
          position: { x: 400, y: 350 }, 
          required: true, 
          fontSize: 20, 
          fontFamily: 'serif', 
          color: '#333333', 
          showInPreview: true 
        }, // Center, below name  
        { 
          id: 'certificateId', 
          label: 'Certificate ID', 
          value: '', 
          position: { x: 650, y: 480 }, 
          required: true, 
          fontSize: 14, 
          fontFamily: 'monospace', 
          color: '#888888', 
          showInPreview: true 
        }, // Bottom right
      ];
  }
};