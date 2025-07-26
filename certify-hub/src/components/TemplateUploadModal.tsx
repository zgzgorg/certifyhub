'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface TemplateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export default function TemplateUploadModal({ isOpen, onClose, onUploaded }: TemplateUploadModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: false
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid file type (JPEG, PNG, GIF, PDF, DOC, DOCX)');
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !user) {
      setError('Please select a file and ensure you are logged in');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter a template name');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Generate unique filename
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

      // Upload file to Supabase Storage
      console.log('Starting upload to bucket: templates');
      console.log('File name:', fileName);
      console.log('File size:', selectedFile.size);
      console.log('File type:', selectedFile.type);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(fileName);

      // Save template info to database
      console.log('Saving template to database...');
      console.log('User ID:', user.id);
      console.log('Public URL:', urlData.publicUrl);
      
      const { data: dbData, error: dbError } = await supabase
        .from('templates')
        .insert({
          name: formData.name,
          description: formData.description,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          is_public: formData.is_public,
          user_id: user.id,
          share_url: `${window.location.origin}/template/${Date.now()}-${Math.random().toString(36).substring(2)}`
        })
        .select();

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }
      
      console.log('Database insert successful:', dbData);

      // Reset form
      setFormData({ name: '', description: '', is_public: false });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploaded();
    } catch (error) {
      console.error('Upload error:', error);
      
      // 提供更详细的错误信息
      let errorMessage = 'Failed to upload template. Please try again.';
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = `Upload failed: ${error.message}`;
        } else if ('error' in error) {
          errorMessage = `Upload failed: ${error.error}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Upload Template</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter template name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter template description (optional)"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template File *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: JPEG, PNG, GIF, PDF, DOC, DOCX (max 10MB)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
              Make this template public
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 