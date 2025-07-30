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
  Typography,
  FormControlLabel,
  Switch,
  Chip
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import VerifiedIcon from '@mui/icons-material/Verified';
import { CertificateField, BulkGenerationRow, CertificateTemplate } from '@/types/certificate';
import { useAuth } from '@/contexts/AuthContext';
import { useIdentity } from '@/contexts/IdentityContext';
import { useCertificateIssuance, DuplicateCertificate } from '@/hooks/useCertificateIssuance';

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
  templateId?: string;
  selectedTemplate?: CertificateTemplate;
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
  templateId,
  selectedTemplate,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [issueMode, setIssueMode] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateCertificate[]>([]);
  const [issuanceResult, setIssuanceResult] = useState<any>(null);

  const { organization } = useAuth();
  const { currentIdentity } = useIdentity();
  const { issuing, progress, error: issuanceError, issueCertificates, clearError } = useCertificateIssuance();

  const canExport = bulkRows.length > 0 && !exporting && !issuing;
  const isOrganizationIdentity = currentIdentity?.type === 'organization';
  
  // Check if current organization identity is verified
  const isVerifiedOrganization = isOrganizationIdentity && 
    (currentIdentity?.organization?.status === 'approved' || 
     (organization?.id === currentIdentity?.id && organization?.status === 'approved'));

  const handleIssueCertificates = async () => {
    if (!templateId || !selectedTemplate) {
      console.error('Template is required for certificate issuance');
      return;
    }

    if (!isOrganizationIdentity) {
      alert('Certificate issuance is only available for organization identities. Please switch to organization identity.');
      return;
    }

    if (!isVerifiedOrganization) {
      alert('Your organization needs to be verified to issue certificates. Please contact administrators.');
      return;
    }

    try {
      const result = await issueCertificates(templateId, bulkRows, editableFields, selectedTemplate, false);
      
      if (result.success) {
        if (result.duplicates.length > 0) {
          setDuplicates(result.duplicates);
          setShowDuplicateDialog(true);
        } else {
          setIssuanceResult(result);
          // Show success message
          alert(`Successfully issued ${result.issuedCount} certificates. You can check your issued certificates in "Certificates" Page.`);
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error issuing certificates:', error);
      alert('Error issuing certificates. Please try again.');
    }
  };

  const handleUpdateDuplicates = async () => {
    if (!templateId || !selectedTemplate) return;

    if (!isOrganizationIdentity) {
      alert('Certificate issuance is only available for organization identities. Please switch to organization identity.');
      return;
    }

    if (!isVerifiedOrganization) {
      alert('Your organization needs to be verified to issue certificates. Please contact administrators.');
      return;
    }

    try {
      const result = await issueCertificates(templateId, bulkRows, editableFields, selectedTemplate, true);
      
      if (result.success) {
        setIssuanceResult(result);
        setShowDuplicateDialog(false);
        alert(`Successfully issued ${result.issuedCount} new certificates and updated ${result.duplicateCount} existing certificates. You can check your issued certificates in "Certificates" Page.`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating certificates:', error);
      alert('Error updating certificates. Please try again.');
    }
  };

  const handleSkipDuplicates = () => {
    setShowDuplicateDialog(false);
    if (issuanceResult) {
      alert(`Successfully issued ${issuanceResult.issuedCount} certificates. ${issuanceResult.duplicateCount} duplicates were skipped. You can check your issued certificates in "Certificates" Page.`);
    }
  };

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
                <strong>1. Upload CSV File:</strong> Click the button to select a CSV file (Excel files must be saved as CSV for security)
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
{`Name    Date        Certificate ID    Recipient Email
Victor    2024-01-15  CERT001           victor@example.com
Zephyr    2024-01-16  CERT002           zephyr@example.com`}
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Important:</strong> The first row must contain headers that exactly match your certificate field labels: {editableFields.map(f => f.label).join(', ')}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Optional:</strong> You can include "Recipient Email" column for certificate issuance mode. If not provided, you can fill it in manually later.
              </Typography>
            </Alert>
          </Collapse>
        </Box>

        {/* Certificate Issue Mode Toggle */}
        <Box sx={{ 
          mb: 2, 
          p: 2, 
          border: '1px solid #e0e0e0', 
          borderRadius: 1, 
          backgroundColor: isVerifiedOrganization ? '#fafafa' : '#f5f5f5',
          opacity: isVerifiedOrganization ? 1 : 0.7
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {isVerifiedOrganization ? (
              <VerifiedIcon color="success" />
            ) : (
              <VerifiedIcon color="disabled" />
            )}
            <Typography 
              variant="subtitle2" 
              color={isVerifiedOrganization ? "success.main" : "text.disabled"}
            >
              {isVerifiedOrganization ? "Verified Organization" : "Organization Identity Required"}
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={issueMode}
                onChange={(e) => setIssueMode(e.target.checked)}
                color="success"
                disabled={!isVerifiedOrganization}
              />
            }
            label={
              <Box>
                <Typography 
                  variant="body2" 
                  fontWeight="medium"
                  color={isVerifiedOrganization ? "text.primary" : "text.disabled"}
                >
                  Certificate Issue Mode
                </Typography>
                <Typography 
                  variant="caption" 
                  color={isVerifiedOrganization ? "text.secondary" : "text.disabled"}
                >
                  {isVerifiedOrganization 
                    ? "Issue certificates directly to the database instead of generating PDF files. This feature is only available for verified organizations."
                    : !isOrganizationIdentity 
                      ? "Switch to organization identity to issue certificates directly to the database and manage them online."
                      : "Your organization needs to be verified to issue certificates directly to the database."
                  }
                </Typography>
                {!isOrganizationIdentity && (
                  <Typography 
                    variant="caption" 
                    color="primary.main" 
                    sx={{ display: 'block', mt: 0.5, fontWeight: 'medium' }}
                  >
                    💡 Switch to organization identity to unlock this powerful feature!
                  </Typography>
                )}
                {isOrganizationIdentity && organization?.status !== 'approved' && (
                  <Typography 
                    variant="caption" 
                    color="warning.main" 
                    sx={{ display: 'block', mt: 0.5, fontWeight: 'medium' }}
                  >
                    ⚠️ Your organization needs to be verified by administrators.
                  </Typography>
                )}
              </Box>
            }
          />
        </Box>

        {/* Error Messages */}
        <Collapse in={!!errorMessage}>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={clearError}
          >
            <div style={{ whiteSpace: 'pre-line' }}>
              {errorMessage}
            </div>
          </Alert>
        </Collapse>

        <Collapse in={!!issuanceError}>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={clearError}
          >
            {issuanceError}
          </Alert>
        </Collapse>

        <div className="flex gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <Button 
              variant="outlined" 
              onClick={() => bulkFileInputRef.current?.click()}
            >
              Upload CSV File
            </Button>
            <div className="text-xs text-gray-500 max-w-xs">
              For security reasons, only CSV files are supported. 
              Please convert your Excel files to CSV format before uploading.
            </div>
            <input
              type="file"
              accept=".csv,text/csv,application/csv"
              ref={bulkFileInputRef}
              onChange={onBulkFile}
              style={{ display: 'none' }}
            />
          </div>
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
            <Button
              variant="text"
              size="small"
              onClick={() => {
                const helpText = `Excel/CSV Format Requirements:

Required column headers (first row):
${editableFields.map(f => `- ${f.label}`).join('\n')}
- Recipient Email (optional, for certificate issuance)

Supported formats:
1. Excel format (tab-separated):
${editableFields.map(f => f.label).join('\t')}${editableFields.length > 0 ? '\t' : ''}Recipient Email
John Doe\t2024-01-15\tCERT001\tjohn@example.com

2. CSV format (comma-separated):
${editableFields.map(f => f.label).join(',')}${editableFields.length > 0 ? ',' : ''}Recipient Email
John Doe,2024-01-15,CERT001,john@example.com

Notes:
- Column headers must match exactly (case-sensitive)
- First row must be column headers
- Data starts from second row
- Empty rows are automatically ignored
- System automatically detects delimiter type`;
                alert(helpText);
              }}
              sx={{ fontSize: '0.75rem', minWidth: 'auto', p: 0.5 }}
            >
              📋 Format Help
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
              {issueMode && isOrganizationIdentity && (
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="subtitle2"
                      color={isVerifiedOrganization ? "text.primary" : "text.disabled"}
                    >
                      Recipient Email
                    </Typography>
                    <Chip 
                      label="Required" 
                      size="small" 
                      color={isVerifiedOrganization ? "error" : "default"} 
                      variant="outlined" 
                    />
                  </Box>
                </TableCell>
              )}
              {editableFields.map(field => (
                <TableCell key={field.id}>{field.label}</TableCell>
              ))}
              <TableCell>Operation</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bulkRows.map((row, rowIdx) => (
              <TableRow key={row.id}>
                {issueMode && isOrganizationIdentity && (
                  <TableCell>
                    <TextField
                      size="small"
                      type="email"
                      value={row.recipientEmail || ''}
                      onChange={e => onBulkCellChange(rowIdx, 'recipientEmail', e.target.value)}
                      placeholder={isVerifiedOrganization ? "recipient@example.com" : "Organization verification required"}
                      required
                      disabled={!isVerifiedOrganization}
                      error={isVerifiedOrganization && (!row.recipientEmail || row.recipientEmail.trim() === '')}
                      helperText={
                        !isVerifiedOrganization 
                          ? "Organization verification required" 
                          : (!row.recipientEmail || row.recipientEmail.trim() === '') 
                            ? 'Email is required' 
                            : ''
                      }
                    />
                  </TableCell>
                )}
                {editableFields.map(field => (
                  <TableCell key={field.id}>
                    <TextField
                      size="small"
                      value={row[field.id] || ''}
                      onChange={e => onBulkCellChange(rowIdx, field.id, e.target.value)}
                      placeholder={field.label}
                      required={issueMode && isOrganizationIdentity && isVerifiedOrganization}
                      error={issueMode && isOrganizationIdentity && isVerifiedOrganization && (!row[field.id] || row[field.id]?.trim() === '')}
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
        <Button onClick={onClose} disabled={exporting || issuing}>Close</Button>
        {issueMode && isOrganizationIdentity ? (
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleIssueCertificates} 
            disabled={!canExport || !isVerifiedOrganization}
            startIcon={<VerifiedIcon />}
            title={!isVerifiedOrganization ? "Organization verification required to issue certificates" : ""}
          >
            {issuing ? 'Issuing Certificates...' : 'Issue Certificates'}
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={onBulkExportPDF} 
            disabled={!canExport}
          >
            {exporting ? 'Exporting...' : 'Bulk Export PDF (ZIP)'}
          </Button>
        )}
      </DialogActions>
      {(exporting || issuing) && (
        <div className="w-full px-8 pb-4">
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div 
              className={`h-3 rounded-full transition-all ${
                issueMode ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${exporting ? exportProgress : progress}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-600 mt-1">
            {exporting ? exportProgress : progress}%
          </div>
        </div>
      )}

      {/* Duplicate Certificates Dialog */}
      <Dialog open={showDuplicateDialog} onClose={() => setShowDuplicateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Duplicate Certificates Detected
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              We detected that some certificates have already been issued for the same recipients and content. 
              Please choose how to handle these duplicates:
            </Typography>
          </Alert>
          
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Duplicate certificates ({duplicates.length}):
          </Typography>
          
          <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
            {duplicates.map((duplicate, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  Recipient: {duplicate.recipientEmail}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Certificate Key: {duplicate.existingCertificateKey}
                </Typography>
              </Box>
            ))}
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            <strong>Update:</strong> Replace existing certificates with new data and regenerate PDFs.<br/>
            <strong>Skip:</strong> Keep existing certificates unchanged.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDuplicateDialog(false)}>Cancel</Button>
          <Button onClick={handleSkipDuplicates} variant="outlined">
            Skip Duplicates
          </Button>
          <Button onClick={handleUpdateDuplicates} variant="contained" color="success">
            Update Duplicates
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};