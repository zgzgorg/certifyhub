'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip, 
  Button,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface Certificate {
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

export default function CertificatesPage() {
  const { organization } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      loadCertificates();
    }
  }, [organization]);

  const loadCertificates = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('publisher_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCertificates(data || []);
    } catch (err) {
      console.error('Error loading certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCertificate = (certificateKey: string) => {
    window.open(`/verify/${certificateKey}`, '_blank');
  };

  const handleDownloadPDF = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
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
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
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

      {certificates.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No certificates issued yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start by creating certificates in the Certificate Generation page.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
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
                        onClick={() => handleViewCertificate(cert.certificate_key)}
                        title="View Certificate"
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
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Box>
  );
} 