'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import type { Certificate } from '@/types/certificate';

interface EmailNotificationModalProps {
  open: boolean;
  onClose: () => void;
  certificates: Certificate[];
  templateName: string;
  organizationName: string;
  verificationBaseUrl: string;
}

interface EmailResult {
  email: string;
  success: boolean;
  message: string;
}

export default function EmailNotificationModal({
  open,
  onClose,
  certificates,
  templateName,
  organizationName,
  verificationBaseUrl
}: EmailNotificationModalProps) {
  const [selectedCertificates, setSelectedCertificates] = useState<Set<string>>(new Set());
  const [emailResults, setEmailResults] = useState<EmailResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const { sendSingleEmail, sendBulkEmails, isSending, error } = useEmailNotifications();

  // 选择所有证书
  const handleSelectAll = () => {
    if (selectedCertificates.size === certificates.length) {
      setSelectedCertificates(new Set());
    } else {
      setSelectedCertificates(new Set(certificates.map(cert => cert.id)));
    }
  };

  // 选择单个证书
  const handleSelectCertificate = (certificateId: string) => {
    const newSelected = new Set(selectedCertificates);
    if (newSelected.has(certificateId)) {
      newSelected.delete(certificateId);
    } else {
      newSelected.add(certificateId);
    }
    setSelectedCertificates(newSelected);
  };

  // 发送单个邮件
  const handleSendSingleEmail = async (certificate: Certificate) => {
    setEmailResults([]);
    setShowResults(false);

    try {
      const result = await sendSingleEmail(
        certificate,
        templateName,
        organizationName,
        verificationBaseUrl
      );

      setEmailResults([result]);
      setShowResults(true);
    } catch (error) {
      setEmailResults([{
        email: certificate.recipient_email,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email'
      }]);
      setShowResults(true);
    }
  };

  // 发送批量邮件
  const handleSendBulkEmails = async () => {
    if (selectedCertificates.size === 0) return;

    setEmailResults([]);
    setShowResults(false);

    try {
      const selectedCerts = certificates.filter(cert => selectedCertificates.has(cert.id));
      
      const result = await sendBulkEmails(
        selectedCerts,
        templateName,
        organizationName,
        verificationBaseUrl
      );

      setEmailResults(result.results);
      setShowResults(true);
    } catch (error) {
      setEmailResults([{
        email: 'Bulk operation',
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send bulk emails'
      }]);
      setShowResults(true);
    }
  };

  const handleClose = () => {
    setSelectedCertificates(new Set());
    setEmailResults([]);
    setShowResults(false);
    onClose();
  };

  const selectedCount = selectedCertificates.size;
  const totalCount = certificates.length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          <Typography variant="h6">
            Send Certificate Notifications
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {!showResults ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Select certificates to send email notifications to recipients. 
              The email will include certificate details and verification links.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedCertificates.size === certificates.length}
                    indeterminate={selectedCertificates.size > 0 && selectedCertificates.size < certificates.length}
                    onChange={handleSelectAll}
                  />
                }
                label={`Select All (${totalCount} certificates)`}
              />
            </Box>

            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {certificates.map((certificate, index) => (
                <React.Fragment key={certificate.id}>
                  <ListItem>
                    <Checkbox
                      checked={selectedCertificates.has(certificate.id)}
                      onChange={() => handleSelectCertificate(certificate.id)}
                    />
                    <ListItemText
                      primary={certificate.recipient_email}
                      secondary={
                        <>
                          <Typography variant="caption" display="block" component="span">
                            Certificate ID: {certificate.id}
                          </Typography>
                          <Typography variant="caption" display="block" component="span">
                            Status: {certificate.status}
                          </Typography>
                          <Typography variant="caption" display="block" component="span">
                            Issued: {new Date(certificate.issued_at).toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleSendSingleEmail(certificate)}
                        disabled={isSending}
                        title="Send individual email"
                      >
                        <EmailIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < certificates.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            {selectedCount > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {selectedCount} certificate{selectedCount !== 1 ? 's' : ''} selected for bulk email notification.
                </Typography>
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Email Results
            </Typography>
            
            <List>
              {emailResults.map((result, index) => (
                <ListItem key={index}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {result.success ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                    <ListItemText
                      primary={result.email}
                      secondary={result.message}
                    />
                    <Chip
                      label={result.success ? 'Success' : 'Failed'}
                      color={result.success ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </ListItem>
              ))}
            </List>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {emailResults.filter(r => r.success).length} out of {emailResults.length} emails sent successfully.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!showResults ? (
          <>
            <Button onClick={handleClose} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSendBulkEmails}
              variant="contained"
              color="primary"
              disabled={selectedCount === 0 || isSending}
              startIcon={isSending ? <CircularProgress size={16} /> : <EmailIcon />}
            >
              {isSending ? 'Sending...' : `Send ${selectedCount} Email${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
} 