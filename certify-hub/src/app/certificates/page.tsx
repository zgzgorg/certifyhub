'use client';

import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Avatar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useCertificates } from '@/hooks/useCertificates';
import { useTemplates } from '@/hooks/useTemplates';
import type { Certificate } from '@/types/certificate';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

export default function CertificatesPage() {
  const { organization } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<Certificate | null>(null);
  const [editFormData, setEditFormData] = useState({
    recipient_email: '',
    status: 'active' as 'active' | 'revoked' | 'expired'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'|'warning'}>({open: false, message: '', severity: 'success'});
  const { sendSingleEmail, sendBulkEmails } = useEmailNotifications();
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);

  // Use custom hooks for data management
  const {
    certificates,
    loading: certificatesLoading,
    error: certificatesError,
    refetch: refetchCertificates,
    updateCertificate,
    deleteCertificate
  } = useCertificates({
    publisherId: organization?.id || '',
    templateId: selectedTemplateId,
    autoFetch: !!organization
  });

  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates
  } = useTemplates({
    publisherId: organization?.id || '',
    autoFetch: !!organization
  });

  // Compute loading and error states
  const loading = useMemo(() => certificatesLoading || templatesLoading, [certificatesLoading, templatesLoading]);
  const error = useMemo(() => certificatesError || templatesError, [certificatesError, templatesError]);

  // Action handlers with optimistic updates

  const handleViewCertificate = (certificateId: string) => {
    window.open(`/certificates/${certificateId}`, '_blank');
  };

  const handleDownloadPDF = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
  };

  const handleEditCertificate = (certificate: Certificate) => {
    setEditingCertificate(certificate);
    setEditFormData({
      recipient_email: certificate.recipient_email,
      status: certificate.status
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteCertificate = (certificate: Certificate) => {
    setCertificateToDelete(certificate);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCertificate) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.recipient_email)) {
      return;
    }

    try {
      setIsSaving(true);

      await updateCertificate(editingCertificate.id, {
        recipient_email: editFormData.recipient_email,
        status: editFormData.status
      });

      // Refresh templates to update counts
      refetchTemplates();
      
      setIsEditDialogOpen(false);
      setEditingCertificate(null);
    } catch (err) {
      console.error('Error updating certificate:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!certificateToDelete) return;

    try {
      setIsDeleting(true);

      await deleteCertificate(certificateToDelete.id);

      // Refresh templates to update counts
      refetchTemplates();
      
      setIsDeleteDialogOpen(false);
      setCertificateToDelete(null);
    } catch (err) {
      console.error('Error deleting certificate:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingCertificate(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setCertificateToDelete(null);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  // 单发邮件逻辑
  const handleSendSingleEmail = async (certificate: Certificate) => {
    const templateName = selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.name || 'Unknown Template' : 'All Templates';
    const organizationName = organization?.name || 'Unknown Organization';
    const verificationBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify` : '';
    const result = await sendSingleEmail(certificate, templateName, organizationName, verificationBaseUrl);
    
    if (result.success) {
      setSnackbar({
        open: true,
        message: `Email sent successfully to ${result.email}`,
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: `Failed to send email to ${result.email}: ${result.message}`,
        severity: 'error'
      });
    }
  };

  // 批量邮件发送逻辑
  const handleBulkEmailSend = async () => {
    if (selectedForBulk.size === 0) return;

    setIsBulkSending(true);
    const selectedCerts = certificates.filter(cert => selectedForBulk.has(cert.id));
    const templateName = selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.name || 'Unknown Template' : 'All Templates';
    const organizationName = organization?.name || 'Unknown Organization';
    const verificationBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify` : '';

    try {
      const result = await sendBulkEmails(selectedCerts, templateName, organizationName, verificationBaseUrl);
      
      if (result.success) {
        // 检查是否有失败的邮件
        const failedEmails = result.results.filter(r => !r.success);
        
        if (failedEmails.length === 0) {
          // 全部成功
          setSnackbar({
            open: true,
            message: `Successfully sent ${result.results.length} emails`,
            severity: 'success'
          });
        } else {
          // 部分失败
          const successCount = result.results.length - failedEmails.length;
          const failedEmailsList = failedEmails.map(r => r.email).join(', ');
          
          setSnackbar({
            open: true,
            message: `Sent ${successCount}/${result.results.length} emails successfully. Failed: ${failedEmailsList}`,
            severity: 'warning'
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: `Failed to send bulk emails: ${result.message}`,
          severity: 'error'
        });
      }

      // 清空选择
      setSelectedForBulk(new Set());
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to send bulk emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsBulkSending(false);
    }
  };

  // 选择所有证书用于批量发送
  const handleSelectAllForBulk = () => {
    if (selectedForBulk.size === certificates.length) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(certificates.map(cert => cert.id)));
    }
  };

  // 选择单个证书用于批量发送
  const handleSelectCertificateForBulk = (certificateId: string) => {
    const newSelected = new Set(selectedForBulk);
    if (newSelected.has(certificateId)) {
      newSelected.delete(certificateId);
    } else {
      newSelected.add(certificateId);
    }
    setSelectedForBulk(newSelected);
  };

  if (!organization) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info">
          Please log in as an organization to view certificates.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <VerifiedIcon color="success" />
        <Typography variant="h4" component="h1">
          My Issued Certificates
        </Typography>
        <Chip 
          label={`${certificates.length} certificates`} 
          color="primary" 
          variant="outlined" 
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Template Filter Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListIcon />
            <Typography variant="h6">Filter by Template</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {/* All Templates Option */}
            <Box>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: selectedTemplateId === null ? 2 : 1,
                  borderColor: selectedTemplateId === null ? 'primary.main' : 'divider',
                  '&:hover': { borderColor: 'primary.main' }
                }}
                onClick={() => handleTemplateSelect(null)}
              >
                <CardContent sx={{ textAlign: 'center', py: 2, px: 3 }}>
                  <Typography variant="h6" color="primary">
                    All Templates
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {certificates.length} certificate{certificates.length !== 1 ? 's' : ''}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Individual Templates */}
            {templates.map((template) => (
              <Box key={template.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    border: selectedTemplateId === template.id ? 2 : 1,
                    borderColor: selectedTemplateId === template.id ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2, px: 3 }}>
                    <Box sx={{ mb: 1 }}>
                      {template.file_type?.startsWith('image/') ? (
                        <Avatar 
                          src={template.file_url} 
                          sx={{ width: 40, height: 40, mx: 'auto' }}
                          variant="rounded"
                        />
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                          {getFileIcon(template.file_type || '')}
                        </Box>
                      )}
                    </Box>
                    <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                      {template.name}
                    </Typography>
                    <Badge badgeContent={template.certificateCount} color="primary">
                      <Typography variant="caption" color="text.secondary">
                        certificate{template.certificateCount !== 1 ? 's' : ''}
                      </Typography>
                    </Badge>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Certificates Table */}
      {certificates.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {selectedTemplateId ? 'No certificates for this template' : 'No certificates issued yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedTemplateId 
                ? 'Start by creating certificates using this template in the Certificate Generation page.'
                : 'Start by creating certificates in the Certificate Generation page.'
              }
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          {/* 批量操作工具栏 */}
          {selectedForBulk.size > 0 && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'primary.light', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography variant="body1">
                {selectedForBulk.size} certificate{selectedForBulk.size !== 1 ? 's' : ''} selected for bulk email
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => setSelectedForBulk(new Set())}
                  disabled={isBulkSending}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="contained"
                  color="inherit"
                  startIcon={isBulkSending ? <CircularProgress size={16} /> : <EmailIcon />}
                  onClick={handleBulkEmailSend}
                  disabled={isBulkSending}
                >
                  {isBulkSending ? 'Sending...' : `Send ${selectedForBulk.size} Email${selectedForBulk.size !== 1 ? 's' : ''}`}
                </Button>
              </Box>
            </Box>
          )}

          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedForBulk.size === certificates.length && certificates.length > 0}
                    indeterminate={selectedForBulk.size > 0 && selectedForBulk.size < certificates.length}
                    onChange={handleSelectAllForBulk}
                    disabled={isBulkSending}
                  />
                </TableCell>
                <TableCell>Recipient Email</TableCell>
                <TableCell>Certificate Key</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Issued Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {certificates.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedForBulk.has(cert.id)}
                      onChange={() => handleSelectCertificateForBulk(cert.id)}
                      disabled={isBulkSending}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {cert.recipient_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace">
                      {cert.certificate_key.substring(0, 16)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={cert.status} 
                      color={
                        cert.status === 'active' ? 'success' : 
                        cert.status === 'revoked' ? 'error' : 'warning'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewCertificate(cert.id)}
                        title="View Certificate Details"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      {cert.pdf_url && (
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadPDF(cert.pdf_url!)}
                          title="Download PDF"
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleEditCertificate(cert)}
                        title="Edit Certificate"
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCertificate(cert)}
                        title="Delete Certificate"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleSendSingleEmail(cert)}
                        title="Send Email Notification"
                        color="primary"
                      >
                        <EmailIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}


      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({...s, open: false}))}>
        <MuiAlert elevation={6} variant="filled" onClose={() => setSnackbar(s => ({...s, open: false}))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      {/* Edit Certificate Dialog */}
      <Dialog open={isEditDialogOpen} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Certificate</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Recipient Email"
              type="email"
              value={editFormData.recipient_email}
              onChange={(e) => setEditFormData(prev => ({ ...prev, recipient_email: e.target.value }))}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editFormData.status}
                onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'revoked' | 'expired' }))}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="revoked">Revoked</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} disabled={isSaving}>Cancel</Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained" 
            color="primary"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : null}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Certificate Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleCancelDelete} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Certificate</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ pt: 2 }}>
            Are you sure you want to delete the certificate for{' '}
            <strong>{certificateToDelete?.recipient_email}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. The certificate and its associated PDF file will be permanently removed from the system.
          </Typography>
          {certificateToDelete?.pdf_url && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                The associated PDF file will also be deleted from storage.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>Cancel</Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete Certificate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 