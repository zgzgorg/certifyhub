import { useState, useCallback } from 'react';
import { CertificateTemplate, CertificateField } from '@/types/certificate';
import { DEFAULT_TEMPLATES, getDefaultFieldsForTemplate } from '@/config/certificate';
import { validateTemplateFile, createTemplateFromFile } from '@/utils/template';

export const useCertificateTemplates = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<Record<string, CertificateField[]>>({});

  const selectTemplate = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    // Initialize fields for template if not exists
    if (!templateFields[templateId]) {
      const defaultFields = getDefaultFieldsForTemplate(templateId);
      setTemplateFields(prev => ({ ...prev, [templateId]: defaultFields }));
    }
  }, [templateFields]);

  const uploadTemplate = useCallback((file: File): boolean => {
    if (!validateTemplateFile(file)) {
      return false;
    }

    const newTemplate = createTemplateFromFile(file);
    setTemplates(prev => [...prev, newTemplate]);
    selectTemplate(newTemplate.id);
    return true;
  }, [selectTemplate]);

  const deleteTemplate = useCallback((templateId: string) => {
    if (templateId === 'classic-blue') return; // Cannot delete default template
    
    setTemplates(prev => prev.filter(tpl => tpl.id !== templateId));
    // Clean up stored fields for this template
    setTemplateFields(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [templateId]: removed, ...rest } = prev;
      return rest;
    });
    if (selectedTemplate === templateId) {
      setSelectedTemplate(null);
    }
  }, [selectedTemplate]);

  const getCurrentFields = useCallback((): CertificateField[] => {
    if (!selectedTemplate) return [];
    return templateFields[selectedTemplate] || [];
  }, [selectedTemplate, templateFields]);

  const updateCurrentTemplateFields = useCallback((
    updater: (fields: CertificateField[]) => CertificateField[]
  ) => {
    if (!selectedTemplate) return;
    
    setTemplateFields(prev => ({
      ...prev,
      [selectedTemplate]: updater(prev[selectedTemplate] || getDefaultFieldsForTemplate(selectedTemplate))
    }));
  }, [selectedTemplate]);

  const selectedTemplateObj = selectedTemplate 
    ? templates.find(tpl => tpl.id === selectedTemplate) || null 
    : null;

  return {
    templates,
    selectedTemplate,
    selectedTemplateObj,
    templateFields,
    selectTemplate,
    uploadTemplate,
    deleteTemplate,
    getCurrentFields,
    updateCurrentTemplateFields,
  };
};