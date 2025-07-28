import { v4 as uuidv4 } from 'uuid';
import { CertificateField, BulkGenerationRow } from '@/types/certificate';
import { 
  sanitizeText, 
  isValidEmail, 
  isValidFileType, 
  isValidFileSize,
  FILE_SIZE_LIMITS,
  apiRateLimiter 
} from './validation';

// Security limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000; // Maximum rows to process
const MAX_COLUMNS = 50; // Maximum columns to process
const MAX_CELL_LENGTH = 500; // Maximum characters per cell

/**
 * Validate header against certificate fields with security checks
 */
export const validateHeader = (
  header: string[], 
  editableFields: CertificateField[]
): { isValid: boolean; missingFields: string[]; extraFields: string[]; error?: string } => {
  try {
    // Security check: limit number of columns
    if (header.length > MAX_COLUMNS) {
      return {
        isValid: false,
        missingFields: [],
        extraFields: [],
        error: `Too many columns. Maximum allowed: ${MAX_COLUMNS}`
      };
    }

    // Sanitize header values
    const sanitizedHeader = header.map(h => sanitizeText(h)).filter(h => h.length > 0);
    
    if (sanitizedHeader.length !== header.length) {
      return {
        isValid: false,
        missingFields: [],
        extraFields: [],
        error: 'Invalid characters found in header'
      };
    }

    const headerSet = new Set(sanitizedHeader);
    const fieldLabels = editableFields.map(f => f.label);
    const fieldSet = new Set(fieldLabels);
    
    // Add recipientEmail as an optional field
    fieldSet.add('Recipient Email');
    
    const missingFields = fieldLabels.filter(label => !headerSet.has(label));
    const extraFields = sanitizedHeader.filter(h => h && !fieldSet.has(h));
    
    return {
      isValid: missingFields.length === 0,
      missingFields,
      extraFields
    };
  } catch (error) {
    return {
      isValid: false,
      missingFields: [],
      extraFields: [],
      error: 'Header validation failed'
    };
  }
};

/**
 * Secure parser that handles both CSV (comma) and Excel (tab) formats
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  // Detect delimiter: if line contains tabs, use tab; otherwise use comma
  const hasTabs = line.includes('\t');
  const delimiter = hasTabs ? '\t' : ',';
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current.trim());
  return result;
};

/**
 * Validate and sanitize row data
 */
const validateRowData = (row: string[]): { valid: boolean; sanitized: string[]; error?: string } => {
  if (row.length > MAX_COLUMNS) {
    return { valid: false, sanitized: [], error: 'Too many columns in row' };
  }
  
  const sanitized = row.map(cell => {
    const sanitizedCell = sanitizeText(cell);
    if (sanitizedCell.length > MAX_CELL_LENGTH) {
      return sanitizedCell.substring(0, MAX_CELL_LENGTH);
    }
    return sanitizedCell;
  });
  
  return { valid: true, sanitized };
};

/**
 * Parse pasted Excel/CSV data from clipboard with security validation
 */
export const parseExcelData = (text: string, editableFields: CertificateField[]): { rows: BulkGenerationRow[]; error?: string } => {
  try {
    // Rate limiting check
    if (!apiRateLimiter.isAllowed('parse-data')) {
      return { rows: [], error: 'Too many requests. Please wait before parsing more data.' };
    }

    // Basic input validation
    if (!text || text.trim().length === 0) {
      return { rows: [], error: 'No data provided.' };
    }
    
    if (text.length > MAX_FILE_SIZE) {
      return { rows: [], error: `Data too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
    }

    // Parse lines with security checks
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return { rows: [], error: 'No data found in pasted content.' };
    }
    
    if (lines.length > MAX_ROWS + 1) { // +1 for header
      return { rows: [], error: `Too many rows. Maximum allowed: ${MAX_ROWS}` };
    }

    // Parse header and data rows
    const headerValidation = validateRowData(parseCSVLine(lines[0]));
    if (!headerValidation.valid) {
      return { rows: [], error: headerValidation.error || 'Invalid header format' };
    }
    
    const header = headerValidation.sanitized;
    const dataLines = lines.slice(1);
    
    // Validate header structure
    const validation = validateHeader(header, editableFields);
    if (!validation.isValid) {
      const requiredFields = editableFields.map(f => f.label).join(', ');
      const errorMsg = validation.error || 
        `Excel/CSV format validation failed.\n\n` +
        `Missing fields: ${validation.missingFields.join(', ')}\n\n` +
        (validation.extraFields.length > 0 ? `Extra fields: ${validation.extraFields.join(', ')}\n\n` : '') +
        `Required fields: ${requiredFields}\n` +
        `Optional field: Recipient Email\n\n` +
        `Please ensure the first row of your Excel/CSV contains these column headers:\n` +
        `${requiredFields}${editableFields.length > 0 ? ',' : ''} Recipient Email (optional)\n\n` +
        `Supported formats:\n` +
        `- Excel format: Tab-separated (copy from Excel)\n` +
        `- CSV format: Comma-separated (CSV files)`;
      return { rows: [], error: errorMsg };
    }
    
    // Create field mapping
    const fieldMap = editableFields.map(f => {
      const idx = header.findIndex(h => h === f.label);
      return { id: f.id, idx };
    });
    
    // Add recipientEmail field mapping
    const recipientEmailIdx = header.findIndex(h => h === 'Recipient Email');
    if (recipientEmailIdx >= 0) {
      fieldMap.push({ id: 'recipientEmail', idx: recipientEmailIdx });
    }
    
    // Process data rows with validation
    const newRows: BulkGenerationRow[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < dataLines.length; i++) {
      const rowValidation = validateRowData(parseCSVLine(dataLines[i]));
      if (!rowValidation.valid) {
        errors.push(`Row ${i + 2}: ${rowValidation.error}`);
        continue;
      }
      
      const cols = rowValidation.sanitized;
      const row: BulkGenerationRow = { id: uuidv4() };
      
      fieldMap.forEach(({ id, idx }) => {
        if (idx >= 0 && idx < cols.length && cols[idx]) {
          // Additional validation for email fields
          if (id === 'recipientEmail') {
            const email = cols[idx].trim();
            if (!isValidEmail(email)) {
              errors.push(`Row ${i + 2}: Invalid email format "${email}"`);
              return;
            }
            row[id] = email;
          } else {
            row[id] = cols[idx];
          }
        }
      });
      
      // Only add row if it has at least one field populated
      if (Object.keys(row).length > 1) { // > 1 because id is always present
        newRows.push(row);
      }
    }
    
    if (errors.length > 0 && newRows.length === 0) {
      return { rows: [], error: `Validation errors: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}` };
    }
    
    if (newRows.length === 0) {
      return { rows: [], error: 'No valid data rows found after validation.' };
    }
    
    return { rows: newRows };
  } catch (error) {
    return { 
      rows: [], 
      error: `Error parsing data: ${error instanceof Error ? 'Invalid format' : 'Unknown error'}` 
    };
  }
};

/**
 * Secure CSV file parser (replaces vulnerable Excel parsing)
 * Only supports CSV files for security reasons
 */
export const parseExcelFile = (
  file: File, 
  editableFields: CertificateField[]
): Promise<{ rows: BulkGenerationRow[]; error?: string }> => {
  return new Promise((resolve) => {
    try {
      // Rate limiting check
      if (!apiRateLimiter.isAllowed('parse-file')) {
        resolve({ rows: [], error: 'Too many file parsing requests. Please wait.' });
        return;
      }

      // Validate file type - only allow CSV files for security
      if (!isValidFileType(file, 'document')) {
        resolve({ rows: [], error: 'Invalid file type. Only CSV files are supported for security reasons.' });
        return;
      }

      // Validate file size
      if (!isValidFileSize(file, 'document')) {
        resolve({ rows: [], error: `File too large. Maximum size: ${FILE_SIZE_LIMITS.document / (1024 * 1024)}MB` });
        return;
      }

      // Additional CSV-specific validation
      if (!file.name.toLowerCase().endsWith('.csv')) {
        resolve({ rows: [], error: 'Only CSV files are supported. Please convert your Excel file to CSV format.' });
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          if (!text) {
            resolve({ rows: [], error: "Failed to read file content." });
            return;
          }

          // Use the same secure parsing logic as parseExcelData
          const result = parseExcelData(text, editableFields);
          resolve(result);
        } catch (error) {
          resolve({ 
            rows: [], 
            error: `Error processing file: ${error instanceof Error ? 'Invalid file format' : 'Unknown error'}` 
          });
        }
      };
      
      reader.onerror = () => resolve({ rows: [], error: "Failed to read file." });
      reader.readAsText(file, 'utf-8'); // Use text reading instead of binary for CSV
    } catch (error) {
      resolve({ 
        rows: [], 
        error: `File processing error: ${error instanceof Error ? 'Invalid file' : 'Unknown error'}` 
      });
    }
  });
};