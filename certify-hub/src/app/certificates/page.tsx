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
  MenuItem
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
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

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.recipient_email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const { error } = await supabase
        .from('certificates')
        .update({
          recipient_email: editFormData.recipient_email,
          status: editFormData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCertificate.id);

      if (error) throw error;

      // 重新加载证书列表
      await loadCertificates();
      await loadTemplatesWithCounts();
      
      setIsEditDialogOpen(false);
      setEditingCertificate(null);
    } catch (err) {
      console.error('Error updating certificate:', err);
      setError('Failed to update certificate');
    } finally {
      setIsSaving(false);
    }
  };

  // 从URL中提取文件路径的辅助函数
  const extractFilePathFromUrl = (url: string): { bucket: string; filePath: string } | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part !== '');
      
      // 支持多种Supabase Storage URL格式
      // 格式1: /storage/v1/object/public/bucket/filepath
      // 格式2: /storage/v1/object/authenticated/bucket/filepath
      const objectIndex = pathParts.findIndex(part => part === 'object');
      
      if (objectIndex !== -1 && objectIndex + 3 < pathParts.length) {
        const bucket = pathParts[objectIndex + 2];
        const filePath = pathParts.slice(objectIndex + 3).join('/');
        
        if (bucket && filePath) {
          return { bucket, filePath };
        }
      }
      
      console.warn('Unable to parse storage URL format:', url);
      return null;
    } catch (error) {
      console.error('Error extracting file path from URL:', error);
      return null;
    }
  };

  const handleConfirmDelete = async () => {
    if (!certificateToDelete) return;

    try {
      setIsDeleting(true);
      setError(null);

      // 首先删除PDF文件（如果存在）
      if (certificateToDelete.pdf_url) {
        console.log('Attempting to delete PDF file:', certificateToDelete.pdf_url);
        
        const fileInfo = extractFilePathFromUrl(certificateToDelete.pdf_url);
        console.log('Extracted file info:', fileInfo);
        
        if (fileInfo) {
          const { bucket, filePath } = fileInfo;
          console.log(`Deleting from bucket: ${bucket}, file path: ${filePath}`);
          
          const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

          if (storageError) {
            console.warn('Failed to delete PDF file from storage:', storageError);
            // 继续删除数据库记录，即使文件删除失败
          } else {
            console.log('Successfully deleted PDF file from storage');
          }
        } else {
          console.warn('Could not extract file info from URL:', certificateToDelete.pdf_url);
        }
      } else {
        console.log('No PDF URL found for certificate');
      }



      // 删除数据库记录
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certificateToDelete.id);

      if (error) throw error;

      // 重新加载证书列表
      await loadCertificates();
      await loadTemplatesWithCounts();
      
      setIsDeleteDialogOpen(false);
      setCertificateToDelete(null);
    } catch (err) {
      console.error('Error deleting certificate:', err);
      setError('Failed to delete certificate');
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
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

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