'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Alert, 
  Button, 
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

interface PDFPreviewProps {
  pdfUrl: string;
  title?: string;
  height?: number;
  showControls?: boolean;
}

export default function PDFPreview({ 
  pdfUrl, 
  title = "PDF Preview", 
  height = 600,
  showControls = true 
}: PDFPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Security check for URL
  const isSecureURL = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' || urlObj.hostname === 'localhost';
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!isSecureURL(pdfUrl)) {
      setError('Invalid or insecure PDF URL');
      setLoading(false);
      return;
    }
    
    // Reset state when URL changes
    setLoading(true);
    setError(null);
    setRetryCount(0);
  }, [pdfUrl]);

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to load PDF. The file might be corrupted or unavailable.');
  };

  const handleDownload = () => {
    if (isSecureURL(pdfUrl)) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleOpenExternal = () => {
    if (isSecureURL(pdfUrl)) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setError(null);
  };

  // If URL is not secure, show error
  if (!isSecureURL(pdfUrl)) {
    return (
      <Paper 
        sx={{ 
          width: '100%', 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50'
        }}
      >
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>
            Security Error
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The PDF URL is not secure and cannot be displayed.
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Box>
      {showControls && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Download PDF">
              <IconButton size="small" onClick={handleDownload}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open in new tab">
              <IconButton size="small" onClick={handleOpenExternal}>
                <OpenInNewIcon />
              </IconButton>
            </Tooltip>
            {error && (
              <Tooltip title="Retry loading">
                <IconButton size="small" onClick={handleRetry}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ 
        position: 'relative',
        width: '100%', 
        height, 
        border: '1px solid #e0e0e0',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'grey.50'
      }}>
        {loading && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 2
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Loading PDF...
              </Typography>
            </Box>
          </Box>
        )}

        {error ? (
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 3
          }}>
            <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
              <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" color="error" gutterBottom>
                PDF Preview Unavailable
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {error || "Browser security settings are preventing PDF preview. You can still download or view the PDF directly."}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  size="small"
                >
                  Download PDF
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<OpenInNewIcon />}
                  onClick={handleOpenExternal}
                  size="small"
                >
                  Open in New Tab
                </Button>
              </Box>
            </Box>
          </Box>
        ) : (
          <iframe
            key={`${pdfUrl}-${retryCount}`} // Force reload on retry
            src={pdfUrl}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title={title}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        )}
      </Box>

      {/* Fallback instructions */}
      {error && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            If the PDF won't load, try downloading it directly or opening it in a new tab. 
            Some browsers have built-in PDF viewers that may work better.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}