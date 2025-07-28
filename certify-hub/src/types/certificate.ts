export type CertificateTemplate = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
};

export type CertificateField = {
  id: string;
  label: string;
  value: string;
  position: { x: number; y: number }; // Anchor point position (not text corner)
  required: boolean;
  showInPreview?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
};

export type CertificatePreviewRef = {
  getTemplateDimensions: () => {
    width: number;
    height: number;
    scale: number;
    scaledWidth: number;
    scaledHeight: number;
  };
  exportToPDF: (filename?: string, returnBlob?: boolean) => Promise<Blob | void>;
};

export type CertificatePreviewProps = {
  template: CertificateTemplate;
  fields: CertificateField[];
  onFieldPositionChange: (id: string, x: number, y: number) => void;
  maxWidth?: number;
  maxHeight?: number;
};

export type BulkGenerationRow = {
  id: string;
  recipientEmail?: string;
  [key: string]: string | undefined;
};

export type FontFamily = {
  label: string;
  value: string;
};

export interface Certificate {
  id: string;
  template_id: string;
  publisher_id: string;
  recipient_email: string;
  metadata_values: Record<string, any>;
  content_hash: string;
  certificate_key: string;
  watermark_data: Record<string, any>;
  pdf_url?: string;
  issued_at: string;
  expires_at?: string;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
  updated_at: string;
}