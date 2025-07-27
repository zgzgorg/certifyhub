'use client';

import React, { useState, useEffect } from 'react';
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
  Badge
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Template } from '@/types/template';

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

interface TemplateWithCount extends Template {
  certificateCount: number;
}

export default function CertificatesPage() {
  const { organization } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<TemplateWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      loadCertificates();
      loadTemplatesWithCounts();
    }
  }, [organization]);

  const loadCertificates = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('certificates')
        .select('*')
        .eq('publisher_id', organization.id)
        .order('created_at', { ascending: false });

      if (selectedTemplateId) {
        query = query.eq('template_id', selectedTemplateId);
      }

      const { data, error } = await query;

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

  const loadTemplatesWithCounts = async () => {
    if (!organization) return;

    try {
      // 首先获取组织使用过的所有模板ID
      const { data: certificatesData, error: certificatesError } = await supabase
        .from('certificates')
        .select('template_id')
        .eq('publisher_id', organization.id);

      if (certificatesError) throw certificatesError;

      // 提取唯一的模板ID
      const uniqueTemplateIds = [...new Set(certificatesData?.map(cert => cert.template_id) || [])];
      
      console.log('Found template IDs used by organization:', uniqueTemplateIds);

      if (uniqueTemplateIds.length === 0) {
        console.log('No templates found for organization');
        setTemplates([]);
        return;
      }

      // 获取这些模板的详细信息
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .in('id', uniqueTemplateIds)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      console.log('Found templates:', templatesData);

      // 获取每个模板的证书数量
      const templatesWithCounts = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { count, error: countError } = await supabase
            .from('certificates')
            .select('*', { count: 'exact', head: true })
            .eq('publisher_id', organization.id)
            .eq('template_id', template.id);

          if (countError) {
            console.error(`Error counting certificates for template ${template.id}:`, countError);
            return { ...template, certificateCount: 0 };
          }

          return { ...template, certificateCount: count || 0 };
        })
      );

      setTemplates(templatesWithCounts);
    } catch (err) {
      console.error('Error loading templates with counts:', err);
    }
  };

  useEffect(() => {
    if (organization) {
      loadCertificates();
    }
  }, [selectedTemplateId, organization]);

  const handleViewCertificate = (certificateKey: string) => {
    window.open(`/verify/${certificateKey}`, '_blank');
  };

  const handleDownloadPDF = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
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