export type Template = {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  preview_url?: string;
  share_url?: string;
};

export type TemplateUploadData = {
  name: string;
  description?: string;
  is_public: boolean;
  file: File;
};

export type TemplateMetadata = {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  user_id: string;
  metadata: TemplateFieldMetadata[];
  created_at: string;
  updated_at: string;
};

export type TemplateFieldMetadata = {
  id: string;
  label: string;
  position: { x: number; y: number };
  required: boolean;
  showInPreview: boolean;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
};

export type TemplateMetadataCreateData = {
  template_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  metadata: TemplateFieldMetadata[];
};

export type TemplateMetadataUpdateData = {
  name?: string;
  description?: string;
  is_default?: boolean;
  metadata?: TemplateFieldMetadata[];
}; 