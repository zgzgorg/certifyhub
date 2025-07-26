import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  IconButton, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  TextField,
  Alert,
  Collapse,
  Box,
  Typography
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import { CertificateField, BulkGenerationRow } from '@/types/certificate';

interface BulkGenerationModalProps {
  open: boolean;
  onClose: () => void;
  editableFields: CertificateField[];
  bulkRows: BulkGenerationRow[];
  exporting: boolean;
  exportProgress: number;
  errorMessage: string | null;
  showError: boolean;
  bulkFileInputRef: React.RefObject<HTMLInputElement | null>;
  onBulkCellChange: (rowIdx: number, fieldId: string, value: string) => void;
  onBulkAddRow: () => void;
  onBulkDeleteRow: (rowIdx: number) => void;
  onBulkPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  onBulkFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBulkExportPDF: () => void;
  onClearError: () => void;
}

export const BulkGenerationModal: React.FC<BulkGenerationModalProps> = ({
  open,
  onClose,
  editableFields,
  bulkRows,
  exporting,
  exportProgress,
  errorMessage,
  showError,
  bulkFileInputRef,
  onBulkCellChange,
  onBulkAddRow,
  onBulkDeleteRow,
  onBulkPaste,
  onBulkFile,
  onBulkExportPDF,
  onClearError,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const canExport = bulkRows.length > 0 && !exporting;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Bulk Generation
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {/* Instructions Section */}
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<InfoIcon />}
            onClick={() => setShowInstructions(!showInstructions)}
            variant="text"
            size="small"
            sx={{ mb: 1 }}
          >
            {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
          </Button>
          <Collapse in={showInstructions}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                <strong>How to use Bulk Generation:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>1. Upload Excel File:</strong> Click the button to select an Excel file (.xlsx, .xls, .csv)
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>2. Paste Excel Data:</strong> Copy data from Excel and paste it into the designated area
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>One example of required Excel Format:</strong>
              </Typography>
              <Box component="pre" sx={{ 
                fontSize: '0.75rem', 
                backgroundColor: '#f5f5f5', 
                p: 1, 
                borderRadius: 1,
                overflow: 'auto'
              }}>
{`Name    Date        Certificate ID
Victor    2024-01-15  CERT001
Zephyr    2024-01-16  CERT002`}
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Important:</strong> The first row must contain headers that exactly match your certificate field labels: {editableFields.map(f => f.label).join(', ')}
              </Typography>
            </Alert>
          </Collapse>
        </Box>

        {/* Error Message */}
        <Collapse in={showError}>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={onClearError}
          >
            {errorMessage}
          </Alert>
        </Collapse>

        <div className="flex gap-4 mb-4">
          <Button 
            variant="outlined" 
            onClick={() => bulkFileInputRef.current?.click()}
          >
            Upload Excel File
          </Button>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={bulkFileInputRef}
            onChange={onBulkFile}
            style={{ display: 'none' }}
          />
          <div className="flex flex-col gap-2">
            <Button
              variant="outlined"
              onClick={() => {
                // Focus the paste area and show instructions
                const pasteArea = document.getElementById('paste-excel-area');
                if (pasteArea) {
                  pasteArea.focus();
                  // Show a temporary instruction
                  const instruction = document.getElementById('paste-instruction');
                  if (instruction) {
                    instruction.style.display = 'block';
                    setTimeout(() => {
                      instruction.style.display = 'none';
                    }, 3000);
                  }
                }
              }}
            >
              Paste Excel Data
            </Button>
            <div
              id="paste-excel-area"
              tabIndex={0}
              className="px-4 py-2 border border-dashed border-gray-400 rounded cursor-pointer text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors relative"
              style={{ minWidth: 200, minHeight: 40 }}
              onPaste={onBulkPaste}
              onFocus={() => {
                const element = document.getElementById('paste-excel-area');
                if (element) {
                  element.style.borderColor = '#4f46e5';
                  element.style.color = '#4f46e5';
                }
              }}
              onBlur={() => {
                const element = document.getElementById('paste-excel-area');
                if (element) {
                  element.style.borderColor = '#9ca3af';
                  element.style.color = '#6b7280';
                }
              }}
              title="Click this area, then paste Excel table data (Ctrl+V)"
            >
              <div className="text-center">
                <div className="text-sm font-medium">Click here to paste Excel data</div>
                <div className="text-xs text-gray-400">or use Ctrl+V shortcut</div>
              </div>
              <div
                id="paste-instruction"
                className="absolute -top-8 left-0 right-0 bg-blue-100 text-blue-800 text-xs p-2 rounded border border-blue-300"
                style={{ display: 'none' }}
              >
                Please copy Excel data first, then paste in this area (Ctrl+V)
              </div>
            </div>
          </div>
        </div>
        <Table>
          <TableHead>
            <TableRow>
              {editableFields.map(field => (
                <TableCell key={field.id}>{field.label}</TableCell>
              ))}
              <TableCell>Operation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bulkRows.map((row, rowIdx) => (
              <TableRow key={row.id}>
                {editableFields.map(field => (
                  <TableCell key={field.id}>
                    <TextField
                      size="small"
                      value={row[field.id] || ''}
                      onChange={e => onBulkCellChange(rowIdx, field.id, e.target.value)}
                      placeholder={field.label}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <IconButton 
                    onClick={() => onBulkDeleteRow(rowIdx)} 
                    disabled={bulkRows.length === 1}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button onClick={onBulkAddRow} sx={{ mt: 2 }}>Add Row</Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>Close</Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={onBulkExportPDF} 
          disabled={!canExport}
        >
          {exporting ? 'Exporting...' : 'Bulk Export PDF (ZIP)'}
        </Button>
      </DialogActions>
      {exporting && (
        <div className="w-full px-8 pb-4">
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all" 
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-600 mt-1">
            {exportProgress}%
          </div>
        </div>
      )}
    </Dialog>
  );
};