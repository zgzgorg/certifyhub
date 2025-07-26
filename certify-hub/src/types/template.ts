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