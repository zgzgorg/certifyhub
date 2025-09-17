'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Button,
  IconButton,
  Paper,
  Avatar,
  Dialog,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Fingerprint as FingerprintIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import DateDisplay from '@/components/DateDisplay';
import ClientOnly from '@/components/ClientOnly';
import PDFPreview from '@/components/PDFPreview';
import SocialShare from '@/components/SocialShare';

interface CertificateData {
  id: string;
  template_id: string;
  publisher_id: string;
  recipient_email: string;
  metadata_values: Record<string, any>;
  content_hash: string;
  certificate_key: string;
  watermark_data: Record<string, any>;
  pdf_url?: string;
  issued_at: string;
  expires_at?: string;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
  updated_at: string;
}

interface TemplateData {
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
}

interface OrganizationData {
  id: string;
  name: string;
  email: string;
  description?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

interface ClientComponentProps {
  certificateId: string;
}

export default function CertificateDetailClientComponent({ certificateId }: ClientComponentProps) {
  const router = useRouter();
  const { organization } = useAuth();
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [publisher, setPublisher] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useEffect(() => {
    if (certificateId) {
      loadCertificateDetails();
    }
  }, [certificateId]);

  const loadCertificateDetails = async () => {
    if (!certificateId) return;

    try {
      setLoading(true);
      setError(null);

      // Get certificate details
      const { data: certificateData, error: certificateError } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

      if (certificateError) {
        if (certificateError.code === 'PGRST116') {
          setError('Certificate not found');
        } else {
          throw certificateError;
        }
        return;
      }

      const certificate = certificateData as CertificateData;
      setCertificate(certificate);

      // Get template information
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', certificate.template_id)
        .single();

      if (templateError) {
        console.error('Error loading template:', templateError);
      } else {
        setTemplate(templateData as TemplateData);
      }

      // Get publisher organization information
      const { data: publisherData, error: publisherError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', certificate.publisher_id)
        .single();

      if (publisherError) {
        console.error('Error loading publisher:', publisherError);
      } else {
        setPublisher(publisherData as OrganizationData);
      }

    } catch (error) {
      console.error('Error loading certificate details:', error);
      setError('Failed to load certificate details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (certificate?.pdf_url) {
      window.open(certificate.pdf_url, '_blank');
    }
  };

  const handleViewPublic = () => {
    if (certificate?.certificate_key) {
      window.open(`/verify/${certificate.certificate_key}`, '_blank');
    }
  };

  const handleBack = () => {
    router.push('/certificates');
  };

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
  };

  const generateShareUrl = () => {
    return `${window.location.origin}/verify/${certificate?.certificate_key}`;
  };

  const generateShareTitle = () => {
    if (!certificate || !publisher) return 'Digital Certificate';
    const recipientEmail = certificate.recipient_email;
    const recipientName = certificate.metadata_values?.recipientName || recipientEmail.split('@')[0];
    return `${recipientName} received a digital certificate from ${publisher.name}`;
  };

  const generateShareDescription = () => {
    if (!certificate || !template) return 'View the details of this digital certificate.';
    const templateName = template.name || 'Certificate';
    const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-US');
    return `This certificate was issued on ${issuedDate} using the ${templateName} template. Click to view the complete certificate details and verification information.`;
  };

  const getStatusIcon = () => {
    if (!certificate) return null;

    switch (certificate.status) {
      case 'active':
        return <VerifiedIcon color="success" />;
      case 'revoked':
        return <ErrorIcon color="error" />;
      case 'expired':
        return <WarningIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getStatusColor = () => {
    if (!certificate) return 'error';

    switch (certificate.status) {
      case 'active':
        return 'success';
      case 'revoked':
        return 'error';
      case 'expired':
        return 'warning';
      default:
        return 'error';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Certificate Details
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Loading Certificate Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we fetch the certificate information...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error || !certificate) {
    return (
      <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Certificate Details
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error || 'Certificate not found'}
            </Alert>
            <Button
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
              variant="outlined"
            >
              Back to Certificates
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <ClientOnly fallback={
      <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Certificate Details
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Loading Certificate Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we fetch the certificate information...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    }>
      <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Certificate Details
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={certificate.status}
                color={getStatusColor() as any}
                icon={getStatusIcon() || undefined}
              />
              <Typography variant="body2" color="text.secondary">
                ID: {certificate.id}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
          {/* Left Column - Certificate Information */}
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Certificate Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Recipient */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <EmailIcon color="action" />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Recipient Email
                      </Typography>
                      <Typography variant="body1">
                        {certificate.recipient_email}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Issued Date */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CalendarIcon color="action" />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Issued Date
                      </Typography>
                      <DateDisplay date={certificate.issued_at} />
                    </Box>
                  </Box>

                  {/* Certificate Key */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FingerprintIcon color="action" />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Certificate Key
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                        {certificate.certificate_key}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Publisher Organization */}
                  {publisher && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <BusinessIcon color="action" />
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Issued By
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {publisher.logo_url && (
                            <Avatar src={publisher.logo_url} sx={{ width: 24, height: 24 }} />
                          )}
                          <Typography variant="body1">
                            {publisher.name}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Template Information */}
                  {template && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Template
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {template.file_type?.startsWith('image/') ? (
                          <Avatar
                            src={template.file_url}
                            sx={{ width: 40, height: 40 }}
                            variant="rounded"
                          />
                        ) : (
                          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                            <Typography variant="body2">T</Typography>
                          </Avatar>
                        )}
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {template.name}
                          </Typography>
                          {template.description && (
                            <Typography variant="body2" color="text.secondary">
                              {template.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Certificate Data */}
                  {certificate.metadata_values && Object.keys(certificate.metadata_values).length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Certificate Data
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.entries(certificate.metadata_values).map(([key, value]) => (
                          <Chip
                            key={key}
                            label={`${key}: ${value}`}
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Actions
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {certificate.pdf_url && (
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownloadPDF}
                      fullWidth
                    >
                      Download PDF Certificate
                    </Button>
                  )}

                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={handleViewPublic}
                    fullWidth
                  >
                    View Public Certificate
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<ShareIcon />}
                    onClick={handleOpenShareDialog}
                    fullWidth
                    sx={{
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1976D2 30%, #1CB4D3 90%)',
                      }
                    }}
                  >
                    Share Certificate
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Right Column - PDF Preview */}
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Certificate Preview
                </Typography>
                <Divider sx={{ mb: 3 }} />

                {certificate.pdf_url ? (
                  <PDFPreview
                    pdfUrl={certificate.pdf_url}
                    title="Certificate Preview"
                    height={600}
                    showControls={true}
                  />
                ) : (
                  <Paper
                    sx={{
                      width: '100%',
                      height: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.50'
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No PDF Available
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This certificate does not have an associated PDF file.
                      </Typography>
                    </Box>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Share Dialog */}
        <Dialog
          open={shareDialogOpen}
          onClose={handleCloseShareDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              bgcolor: 'transparent',
              boxShadow: 'none'
            }
          }}
        >
          <DialogContent sx={{ p: 0 }}>
            {certificate && (
              <SocialShare
                url={generateShareUrl()}
                title={generateShareTitle()}
                description={generateShareDescription()}
                imageUrl={template?.file_url}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: 'white', borderRadius: '0 0 16px 16px' }}>
            <Button onClick={handleCloseShareDialog} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ClientOnly>
  );
}