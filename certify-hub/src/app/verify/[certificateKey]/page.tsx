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
  Grid,
  Divider
} from '@mui/material';
import { 
  Verified as VerifiedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { supabase } from '@/lib/supabaseClient';

interface CertificateData {
  id: string;
  template_id: string;
  publisher_id: string;
  recipient_email: string;
  metadata_values: Record<string, unknown>;
  content_hash: string;
  certificate_key: string;
  watermark_data: Record<string, unknown>;
  pdf_url?: string;
  issued_at: string;
  expires_at?: string;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
  updated_at: string;
}

interface VerificationResult {
  valid: boolean;
  certificate?: CertificateData;
  error?: string;
  status: 'active' | 'revoked' | 'expired' | 'not_found';
}

export default function VerifyCertificatePage({ 
  params 
}: { 
  params: Promise<{ certificateKey: string }> 
}) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificateKey, setCertificateKey] = useState<string>('');

  useEffect(() => {
    params.then(({ certificateKey }) => {
      setCertificateKey(certificateKey);
    });
  }, [params]);

  useEffect(() => {
    if (certificateKey) {
      verifyCertificate();
    }
  }, [certificateKey]);

  const verifyCertificate = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('certificate_key', certificateKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setResult({
            valid: false,
            status: 'not_found',
            error: 'Certificate not found'
          });
        } else {
          throw error;
        }
        return;
      }

      const certificate = data as CertificateData;
      
      // Check if certificate is expired
      let status: 'active' | 'revoked' | 'expired' = certificate.status;
      if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
        status = 'expired';
      }

      setResult({
        valid: status === 'active',
        certificate,
        status
      });

    } catch (error) {
      console.error('Error verifying certificate:', error);
      setResult({
        valid: false,
        status: 'not_found',
        error: 'Failed to verify certificate'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!result) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">
          Failed to load verification result
        </Alert>
      </Box>
    );
  }

  const getStatusIcon = () => {
    switch (result.status) {
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
    switch (result.status) {
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

  const getStatusText = () => {
    switch (result.status) {
      case 'active':
        return 'Valid Certificate';
      case 'revoked':
        return 'Certificate Revoked';
      case 'expired':
        return 'Certificate Expired';
      default:
        return 'Certificate Not Found';
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            {getStatusIcon()}
            <Typography variant="h4" component="h1">
              Certificate Verification
            </Typography>
          </Box>

          <Alert 
            severity={getStatusColor() as any} 
            sx={{ mb: 3 }}
            icon={getStatusIcon()}
          >
            <Typography variant="h6">
              {getStatusText()}
            </Typography>
            {result.error && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {result.error}
              </Typography>
            )}
          </Alert>

          {result.certificate && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Certificate Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Certificate Key
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {result.certificate.certificate_key}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Recipient Email
                  </Typography>
                  <Typography variant="body2">
                    {result.certificate.recipient_email}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Issued Date
                  </Typography>
                  <Typography variant="body2">
                    {new Date(result.certificate.issued_at).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={result.certificate.status} 
                    color={getStatusColor() as any}
                    size="small"
                  />
                </Box>
              </Box>

              {result.certificate.metadata_values && Object.keys(result.certificate.metadata_values).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Certificate Data
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(result.certificate.metadata_values).map(([key, value]) => (
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

              {result.certificate.pdf_url && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    PDF Certificate
                  </Typography>
                  <a 
                    href={result.certificate.pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1976d2', textDecoration: 'none' }}
                  >
                    View PDF Certificate
                  </a>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
} 