import { CertificateTemplate } from '@/types/certificate';

/**
 * Validate uploaded template file
 */
export const validateTemplateFile = (file: File): boolean => {
  return /image\/(svg\+xml|png|jpeg)/.test(file.type);
};

/**
 * Create a new template from uploaded file
 */
export const createTemplateFromFile = (file: File): CertificateTemplate => {
  const url = URL.createObjectURL(file);
  const name = file.name.replace(/\.[^/.]+$/, "");
  
  return {
    id: `custom_${Date.now()}`,
    name: name.length > 20 ? name.slice(0, 20) + "..." : name,
    description: "Custom uploaded template.",
    thumbnail: url,
  };
};

/**
 * Get new field position based on template and existing fields count
 */
export const getNewFieldPosition = (templateId: string, fieldsCount: number): { x: number; y: number } => {
  const baseX = templateId === 'classic-blue' ? 285 : 400;
  const baseY = templateId === 'classic-blue' ? 320 : 400;
  
  return {
    x: baseX,
    y: baseY + fieldsCount * 40
  };
};