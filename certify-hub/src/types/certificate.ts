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
  position: { x: number; y: number };
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
  [key: string]: string;
};

export type FontFamily = {
  label: string;
  value: string;
};