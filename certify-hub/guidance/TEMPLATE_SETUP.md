# Template Management Setup Guide

This guide explains how to set up the template management functionality in CertifyHub.

## Database Setup

1. **Run the updated database schema** in your Supabase SQL Editor:
   ```sql
   -- Run the contents of database-schema.sql
   ```

2. **Set up Supabase Storage** by running the storage setup script:
   ```sql
   -- Run the contents of setup-storage.sql
   ```

## Features

### Template Upload
- Users can upload certificate templates in various formats:
  - Images: JPEG, PNG, GIF
  - Documents: PDF, DOC, DOCX
- Maximum file size: 10MB
- Templates can be marked as public or private
- Each template gets a unique share URL

### Template Management
- View all uploaded templates at `/certificate/templates`
- Delete templates (removes both file and database record)
- Copy share URLs for public templates
- Preview templates directly in the browser

### Template Sharing
- Public templates can be shared via unique URLs
- Share URLs follow the pattern: `/template/[unique-id]`
- Anyone with the URL can view public templates
- Private templates are only visible to the owner

## File Structure

```
src/
├── app/
│   ├── certificate/
│   │   └── templates/
│   │       └── page.tsx          # Template management page
│   └── template/
│       └── [id]/
│           └── page.tsx          # Template preview page
├── components/
│   ├── TemplateUploadModal.tsx   # Upload modal component
│   └── TemplateCard.tsx          # Template card component
└── types/
    └── template.ts               # Template type definitions
```

## Database Schema

The `templates` table includes:
- `id`: Unique identifier
- `name`: Template name
- `description`: Optional description
- `file_url`: Supabase Storage URL
- `file_name`: Original filename
- `file_size`: File size in bytes
- `file_type`: MIME type
- `is_public`: Public/private flag
- `user_id`: Owner's user ID
- `share_url`: Unique share URL
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Storage Configuration

The `templates` bucket is configured with:
- Public access for viewing
- 10MB file size limit
- Allowed file types: images and documents
- Row-level security policies

## Usage

1. **Upload a template**:
   - Navigate to `/certificate/templates`
   - Click "Upload Template"
   - Fill in name, description, and select file
   - Choose public or private visibility
   - Click "Upload Template"

2. **Manage templates**:
   - View all templates in a grid layout
   - Click "View Template" to see the full file
   - Click "Copy Share URL" to copy the share link
   - Click "Delete Template" to remove

3. **Share templates**:
   - Public templates can be shared via their share URL
   - Share URLs are accessible to anyone
   - Private templates are only visible to the owner

## Security

- File uploads are validated for type and size
- Row-level security ensures users can only access their own templates
- Public templates are accessible to everyone
- Private templates are restricted to owners only 