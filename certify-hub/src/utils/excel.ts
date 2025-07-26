import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { CertificateField, BulkGenerationRow } from '@/types/certificate';

/**
 * Validate header against certificate fields
 */
export const validateHeader = (header: string[], editableFields: CertificateField[]): { isValid: boolean; missingFields: string[]; extraFields: string[] } => {
  const headerSet = new Set(header.map(h => h.trim()));
  const fieldLabels = editableFields.map(f => f.label);
  const fieldSet = new Set(fieldLabels);
  
  const missingFields = fieldLabels.filter(label => !headerSet.has(label));
  const extraFields = header.filter(h => h.trim() && !fieldSet.has(h.trim()));
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    extraFields
  };
};

/**
 * Parse pasted Excel data from clipboard
 */
export const parseExcelData = (text: string, editableFields: CertificateField[]): { rows: BulkGenerationRow[]; error?: string } => {
  try {
    const rows = text.split(/\r?\n/).filter(Boolean).map(row => row.split(/\t|,|\s{2,}/));
    if (rows.length === 0) {
      return { rows: [], error: "No data found in pasted content." };
    }
    
    // Assume first row is header, rest are data
    const header = rows[0];
    const dataRows = rows.slice(1);
    
    // Validate header
    const validation = validateHeader(header, editableFields);
    if (!validation.isValid) {
      const errorMsg = `Header validation failed. Missing fields: ${validation.missingFields.join(', ')}. ` +
        (validation.extraFields.length > 0 ? `Extra fields: ${validation.extraFields.join(', ')}. ` : '') +
        `Required fields: ${editableFields.map(f => f.label).join(', ')}.`;
      return { rows: [], error: errorMsg };
    }
    
    // Match field names with header
    const fieldMap = editableFields.map(f => {
      const idx = header.findIndex(h => h.trim() === f.label.trim());
      return { id: f.id, idx };
    });
    
    const newRows = dataRows.map((cols) => {
      const row: BulkGenerationRow = { id: uuidv4() };
      fieldMap.forEach(({ id, idx }) => {
        if (idx >= 0 && cols[idx] !== undefined) {
          row[id] = cols[idx];
        }
      });
      return row;
    });
    
    if (newRows.length === 0) {
      return { rows: [], error: "No valid data rows found after header." };
    }
    
    return { rows: newRows };
  } catch (error) {
    return { rows: [], error: `Error parsing pasted data: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

/**
 * Parse Excel file and extract data
 */
export const parseExcelFile = (
  file: File, 
  editableFields: CertificateField[]
): Promise<{ rows: BulkGenerationRow[]; error?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) {
          resolve({ rows: [], error: "Failed to read file content." });
          return;
        }
        
        const workbook = XLSX.read(data, { type: 'binary' });
        if (workbook.SheetNames.length === 0) {
          resolve({ rows: [], error: "No sheets found in the Excel file." });
          return;
        }
        
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (json.length === 0) {
          resolve({ rows: [], error: "Excel file is empty." });
          return;
        }
        
        const header = json[0] as string[];
        const dataRows = json.slice(1) as unknown[][];
        
        // Validate header
        const validation = validateHeader(header, editableFields);
        if (!validation.isValid) {
          const errorMsg = `Header validation failed. Missing fields: ${validation.missingFields.join(', ')}. ` +
            (validation.extraFields.length > 0 ? `Extra fields: ${validation.extraFields.join(', ')}. ` : '') +
            `Required fields: ${editableFields.map(f => f.label).join(', ')}.`;
          resolve({ rows: [], error: errorMsg });
          return;
        }
        
        const fieldMap = editableFields.map(f => {
          const idx = header.findIndex((h) => String(h).trim() === f.label.trim());
          return { id: f.id, idx };
        });
        
        const newRows = dataRows.map((cols: unknown[]) => {
          const row: BulkGenerationRow = { id: uuidv4() };
          fieldMap.forEach(({ id, idx }) => {
            if (idx >= 0 && cols[idx] !== undefined) {
              row[id] = String(cols[idx]);
            }
          });
          return row;
        });
        
        if (newRows.length === 0) {
          resolve({ rows: [], error: "No valid data rows found after header." });
          return;
        }
        
        resolve({ rows: newRows });
      } catch (error) {
        resolve({ rows: [], error: `Error processing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
    };
    
    reader.onerror = () => resolve({ rows: [], error: "Failed to read file." });
    reader.readAsBinaryString(file);
  });
};